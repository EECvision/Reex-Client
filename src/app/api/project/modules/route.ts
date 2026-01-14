import { NextResponse } from "next/server";
import fs from "fs";
// @ts-ignore
import { API_MANIFEST_PATH } from "@/paths";

export async function GET() {
    try {
        const jsonPath = API_MANIFEST_PATH.replace('.ts', '.json');

        if (!fs.existsSync(jsonPath)) {
            return NextResponse.json({});
        }

        const content = fs.readFileSync(jsonPath, 'utf8');
        const manifest = JSON.parse(content);

        // Convert manifest keys to modules map
        const modules: Record<string, boolean> = {};
        Object.keys(manifest).forEach(key => {
            modules[key] = true;
        });

        return NextResponse.json(modules);
    } catch (error: any) {
        console.error("Failed to load modules:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
