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
        const targetDir = formData.get('targetDir') as string; // Extract targetDir

        const modules = modulesStr ? JSON.parse(modulesStr) : [];
        const deletedModules = deletedModulesStr ? JSON.parse(deletedModulesStr) : [];

        const buffer = file ? Buffer.from(await file.arrayBuffer()) : Buffer.from("");
        const fileName = file ? file.name : "unknown";

        if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
        filePath = path.join(uploadsDir, `${Date.now()}_sync_${fileName}`);
        fs.writeFileSync(filePath, buffer);

        const workFilePath = filePath;

        (async () => {
            sendEvent(taskId, 'start', 'Syncing collection...');
            try {
                const fileContent = fs.readFileSync(workFilePath, 'utf8');
                const jsonContent = JSON.parse(fileContent);
                const isPostman = jsonContent.info && jsonContent.item;

                const env = getEnvWithOverride(targetDir);
                const scriptsDir = path.join(process.cwd(), 'src', 'scripts');

                if (deletedModules.length > 0) {
                    sendEvent(taskId, 'progress', `Deleting ${deletedModules.length} obsolete modules...`);
                    for (const mod of deletedModules) {
                        try {
                            await runCommand(`npx tsx "${path.join(scriptsDir, 'delete-item.ts')}" module "${mod}"`, { env });
                        } catch (e: any) {
                            console.error("Failed to delete module", mod, e);
                            sendEvent(taskId, 'error', `Failed to delete module ${mod}: ${e}`);
                        }
                    }
                }

                sendEvent(taskId, 'progress', 'Generating API definitions in target...');
                const scriptName = isPostman ? "generate-postman-collection.ts" : "generate-openapi-collection.ts";
                let generateCmd = `npx tsx "${path.join(scriptsDir, scriptName)}" "${workFilePath}"`;

                if (modules.length > 0) {
                    generateCmd += ` --only ${modules.join(",")}`;
                }
                if (functionsStr) {
                    const escapedFunctions = functionsStr.replace(/"/g, '\\"');
                    generateCmd += ` --functions "${escapedFunctions}"`;
                }

                await runCommand(generateCmd, { env });

                sendEvent(taskId, 'progress', 'Regenerating type definitions in target...');
                await runCommand('npm run gen:types', { env });

                sendEvent(taskId, 'complete', "Collection synced successfully");
                sendEvent('global', 'project:updated', 'Collection synced');

            } catch (error: any) {
                sendEvent(taskId, 'error', `Sync failed: ${error.toString()}`);
            } finally {
                try { if (fs.existsSync(workFilePath)) fs.unlinkSync(workFilePath); } catch (e) { console.error("Cleanup failed:", e); }
            }
        })();

        return NextResponse.json({ success: true, message: "Sync started", taskId });

    } catch (e: any) {
        if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
        return NextResponse.json({ success: false, error: e.toString() }, { status: 500 });
    }
}
