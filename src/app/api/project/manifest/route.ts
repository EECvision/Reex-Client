import { NextResponse } from "next/server";
import { getApiTargetDir } from "@/app/api/utils";
// @ts-ignore
import projectService from "@/services/project-service";

export async function GET() {
    const apiTargetDir = getApiTargetDir();
    try {
        const manifest = projectService.generateManifest(apiTargetDir);
        return NextResponse.json(manifest);
    } catch (error: any) {
        console.error(error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
