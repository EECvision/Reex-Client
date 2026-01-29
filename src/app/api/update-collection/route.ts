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

        // 0.5 Helper: Prepare Proposed Clients (Do NOT write here, just return)
        const proposedClientsStr = formData.get('proposedClients') as string;
        const proposedClients = proposedClientsStr ? JSON.parse(proposedClientsStr) : {};

        // 0.6 Helper: Extract Base URL (Do NOT write here, just return)
        const baseUrl = formData.get('baseUrl') as string;
        console.log("[UPDATE-COLLECTION] Received baseUrl:", baseUrl);

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

        // Filter OUT any operations attempting to write to config/clients.ts or config/core.ts
        // (Just in case the generator scripts tried to sneak them in, though currently they don't seem to)
        operations = operations.filter(op =>
            !op.filePath.endsWith('config/clients.ts') &&
            !op.filePath.endsWith('config/core.ts')
        );

        // Clean up file immediately
        try { fs.unlinkSync(filePath); } catch (e) { }
        filePath = null;

        return NextResponse.json({
            success: true,
            operations,
            deletedModules,
            proposedBaseUrl: baseUrl,
            proposedClients
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
