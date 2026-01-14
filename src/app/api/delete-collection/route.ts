import { NextResponse, NextRequest } from "next/server";
import path from "path";
import { runCommand, getEnvWithOverride, sendEvent } from "@/app/api/utils";

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

    // Start async task (fire and forget from response perspective, but we await internally)
    (async () => {
        sendEvent(taskId, 'start', 'Resetting collection...');
        try {
            const env = getEnvWithOverride(targetDir);
            const scriptsDir = path.join(process.cwd(), 'src', 'scripts');

            await runCommand(`npx tsx "${path.join(scriptsDir, 'delete-collection.ts')}"`, { env });

            sendEvent(taskId, 'progress', 'Collection deleted. Updating types...');

            await runCommand('npm run gen:types', { env });
            sendEvent(taskId, 'complete', 'Type generation complete');
            sendEvent('global', 'project:updated', 'Collection reset complete');

        } catch (err: any) {
            console.error("Delete Collection Failed:", err);
            sendEvent(taskId, 'error', `Deletion failed: ${err}`);
        }
    })();

    return NextResponse.json({ success: true, message: 'Collection deletion started', taskId });
}
