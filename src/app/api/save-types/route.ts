import { NextRequest, NextResponse } from "next/server";
import { getApiServicesDir } from "@/app/api/utils";
import typeGenerator from "@/services/type-generator";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { apiKey, fnName, data, apiServicesDir } = body;

        // Use function name directly for interface name to match Generator
        const interfaceName = fnName;

        // Generate content
        const typeContent = typeGenerator.generateInterface(interfaceName, data);

        // Path logic (relative to project root for Bridge)
        // src/api-services/types/API_KEY/FN_NAME.ts
        const API_SERVICES_DIR = getApiServicesDir(process.env.API_TARGET_DIR || process.cwd(), apiServicesDir);
        const relativePath = `${API_SERVICES_DIR}/types/${apiKey}/${fnName}.ts`;

        return NextResponse.json({
            success: true,
            operation: {
                type: 'write',
                filePath: relativePath,
                content: typeContent
            }
        });
    } catch (e: any) {
        console.error("Save types error:", e);
        return NextResponse.json({ success: false, error: e.toString() }, { status: 500 });
    }
}
