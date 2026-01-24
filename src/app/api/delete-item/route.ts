import { NextRequest, NextResponse } from "next/server";
import { sendEvent, getBridgeUrl } from "@/app/api/utils";
import { Project, SyntaxKind } from "ts-morph";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { type, moduleName, functionName, existingContent } = body;

        const operations: any[] = [];

        if (type === 'module') {
            // 1. Delete Module File
            operations.push({ type: 'delete', filePath: `src/api-services/definitions/${moduleName}.ts` });
            operations.push({ type: 'delete', filePath: `src/api-services/types/${moduleName}` });
            operations.push({ type: 'delete', filePath: `src/api-services/generated/${moduleName}.ts` });

        } else if (type === 'function') {
            if (!functionName) throw new Error("Function name required");
            if (!existingContent) throw new Error("Existing content required for function deletion");

            // 2. Modify with ts-morph
            const project = new Project();
            const sourceFile = project.createSourceFile(`${moduleName}.ts`, existingContent);

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
                            iface.remove();
                        }
                    });

                    // If empty, delete module
                    if (initializer.getProperties().length === 0) {
                        operations.push({ type: 'delete', filePath: `src/api-services/definitions/${moduleName}.ts` });
                        operations.push({ type: 'delete', filePath: `src/api-services/types/${moduleName}` });
                        operations.push({ type: 'delete', filePath: `src/api-services/generated/${moduleName}.ts` });
                    } else {
                        // Save update
                        operations.push({
                            type: 'write',
                            filePath: `src/api-services/definitions/${moduleName}.ts`,
                            content: sourceFile.getFullText()
                        });
                        // Delete specific type file for function
                        operations.push({ type: 'delete', filePath: `src/api-services/types/${moduleName}/${functionName}.ts` });
                    }
                }
            } else {
                throw new Error("Could not find API declaration in module");
            }
        }

        return NextResponse.json({ success: true, operations });

    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.toString() }, { status: 500 });
    }
}
