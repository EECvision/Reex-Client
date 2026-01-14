import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
    try {
        const cwd = process.cwd();
        const files = await fs.promises.readdir(cwd, { withFileTypes: true });
        const fileList = await Promise.all(files.map(async file => ({
            name: file.name,
            isDirectory: file.isDirectory(),
            size: file.isFile() ? (await fs.promises.stat(path.join(cwd, file.name))).size : 0
        })));
        return NextResponse.json({ files: fileList });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
