import { NextRequest, NextResponse } from "next/server";
// @ts-ignore
import typeGenerator from "@/services/type-generator";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { data, fnName } = body;
        // Generate interface name logic
        const baseName = fnName.replace(/^[a-z]+_/, '').replace(/_./g, (x: string) => x[1].toUpperCase()).replace(/^[a-z]/, (x: string) => x.toUpperCase());
        const interfaceName = `${baseName}Response`;

        const interfaceString = typeGenerator.generateInterface(interfaceName, data);
        return NextResponse.json({ success: true, interfaceString });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.toString() }, { status: 500 });
    }
}
