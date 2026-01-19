import { NextRequest, NextResponse } from "next/server";
import { getBridgeUrl } from "@/app/api/utils";
// @ts-ignore
import typeGenerator from "@/services/type-generator";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { apiKey, fnName, data } = body;

        // Generate interface name logic
        const baseName = fnName.replace(/^[a-z]+_/, '').replace(/_./g, (x: string) => x[1].toUpperCase()).replace(/^[a-z]/, (x: string) => x.toUpperCase());
        const interfaceName = `${baseName}Response`;

        // Generate content
        const typeContent = typeGenerator.generateInterface(interfaceName, data);

        // Path logic (relative to project root for Bridge)
        // src/api-services/types/API_KEY/FN_NAME.ts
        const relativePath = `src/api-services/types/${apiKey}/${fnName}.ts`;

        // Get Bridge URL
        const bridgeUrl = getBridgeUrl();

        // Send to Bridge
        const res = await fetch(`${bridgeUrl}/api/fs/write`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                filePath: relativePath,
                content: typeContent
            })
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(`Bridge Write Error: ${err.message || err.error || res.statusText}`);
        }

        return NextResponse.json({ success: true, message: `Types saved to ${apiKey}/${fnName}.ts` });
    } catch (e: any) {
        console.error("Save types error:", e);
        return NextResponse.json({ success: false, error: e.toString() }, { status: 500 });
    }
}
