import { NextResponse } from "next/server";
import { getApiTargetDir } from "@/app/api/utils";

export async function GET() {
    const targetDir = getApiTargetDir();
    return NextResponse.json({
        status: 'ok',
        cwd: process.cwd(),
        targetDir
    });
}
