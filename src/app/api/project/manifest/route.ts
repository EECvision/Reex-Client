import { NextResponse } from "next/server";
import fs from "fs";

import { API_MANIFEST_PATH } from "@/paths";

export async function GET() {
    try {
        const jsonPath = API_MANIFEST_PATH.replace('.ts', '.json');

        console.log(`[Manifest API] Reading from: ${jsonPath}`);

        if (!fs.existsSync(jsonPath)) {
            console.warn(`[Manifest API] File not found: ${jsonPath}`);
            return NextResponse.json({}, { status: 200 });
        }

        const content = fs.readFileSync(jsonPath, 'utf8');
        const manifest = JSON.parse(content);

        return NextResponse.json(manifest);
    } catch (error: any) {
        console.error("Failed to load manifest:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
