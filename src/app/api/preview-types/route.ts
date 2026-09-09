import { NextRequest, NextResponse } from "next/server";
import typeGenerator from "@/services/type-generator";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { data, fnName } = body;
        // Use function name directly for interface name to match Generator
        const interfaceName = fnName;

        const interfaceString = typeGenerator.generateInterface(interfaceName, data);
        return NextResponse.json({ success: true, interfaceString });
    } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e);
        return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
    }
}
