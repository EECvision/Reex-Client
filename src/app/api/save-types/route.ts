import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { getApiTargetDir } from "@/app/api/utils";
// @ts-ignore
import typeGenerator from "@/services/type-generator";

export async function POST(req: NextRequest) {
    const apiTargetDir = getApiTargetDir();
    try {
        const body = await req.json();
        const { apiKey, fnName, data } = body;

        const apiServicesDir = path.dirname(apiTargetDir);
        const typesBaseDir = path.join(apiServicesDir, 'types');
        const targetTypeDir = path.join(typesBaseDir, apiKey);

        if (!fs.existsSync(targetTypeDir)) {
            fs.mkdirSync(targetTypeDir, { recursive: true });
        }

        const baseName = fnName.replace(/^[a-z]+_/, '').replace(/_./g, (x: string) => x[1].toUpperCase()).replace(/^[a-z]/, (x: string) => x.toUpperCase());
        const interfaceName = `${baseName}Response`;

        const typePath = path.join(targetTypeDir, `${fnName}.ts`);

        // Generate content
        const typeContent = typeGenerator.generateInterface(interfaceName, data);

        // Check for disable flag
        if (fs.existsSync(typePath)) {
            const existingContent = fs.readFileSync(typePath, "utf-8");
            if (existingContent.includes("/* sync-type-disable */")) {
                return NextResponse.json({
                    success: true,
                    message: `Skipped updating ${fnName}.ts (/* sync-type-disable */ found).`
                });
            }
        }

        fs.writeFileSync(typePath, typeContent, 'utf-8');

        return NextResponse.json({ success: true, message: `Types saved to ${apiKey}/${fnName}.ts` });
    } catch (e: any) {
        console.error("Save types error:", e);
        return NextResponse.json({ success: false, error: e.toString() }, { status: 500 });
    }
}
