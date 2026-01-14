import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { runCommand, getEnvWithOverride, sendEvent } from "@/app/api/utils";

export async function POST(req: NextRequest) {
    const taskId = Date.now().toString();
    try {
        const body = await req.json();
        const { type, moduleName, functionName, targetDir } = body;

        (async () => {
            const itemLabel = type === 'module' ? `module '${moduleName}'` : `function '${functionName}'`;
            sendEvent(taskId, 'start', `Deleting ${itemLabel}...`);

            try {
                const env = getEnvWithOverride(targetDir);
                const scriptsDir = path.join(process.cwd(), 'src', 'scripts');

                let cmd = `npx tsx "${path.join(scriptsDir, 'delete-item.ts')}" ${type} "${moduleName}"`;
                if (functionName) cmd += ` "${functionName}"`;

                await runCommand(cmd, { env });

                sendEvent(taskId, 'progress', 'Item deleted. Regenerating API artifacts...');
                await runCommand('npm run gen:types', { env });

                sendEvent(taskId, 'complete', `Successfully deleted ${itemLabel}`);
                sendEvent('global', 'project:updated', 'Item deleted');

            } catch (error: any) {
                sendEvent(taskId, 'error', `Failed to delete ${itemLabel}: ${error.toString()}`);
            }
        })();

        return NextResponse.json({ success: true, message: 'Deletion started', taskId });

    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.toString() }, { status: 500 });
    }
}
