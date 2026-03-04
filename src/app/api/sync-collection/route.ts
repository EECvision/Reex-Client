import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import os from "os";
import { runCommand, getEnvWithOverride, sendEvent, decompressFilePayload } from "@/app/api/utils";

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

        const fileBuffer = file ? Buffer.from(await file.arrayBuffer()) : Buffer.from("");
        const fileName = file ? file.name : "unknown";

        const contentBuffer = decompressFilePayload(fileName, fileBuffer);

        if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
        filePath = path.join(uploadsDir, `${Date.now()}_sync_${fileName}`);
        fs.writeFileSync(filePath, contentBuffer);

        // Read & Parse Content
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const jsonContent = JSON.parse(fileContent);
        const isPostman = jsonContent.info && jsonContent.item;

        const options = {
            specData: jsonContent,
            returnContent: true, // IMPORTANT: Force return operations, don't write
            filterModules: modules.length > 0 ? modules : undefined,
            // functionsStr parsing logic omitted but could be added if needed for sync (sync usually full)
        };

        let operations: any[] = [];

        // 1. Deletions
        if (deletedModules.length > 0) {
            // We can't use runCommand('delete-item.ts').
            // We just instruct client to delete.
            // But delete-item does recursive delete.
            // We can simulate that instruction or just simple file deletes.
            // Given sync usually implies full modules...
            for (const mod of deletedModules) {
                operations.push({ type: 'delete', filePath: `src/api-services/definitions/${mod}.ts` });
                // Best effort on others, client usually handles recursive if smart, or we explicit list:
                operations.push({ type: 'delete', filePath: `src/api-services/types/${mod}` });
                operations.push({ type: 'delete', filePath: `src/api-services/generated/${mod}.ts` });
            }
        }

        // 2. Generation
        // Dynamic Import
        const { generateOpenApi } = await import("@/scripts/generate-openapi-collection");
        const { generatePostman } = await import("@/scripts/generate-postman-collection");

        let genOps: any[] = [];
        if (isPostman) {
            genOps = await generatePostman(options) as any[];
        } else {
            genOps = await generateOpenApi(options) as any[];
        }

        operations = [...operations, ...genOps];

        // Post-process operations to ensure correct paths
        operations = operations.map(op => {
            if (op.type === 'write' && !op.filePath.startsWith('src/api-services')) {
                return { ...op, filePath: `src/api-services/${op.filePath}` };
            }
            return op;
        });

        // 3. Types Generation
        // Previously: npm run gen:types. This is hard to replicate 1:1 without shell.
        // However, the client is running a watcher that usually runs `npm run gen:types` or similar?
        // Or we rely on the bridge watcher to detect writes and regen?
        // The Bridge `index.js` watcher triggers `node generate-types.js`!
        // So simply writing the definition files (via operations) will trigger the Bridge watcher
        // which will run `generate-types.js` locally on the user's machine!
        // So we don't need to explicit run it here.

        // Cleanup
        try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (e) { }

        return NextResponse.json({ success: true, operations });

    } catch (error: any) {
        console.error("Sync failed", error);
        if (filePath && fs.existsSync(filePath)) try { fs.unlinkSync(filePath); } catch (e) { }
        return NextResponse.json({ success: false, error: error.toString() }, { status: 500 });
    }
}
