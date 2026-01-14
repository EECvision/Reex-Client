import { NextResponse, NextRequest } from "next/server";
import path from "path";
import fs from "fs";
import { runCommand, getEnvWithOverride, sendEvent } from "@/app/api/utils";

const BRIDGE_URL = process.env.BRIDGE_URL || "http://localhost:4000";

async function sendToBridge(method: string, endpoint: string, body: any) {
    const res = await fetch(`${BRIDGE_URL}/api/fs/${endpoint}`, {
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
    const taskId = Date.now().toString();

    // Body is JSON
    let targetDir = null;
    try {
        const body = await req.json();
        targetDir = body.targetDir;
    } catch (e) {
        // Body might be empty
    }

    // Start async task
    (async () => {
        sendEvent(taskId, 'start', 'Resetting collection...');
        try {
            // 1. Delete Remote Files via Bridge
            const pathsToDelete = [
                'src/api-services/definitions',
                'src/api-services/types',
                'src/api-services/generated', // Also clear generated hooks
                'src/api-services/index.ts'
            ];

            for (const p of pathsToDelete) {
                // We use try-catch inside the loop to allow deleting partials if some don't exist
                try {
                    await sendToBridge('POST', 'delete', { filePath: p });
                } catch (e) {
                    console.log(`Deletion of ${p} ignored:`, e);
                }
            }

            // 2. Reset Local apiModules.ts
            // We can use direct fs here because api-next-server owns this file
            const localApiModulesPath = path.join(process.cwd(), 'src/config/apiModules.ts');
            if (fs.existsSync(localApiModulesPath)) {
                const emptyContent = `// This file is auto-generated. Do not edit manually.

export const apiModules = {};
`;
                fs.writeFileSync(localApiModulesPath, emptyContent);
            }

            sendEvent(taskId, 'complete', 'Collection reset complete');
            sendEvent('global', 'project:updated', 'Collection reset complete');

        } catch (err: any) {
            console.error("Delete Collection Failed:", err);
            sendEvent(taskId, 'error', `Deletion failed: ${err}`);
        }
    })();

    return NextResponse.json({ success: true, message: 'Collection deletion started', taskId });
}
