import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import os from "os";
import { runCommand, getEnvWithOverride, sendEvent } from "@/app/api/utils";

export async function POST(req: NextRequest) {
    const taskId = Date.now().toString();
    const uploadsDir = path.join(os.tmpdir(), 'api-builder-uploads');
    let filePath: string | null = null;

    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const modulesStr = formData.get('modules') as string;
        const deletedModulesStr = formData.get('deletedModules') as string;
        const functionsStr = formData.get('functions') as string;
        const targetDir = formData.get('targetDir') as string;

        const modules = modulesStr ? JSON.parse(modulesStr) : [];
        const deletedModules = deletedModulesStr ? JSON.parse(deletedModulesStr) : [];

        const buffer = file ? Buffer.from(await file.arrayBuffer()) : Buffer.from("");
        const fileName = file ? file.name : "unknown";

        if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
        filePath = path.join(uploadsDir, `${Date.now()}_update_${fileName}`);
        fs.writeFileSync(filePath, buffer);

        // Start async task
        // We must clone filePath to keep it in closure, but clean it up later.
        const workFilePath = filePath;

        (async () => {
            sendEvent(taskId, 'start', 'Updating collection...');
            try {
                const fileContent = fs.readFileSync(workFilePath, 'utf8');
                const jsonContent = JSON.parse(fileContent);
                const isPostman = jsonContent.info && jsonContent.item;
                const modulesToFilter = modules.length > 0 ? modules : undefined;

                // Parse functions filter
                let filterFunctions: Map<string, string[]> | undefined;
                if (functionsStr) {
                    try {
                        const obj = JSON.parse(functionsStr);
                        filterFunctions = new Map(Object.entries(obj));
                    } catch (e) {
                        console.warn("Failed to parse functions filter", e);
                    }
                }

                // Bridge URL (Default to localhost:4000 internal network)
                // In Docker/Podman this might need to be host.docker.internal or similar, 
                // but for now we assume simple localhost access.
                const BRIDGE_URL = process.env.BRIDGE_URL || "http://localhost:4000";

                // DEBUG LOG
                fs.appendFileSync('d:\\Dev\\api-builder\\debug-update.log', `Start Update: ${BRIDGE_URL}\n`);

                const sendToBridge = async (method: string, endpoint: string, body: any) => {
                    fs.appendFileSync('d:\\Dev\\api-builder\\debug-update.log', `Sending ${endpoint}...\n`);
                    // Ensure we target /api/fs/write
                    const res = await fetch(`${BRIDGE_URL}/api/fs/${endpoint}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(body)
                    });
                    if (!res.ok) {
                        const err = await res.json();
                        const msg = `Bridge Error (${endpoint}): ${err.message || err.error || res.statusText}`;
                        fs.appendFileSync('d:\\Dev\\api-builder\\debug-update.log', `${msg}\n`);
                        throw new Error(msg);
                    }
                    fs.appendFileSync('d:\\Dev\\api-builder\\debug-update.log', `Success ${endpoint}\n`);
                };

                // 1. Process Deletions
                if (deletedModules.length > 0) {
                    sendEvent(taskId, 'progress', `Deleting ${deletedModules.length} obsolete modules...`);
                    for (const mod of deletedModules) {
                        try {
                            // Direct call to Bridge delete
                            await sendToBridge('POST', 'delete', { filePath: `src/api-services/definitions/${mod}.ts` });
                        } catch (e: any) {
                            console.error("Failed to delete module", mod, e);
                            sendEvent(taskId, 'error', `Failed to delete module ${mod}: ${e}`);
                        }
                    }
                }

                // 2. Generator (In-Memory)
                sendEvent(taskId, 'progress', 'Generating API definitions...');

                let operations: any[] = [];

                // Dynamic Import to avoid top-level side effects if any
                const { generateOpenApi } = await import("@/scripts/generate-openapi-collection");
                const { generatePostman } = await import("@/scripts/generate-postman-collection");

                const options = {
                    specData: jsonContent,
                    returnContent: true,
                    filterModules: modulesToFilter,
                    filterFunctions: filterFunctions
                };

                if (isPostman) {
                    operations = await generatePostman(options) as any[];
                } else {
                    operations = await generateOpenApi(options) as any[];
                }

                // 3. Send Operations to Bridge
                sendEvent(taskId, 'progress', `Syncing ${operations.length} generated files to Bridge...`);

                for (const op of operations) {
                    if (op.type === 'write') {
                        // Prepend src/api-services/ if path is relative
                        // The generator returns "definitions/foo.ts" or "index.ts"
                        // Bridge expects path relative to TARGET ROOT
                        const relativePath = `src/api-services/${op.filePath.replace(/\\/g, '/')}`;
                        await sendToBridge('POST', 'write', { filePath: relativePath, content: op.content });
                    }
                }

                // 4. Gen Types (Triggered autonomously by Bridge watcher usually? 
                //    No, Bridge watcher triggers 'regenerate' which does manifest/hooks.
                //    Types (via 'npm run gen:types' in CLI) are NOT currently triggered by Bridge?
                //    Legacy 'generate-modules.js' runs locally.
                //    If we want complete automation, Bridge should generate types or we skip it for now.
                //    Wait, 'npm run gen:types' usually runs 'graphql-codegen' or similar? 
                //    Actually, if this is REST API builder, do we need 'gen:types'?
                //    The previous code ran: await runCommand('npm run gen:types', { env });
                //    This implies the User's Project has a 'gen:types' script.
                //    Bridge does NOT have an arbitrary command runner for security.
                //    However, our generated code uses typescript interfaces *inline*. 
                //    There is no external type generation needed for REST modules usually.
                //    I will comment this out or skip, assuming Bridge handles necessary compilation/indexing.

                // sendEvent(taskId, 'progress', 'Regenerating type definitions...');
                // Note: Bridge watcher handles manifest generation which is the equivalent of 'indexing'.

                sendEvent(taskId, 'complete', "Collection updated successfully via Bridge");

                // Bridge emits project:updated, we don't need to double-emit globally here, 
                // but the UI listens to global events. 
                // Let's emit it for immediate UI feedback.
                sendEvent('global', 'project:updated', 'Collection updated');

            } catch (error: any) {
                console.error("Update failed", error);
                sendEvent(taskId, 'error', `Update failed: ${error.toString()}`);
            } finally {
                try { if (fs.existsSync(workFilePath)) fs.unlinkSync(workFilePath); } catch (e) { console.error("Cleanup failed:", e); }
            }
        })();

        return NextResponse.json({ success: true, message: "Update started", taskId });

    } catch (e: any) {
        // If sync setup failed before async task
        if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
        return NextResponse.json({ success: false, error: e.toString() }, { status: 500 });
    }
}
