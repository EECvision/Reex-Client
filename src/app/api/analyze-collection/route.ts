import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import os from "os";
import { runCommand, getEnvWithOverride } from "@/app/api/utils";

export async function POST(req: NextRequest) {
    let filePath: string | null = null;
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) throw new Error("No file provided");

        const buffer = Buffer.from(await file.arrayBuffer());
        const fileName = file.name || "unknown";

        const uploadsDir = path.join(os.tmpdir(), 'api-builder-uploads');
        if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

        filePath = path.join(uploadsDir, `${Date.now()}_analysis_${fileName}`);
        fs.writeFileSync(filePath, buffer);

        const env = getEnvWithOverride();
        const scriptsDir = path.join(process.cwd(), 'src', 'scripts');
        const cmd = `npx tsx "${path.join(scriptsDir, 'analyze-collection.ts')}" "${filePath}"`;

        const output = await runCommand(cmd, { env });

        const jsonStart = output.indexOf('[');
        const jsonEnd = output.lastIndexOf(']');
        if (jsonStart === -1 || jsonEnd === -1) throw new Error("Invalid output from analysis script");

        const data = JSON.parse(output.substring(jsonStart, jsonEnd + 1));
        return NextResponse.json({ success: true, data });

    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.toString() }, { status: 500 });
    } finally {
        if (filePath && fs.existsSync(filePath)) {
            try { fs.unlinkSync(filePath); } catch (e) { console.error("Cleanup failed:", e); }
        }
    }
}
