import { NextRequest, NextResponse } from "next/server";
import { getApiTargetDir } from "@/app/api/utils";
import executionService from "@/services/ExecutionService";

export async function POST(req: NextRequest) {
    const apiTargetDir = getApiTargetDir();
    try {
        const body = await req.json();
        const { apiKey, fnName, args } = body;
        const result = await executionService.executeFunction(apiTargetDir, apiKey, fnName, args);
        return NextResponse.json({ success: true, data: result });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.toString() }, { status: 500 });
    }
}
