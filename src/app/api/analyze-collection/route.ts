import { NextRequest, NextResponse } from "next/server";
import { unzipSync, gunzipSync } from "zlib";
// Direct import of the refactored script
import { analyze } from "@/scripts/analyze-collection";
import { decompressFilePayload } from "../utils";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const existingModulesJson = formData.get('existingModules') as string;
        const existingManifestJson = formData.get('existingManifest') as string;
        const clientMappingsJson = formData.get('clientMappings') as string;

        if (!file) throw new Error("No file provided");

        // Read file content as string
        const fileBuffer = Buffer.from(await file.arrayBuffer());
        const contentBuffer = decompressFilePayload(file.name, fileBuffer);

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

        // Parse existing manifest
        let existingManifest: any = undefined;
        if (existingManifestJson) {
            try {
                existingManifest = JSON.parse(existingManifestJson);
            } catch (e) {
                console.warn("Failed to parse existingManifest", e);
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

        // Perform analysis
        const data = await analyze(specContent, existingModules, clientMappings, existingManifest);

        return NextResponse.json({ success: true, data });

    } catch (error: any) {
        console.error("Analysis Error:", error);
        return NextResponse.json({ success: false, error: error.toString() }, { status: 500 });
    }
}
