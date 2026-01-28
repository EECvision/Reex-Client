import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import os from "os";
import { sendEvent, getBridgeUrl } from "@/app/api/utils";

// Direct import of generators (same as analyze)
import { generateOpenApi } from "@/scripts/generate-openapi-collection";
import { generatePostman } from "@/scripts/generate-postman-collection";

export async function POST(req: NextRequest) {
    let filePath: string | null = null;
    const uploadsDir = path.join(os.tmpdir(), 'api-builder-uploads');

    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const modulesStr = formData.get('modules') as string;
        const deletedModulesStr = formData.get('deletedModules') as string;
        const functionsStr = formData.get('functions') as string;
        const forceOverwriteStr = formData.get('forceOverwrite') as string;
        const existingModulesStr = formData.get('existingModules') as string;
        const returnOperations = formData.get('returnOperations') === 'true'; // New flag

        // Parse inputs
        const modules = modulesStr ? JSON.parse(modulesStr) : [];
        const deletedModules = deletedModulesStr ? JSON.parse(deletedModulesStr) : [];
        const forceOverwrite = forceOverwriteStr ? JSON.parse(forceOverwriteStr) : [];

        // Parse Existing Modules Map
        let existingFilesMap: Map<string, string> | undefined;
        if (existingModulesStr) {
            try {
                const obj = JSON.parse(existingModulesStr);
                existingFilesMap = new Map(Object.entries(obj));
            } catch (e) {
                console.warn("Failed to parse existingModules map", e);
            }
        }

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

        // Handle File
        const buffer = file ? Buffer.from(await file.arrayBuffer()) : Buffer.from("");
        const fileName = file ? file.name : "unknown";

        if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
        filePath = path.join(uploadsDir, `${Date.now()}_update_${fileName}`);
        fs.writeFileSync(filePath, buffer);

        // Read & Parse Content
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const jsonContent = JSON.parse(fileContent);
        const isPostman = jsonContent.info && jsonContent.item;

        const options = {
            specData: jsonContent,
            returnContent: true,
            filterModules: modules.length > 0 ? modules : undefined,
            filterFunctions: filterFunctions,
            forceOverwrite: forceOverwrite,
            existingFiles: existingFilesMap
        };

        // Generate Operations (Synchronous wait)
        let operations: any[] = [];

        // 0. Prepend Deletions (if any)
        // 0. Prepend Deletions (if any)
        if (deletedModules.length > 0) {
            for (const mod of deletedModules) {
                operations.push({ type: 'delete', filePath: `src/api-services/definitions/${mod}.ts` });
                // Also try to delete generated types/files if known, similar to sync-collection
                operations.push({ type: 'delete', filePath: `src/api-services/types/${mod}` });
                operations.push({ type: 'delete', filePath: `src/api-services/generated/${mod}.ts` });
            }
        }

        // 0.5 Update Config with Proposed Clients
        const proposedClientsStr = formData.get('proposedClients') as string;
        const proposedClients = proposedClientsStr ? JSON.parse(proposedClientsStr) : {};
        const targetDir = formData.get('targetDir') as string;

        if (targetDir && Object.keys(proposedClients).length > 0) {
            try {
                // We attempt to read the local file. If this is running in a container without access, this will fail.
                // Assuming local dev setup where api-next-server has access to targetDir.
                const configPath = path.join(targetDir, 'src', 'api-services', 'config', 'index.ts');
                let configContent = "";

                if (fs.existsSync(configPath)) {
                    configContent = fs.readFileSync(configPath, 'utf8');
                } else {
                    // Scaffold if missing
                    configContent = `/* eslint-disable @typescript-eslint/no-explicit-any */\nimport { createClient } from "./utils";\n\nexport const BASE_CLIENT = createClient();\n`;
                }

                let modified = false;

                Object.entries(proposedClients).forEach(([name, clientPath]) => {
                    // Check if already exported
                    // Robust check: strict export const NAME =
                    if (!configContent.match(new RegExp(`export\\s+const\\s+${name}\\s+=`))) {
                        // Simple append
                        if (!configContent.endsWith('\n')) configContent += '\n';
                        configContent += `export const ${name} = createClient("${clientPath as string}");\n`;
                        modified = true;
                    }
                });

                if (modified || !fs.existsSync(configPath)) {
                    operations.push({
                        type: 'write',
                        filePath: 'src/api-services/config/index.ts',
                        content: configContent
                    });
                }
            } catch (e) {
                console.warn("Failed to update config/index.ts with proposed clients", e);
            }
        }

        if (isPostman) {
            const genOps = await generatePostman(options) as any[];
            operations = [...operations, ...genOps];
        } else {
            const genOps = await generateOpenApi(options) as any[];
            operations = [...operations, ...genOps];
        }

        // Post-process operations to ensure correct paths
        operations = operations.map(op => {
            if (op.type === 'write' && !op.filePath.startsWith('src/api-services')) {
                return { ...op, filePath: `src/api-services/${op.filePath}` };
            }
            return op;
        });

        // Clean up file immediately
        try { fs.unlinkSync(filePath); } catch (e) { }
        filePath = null;

        // If client requested operations (Cloud Mode), return them!
        if (returnOperations) {
            return NextResponse.json({
                success: true,
                operations, // Now includes deletions
                deletedModules // Kept for legacy compatibility if needed
            });
        }

        // Legacy / Local Mode (Server Writes) - Kept for backward compat if needed, 
        // but ideally we switch fully. For now, let's allow it if returnOperations is missing.
        // ... (Existing logic omitted for brevity, but effective replacement handles cleanup)

        // Actually, let's enforce returnOperations for consistency if we update the client.
        // But to be safe, if not requested, just return them anyway or error?
        // Let's just return them. The client can ignore if it doesn't know what to do (but it will).

        return NextResponse.json({
            success: true,
            operations,
            deletedModules
        });

    } catch (error: any) {
        console.error("Update failed", error);
        return NextResponse.json({ success: false, error: error.toString() }, { status: 500 });
    } finally {
        if (filePath && fs.existsSync(filePath)) {
            try { fs.unlinkSync(filePath); } catch (e) { }
        }
    }
}
