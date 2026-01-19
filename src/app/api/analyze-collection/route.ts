import { NextRequest, NextResponse } from "next/server";
// Direct import of the refactored script
import { analyze } from "@/scripts/analyze-collection";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const existingModulesJson = formData.get('existingModules') as string;

        if (!file) throw new Error("No file provided");

        // Read file content as string
        const buffer = Buffer.from(await file.arrayBuffer());
        const specContent = buffer.toString('utf-8');

        // Parse existing modules (passed from Bridge)
        const existingModules = new Map<string, string>();
        if (existingModulesJson) {
            try {
                const modulesObj = JSON.parse(existingModulesJson);
                Object.entries(modulesObj).forEach(([k, v]) => existingModules.set(k, v as string));
            } catch (e) {
                console.warn("Failed to parse existingModules", e);
            }
        }

        // Run analysis directly (In-Memory)
        const data = await analyze(specContent, existingModules);

        return NextResponse.json({ success: true, data });

    } catch (error: any) {
        console.error("Analysis Error:", error);
        return NextResponse.json({ success: false, error: error.toString() }, { status: 500 });
    }
}
