
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { message, level = "info" } = body;
        const logFile = path.join(process.cwd(), "subscription-debug.log");
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] [CLIENT-${level.toUpperCase()}] ${message}\n`;

        fs.appendFileSync(logFile, logEntry);

        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ success: false, error: "Failed to log" }, { status: 500 });
    }
}
