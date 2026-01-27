import { NextResponse, NextRequest } from "next/server";
import path from "path";
import { getApiTargetDir } from "@/app/api/utils";
import projectService from "@/services/ProjectService";

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const targetDir = searchParams.get("targetDir") || undefined;
    const apiTargetDir = getApiTargetDir(targetDir);
    const configDir = path.join(path.dirname(apiTargetDir), 'config');
    try {
        const config = projectService.getProjectConfig(configDir);
        return NextResponse.json(config);
    } catch (e: any) {
        console.error("Config parse error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
