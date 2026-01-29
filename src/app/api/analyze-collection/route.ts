import { NextRequest, NextResponse } from "next/server";
import { unzipSync, gunzipSync } from "zlib";
// Direct import of the refactored script
import { analyze } from "@/scripts/analyze-collection";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const existingModulesJson = formData.get('existingModules') as string;
        const clientMappingsJson = formData.get('clientMappings') as string;

        if (!file) throw new Error("No file provided");

        // Read file content as string
        const buffer = Buffer.from(await file.arrayBuffer());

        // Decompress if Gzipped (Magic Number: 1f 8b)
        // or if filename ends with .gz
        const isGzip = file.name.endsWith('.gz') || (buffer[0] === 0x1f && buffer[1] === 0x8b);

        let contentBuffer = buffer;
        if (isGzip) {
            try {
                contentBuffer = gunzipSync(buffer);
            } catch (e) {
                console.warn("Decompression failed, trying raw...", e);
            }
        }

        const specContent = contentBuffer.toString('utf-8');

        // Parse existing modules
        const existingModules = new Map<string, string>();
        if (existingModulesJson) {
            try {
                const modulesObj = JSON.parse(existingModulesJson);
                Object.entries(modulesObj).forEach(([k, v]) => existingModules.set(k, v as string));
            } catch (e) {
                console.warn("Failed to parse existingModules", e);
            }
        }

        // Parse client mappings
        let clientMappings: Record<string, string> | undefined;
        if (clientMappingsJson) {
            try {
                clientMappings = JSON.parse(clientMappingsJson);
            } catch (e) {
                console.warn("Failed to parse clientMappings", e);
            }
        }

        // Run analysis
        const data = await analyze(specContent, existingModules, clientMappings);

        return NextResponse.json({ success: true, data });

    } catch (error: any) {
        console.error("Analysis Error:", error);
        return NextResponse.json({ success: false, error: error.toString() }, { status: 500 });
    }
}
