import { NextRequest, NextResponse } from "next/server";
import { sendEvent } from "@/app/api/utils";
import { Project, SyntaxKind } from "ts-morph";

const BRIDGE_URL = process.env.BRIDGE_URL || "http://localhost:4000";

async function bridgeCall(endpoint: string, body: any) {
    const res = await fetch(`${BRIDGE_URL}/api/fs/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(`Bridge Error (${endpoint}): ${err.message || err.error || res.statusText}`);
    }
    return res.json();
}

export async function POST(req: NextRequest) {
    const taskId = Date.now().toString();
    try {
        const body = await req.json();
        const { type, moduleName, functionName } = body; // targetDir ignore, usage Bridge

        (async () => {
            const itemLabel = type === 'module' ? `module '${moduleName}'` : `function '${functionName}'`;
            sendEvent(taskId, 'start', `Deleting ${itemLabel}...`);

            try {
                if (type === 'module') {
                    // 1. Delete Module File
                    await bridgeCall('delete', { filePath: `src/api-services/definitions/${moduleName}.ts` });

                    // 2. Delete Types Directory (recursive)
                    // Bridge's delete is recursive by default if it uses fs.rmSync({recursive:true}) or similar
                    // Assuming Bridge delete handles directories
                    try {
                        await bridgeCall('delete', { filePath: `src/api-services/types/${moduleName}` });
                    } catch (ignore) { }

                    // 3. Regenerate Index (Reuse logic from update-collection)
                    sendEvent(taskId, 'progress', 'Regenerating index.ts...');
                    const listRes = await bridgeCall('list', { filePath: 'src/api-services/definitions' });

                    if (listRes.files && Array.isArray(listRes.files)) {
                        const moduleNames = listRes.files
                            .filter((f: string) => f.endsWith('.ts') && !f.endsWith('.d.ts'))
                            .map((f: string) => f.replace('.ts', ''));

                        const indexContent = `export * from "./config";
export * from "./config/utils";

${moduleNames.map((name: string) => `import { ${name}Api } from "./definitions/${name}";`).join('\n')}

export const apiClient = {
${moduleNames.map((name: string) => `  ...${name}Api,`).join('\n')}
};
`;
                        await bridgeCall('write', { filePath: 'src/api-services/index.ts', content: indexContent });
                    }

                } else if (type === 'function') {
                    if (!functionName) throw new Error("Function name required");

                    // 1. Read Module File
                    const readRes = await bridgeCall('read', { filePath: `src/api-services/definitions/${moduleName}.ts` });
                    if (!readRes.content) throw new Error(`Could not read module ${moduleName}`);

                    // 2. Modify with ts-morph
                    const project = new Project();
                    const sourceFile = project.createSourceFile(`${moduleName}.ts`, readRes.content);

                    const variableDecl = sourceFile.getVariableDeclaration(`${moduleName}Api`);
                    if (variableDecl) {
                        const initializer = variableDecl.getInitializerIfKind(SyntaxKind.ObjectLiteralExpression);
                        if (initializer) {
                            const prop = initializer.getProperty(functionName);
                            if (prop) {
                                prop.remove();
                            }
                            // Also remove interface if present (naive match)
                            const interfaces = sourceFile.getInterfaces();
                            interfaces.forEach(iface => {
                                if (iface.getName().toLowerCase().includes(functionName.toLowerCase())) {
                                    // Basic check, might be too aggressive? 
                                    // Legacy script: "if ifaceName.includes(functionName.toLowerCase())"
                                    // We'll stick to legacy logic
                                    iface.remove();
                                }
                            });

                            // If empty, should we delete module? Legacy said yes.
                            // If empty, should we delete module? Legacy said yes.
                            if (initializer.getProperties().length === 0) {
                                // 1. Delete Files
                                await bridgeCall('delete', { filePath: `src/api-services/definitions/${moduleName}.ts` });
                                try {
                                    await bridgeCall('delete', { filePath: `src/api-services/types/${moduleName}` });
                                } catch (ignore) { }

                                // 2. Regenerate Index
                                sendEvent(taskId, 'progress', 'Module empty. Deleted module and regenerating index...');
                                const listRes = await bridgeCall('list', { filePath: 'src/api-services/definitions' });

                                if (listRes.files && Array.isArray(listRes.files)) {
                                    const moduleNames = listRes.files
                                        .filter((f: string) => f.endsWith('.ts') && !f.endsWith('.d.ts'))
                                        .map((f: string) => f.replace('.ts', ''));

                                    const indexContent = `export * from "./config";
export * from "./config/utils";

${moduleNames.map((name: string) => `import { ${name}Api } from "./definitions/${name}";`).join('\n')}

export const apiClient = {
${moduleNames.map((name: string) => `  ...${name}Api,`).join('\n')}
};
`;
                                    await bridgeCall('write', { filePath: 'src/api-services/index.ts', content: indexContent });
                                }

                            } else {
                                // Save update
                                await bridgeCall('write', { filePath: `src/api-services/definitions/${moduleName}.ts`, content: sourceFile.getFullText() });
                            }
                        }
                    }

                    // 3. Delete Type File
                    try {
                        await bridgeCall('delete', { filePath: `src/api-services/types/${moduleName}/${functionName}.ts` });
                    } catch (ignore) { }
                }

                sendEvent(taskId, 'complete', `Successfully deleted ${itemLabel}`);
                sendEvent('global', 'project:updated', 'Item deleted');

            } catch (error: any) {
                console.error("Delete Item Failed:", error);
                sendEvent(taskId, 'error', `Failed to delete ${itemLabel}: ${error.toString()}`);
            }
        })();

        return NextResponse.json({ success: true, message: 'Deletion started', taskId });

    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.toString() }, { status: 500 });
    }
}
