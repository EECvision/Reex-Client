import { NextResponse, NextRequest } from "next/server";
import { getApiTargetDir } from "@/app/api/utils";
// @ts-ignore
import projectService from "@/services/project-service";

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const targetDir = searchParams.get("targetDir") || undefined;
    const apiTargetDir = getApiTargetDir(targetDir);
    try {
        const modules = projectService.getModules(apiTargetDir);
        return NextResponse.json(modules);
    } catch (error: any) {
        console.error(error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
