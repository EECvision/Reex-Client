import { NextRequest, NextResponse } from "next/server";

// Direct import of the refactored script
import { analyze } from "@/scripts/analyze-collection";
import { decompressFilePayload } from "../utils";
import { EndpointInfo } from "@/types";

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
        let existingManifest: Record<string, Record<string, EndpointInfo>> | undefined = undefined;
        if (existingManifestJson) {
            try {
                existingManifest = JSON.parse(existingManifestJson) as Record<string, Record<string, EndpointInfo>>;
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

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("Analysis Error:", error);
        return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
    }
}
