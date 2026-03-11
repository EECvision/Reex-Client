import { NextResponse, NextRequest } from "next/server";
import path from "path";
import fs from "fs";
import { sendEvent, getBridgeUrl, getApiServicesDir } from "@/app/api/utils";

// Helper to send to Bridge
async function sendToBridge(bridgeUrl: string, method: string, endpoint: string, body: any) {
    const res = await fetch(`${bridgeUrl}/api/fs/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(`Bridge Error (${endpoint}): ${err.message || err.error || res.statusText}`);
    }
}

export async function POST(req: NextRequest) {
    // Body is JSON
    let targetDir = null;
    let bridgeUrl = getBridgeUrl();
    let taskId = Date.now().toString();
    let apiServicesDir: string | undefined;

    try {
        const body = await req.json();
        targetDir = body.targetDir;
        if (body.bridgeUrl) bridgeUrl = body.bridgeUrl;
        if (body.taskId) taskId = body.taskId;
        apiServicesDir = body.apiServicesDir;
    } catch (e) {
        // Body might be empty
    }

    // Start async task
    // On Vercel, we can't reliably fire-and-forget long tasks if we return immediately.
    // However, calculation is fast. 
    // We will return the instructions to the client.

    const API_SERVICES_DIR = getApiServicesDir(targetDir || process.env.API_TARGET_DIR || process.cwd(), apiServicesDir);

    const pathsToDelete = [
        `${API_SERVICES_DIR}/definitions`,
        `${API_SERVICES_DIR}/types`,
        `${API_SERVICES_DIR}/generated`,
        `${API_SERVICES_DIR}/index.ts`
    ];

    // Note: We cannot reset local 'src/config/apiModules.ts' on Vercel ephemeral FS reliably.
    // Ideally the app should be dynamic enough not to need it, or the Client should sync it?
    // For now, we omit the local write as it's futile on Vercel.

    return NextResponse.json({
        success: true,
        message: 'Collection reset instructions generated',
        operations: pathsToDelete.map(p => ({ type: 'delete', filePath: p }))
    });
}
