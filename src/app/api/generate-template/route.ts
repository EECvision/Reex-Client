import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { runCommand, getEnvWithOverride, sendEvent } from "@/app/api/utils";

export async function POST(req: NextRequest) {
    const taskId = Date.now().toString();
    try {
        const body = await req.json();
        const { moduleName, targetDir } = body; // Read targetDir

        if (!moduleName) {
            return NextResponse.json({ success: false, error: "Module name required" }, { status: 400 });
        }
        // The original regex validation for moduleName is removed as per the instruction's implied replacement.
        // If the regex validation was still desired, it would need to be explicitly added back.

        (async () => {
            sendEvent(taskId, 'start', `Generating template for ${moduleName}...`);
            try {
                // Pass targetDir to env generator
                const env = getEnvWithOverride(targetDir);
                const scriptsDir = path.join(process.cwd(), 'src', 'scripts');
                const cmd = `npx tsx "${path.join(scriptsDir, 'generate-template.ts')}" "${moduleName}"`;

                await runCommand(cmd, { env });

                sendEvent(taskId, 'progress', 'Template files created. Regenerating types...');
                await runCommand('npm run gen:types', { env });

                sendEvent(taskId, 'complete', `Template '${moduleName}' generated successfully`);
                sendEvent('global', 'project:updated', 'Template generated');
            } catch (err: any) {
                console.error("Template generation error:", err);
                sendEvent(taskId, 'error', `Generation failed: ${err.toString()}`);
            }
        })();

        return NextResponse.json({ success: true, message: `Template generation started`, taskId });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.toString() }, { status: 500 });
    }
}
