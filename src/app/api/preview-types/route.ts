import { NextRequest, NextResponse } from "next/server";
// @ts-ignore
import typeGenerator from "@/services/type-generator";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { data, fnName } = body;
        // Use function name directly for interface name to match Generator
        const interfaceName = fnName;

        const interfaceString = typeGenerator.generateInterface(interfaceName, data);
        return NextResponse.json({ success: true, interfaceString });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.toString() }, { status: 500 });
    }
}
