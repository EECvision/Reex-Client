import * as fs from "fs";
import * as path from "path";
import { Project, SyntaxKind, PropertyAssignment, SourceFile } from "ts-morph";

// --- Types ---

export interface FileOperation {
    type: 'write' | 'delete';
    filePath: string;
    content?: string;
}

export interface ModuleContent {
    name: string;
    content: string;
}

export interface GeneratorOptions {
    specPath?: string;
    specData?: any;
    outputDir?: string;
    dryRun?: boolean;
    filterModules?: string[];
    filterFunctions?: Map<string, string[]>;
    forceOverwrite?: string[];
    returnContent?: boolean;
    existingFiles?: Map<string, string>;
}

export interface GenericParam {
    name: string;
    required?: boolean;
    description?: string;
}

export interface SignatureConfig {
    functionName: string;
    entityName: string;
    pathParams: string[];
    hasPayload: boolean;
    hasQueryParams: boolean;
}

// --- String Helpers ---

export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const toCamelCase = (str: string) => {
    return str
        .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) =>
            index === 0 ? word.toLowerCase() : word.toUpperCase()
        )
        .replace(/\s+/g, "")
        .replace(/[^a-zA-Z0-9]/g, "");
};

export const toPascalCase = (str: string) => {
    const camel = toCamelCase(str);
    return camel.charAt(0).toUpperCase() + camel.slice(1);
};

export const sanitizeModuleName = (name: string) => {
    return toCamelCase(name).replace(/[^a-zA-Z0-9]/g, "");
};

const RESERVED_KEYWORDS = new Set([
    "abstract", "await", "boolean", "break", "byte", "case", "catch", "char",
    "class", "const", "continue", "debugger", "default", "delete", "do",
    "double", "else", "enum", "export", "extends", "false", "final", "finally",
    "float", "for", "function", "goto", "if", "implements", "import", "in",
    "instanceof", "int", "interface", "let", "long", "native", "new", "null",
    "package", "private", "protected", "public", "return", "short", "static",
    "super", "switch", "synchronized", "this", "throw", "throws", "transient",
    "true", "try", "typeof", "var", "void", "volatile", "while", "with", "yield"
]);

export const sanitizePropertyName = (name: string) => {
    // Check if valid identifier AND not a reserved keyword
    if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name) && !RESERVED_KEYWORDS.has(name)) {
        return name;
    }
    return `'${name}'`;
};

export const normalizeApiUrl = (url: string) => {
    return url
        .replace(/^https?:\/\/[^\/]+/, "")
        .replace(/^{{[^}]+}}/, "")
        .replace(/\/$/, "");
};

// --- AST / Analysis Helpers ---

export const getExistingFunctions = (sourceFile: SourceFile, moduleName: string): Map<string, string> => {
    const existing = new Map<string, string>();
    const variableDecl = sourceFile.getVariableDeclaration(`${moduleName}Api`);

    if (variableDecl) {
        const initializer = variableDecl.getInitializerIfKind(SyntaxKind.ObjectLiteralExpression);
        if (initializer) {
            initializer.getProperties().forEach((prop) => {
                if (prop.getKind() === SyntaxKind.PropertyAssignment) {
                    const name = (prop as PropertyAssignment).getName();
                    existing.set(name, prop.getText());
                }
            });
        }
    }
    return existing;
};

export const getExistingInterfaces = (sourceFile: SourceFile): Map<string, string> => {
    const existing = new Map<string, string>();
    sourceFile.getInterfaces().forEach((iface) => {
        existing.set(iface.getName(), iface.getText());
    });
    return existing;
};

export const mergePreservedFunctions = (
    initializer: any,
    moduleName: string,
    existingFunctions: Map<string, string>,
    forceOverwrite: string[]
) => {
    existingFunctions.forEach((funcText, funcName) => {
        const globalKey = `${moduleName}.${funcName}`.toLowerCase();
        const shouldOverwrite = forceOverwrite.includes("*") || forceOverwrite.includes(globalKey);

        if (!shouldOverwrite) {
            const prop = initializer.getProperty(funcName);
            if (prop) {
                prop.replaceWithText(funcText);
            } else {
                initializer.addMember(funcText);
            }
        } else {
            console.log(`⚡ Force Overwrite applied for: ${funcName}`);
        }
    });
};

export const mergePreservedInterfaces = (
    sourceFile: SourceFile,
    moduleName: string,
    existingInterfaces: Map<string, string>,
    forceOverwrite: string[]
) => {
    existingInterfaces.forEach((ifaceText, ifaceName) => {
        // Heuristic: Check if any function using this type is marked for overwrite
        let isForced = false;

        // 1. Direct match (unlikely for types but good to have)
        if (forceOverwrite.includes("*") || forceOverwrite.includes(ifaceName.toLowerCase())) {
            isForced = true;
        } else {
            // 2. Smart Match: Check related functions
            // Extract Base Name (e.g. ListBeneficiaries from ListBeneficiariesParams)
            let baseName = ifaceName;
            if (ifaceName.endsWith("Params")) baseName = ifaceName.replace(/Params$/, "");
            else if (ifaceName.endsWith("Payload")) baseName = ifaceName.replace(/Payload$/, "");

            // Convert to Camel (for function name matching)
            const camelBase = baseName.charAt(0).toLowerCase() + baseName.slice(1);

            // Check for any standard method prefix
            const methods = ["get", "post", "put", "delete", "patch"];
            for (const method of methods) {
                const funcName = `${method}_${camelBase}`;
                const globalKey = `${moduleName}.${funcName}`.toLowerCase();
                if (forceOverwrite.includes(globalKey)) {
                    isForced = true;
                    break;
                }
            }
        }

        if (!isForced) {
            const currentIface = sourceFile.getInterface(ifaceName);
            if (currentIface) {
                currentIface.replaceWithText(ifaceText);
            } else {
                sourceFile.addInterface(JSON.parse(JSON.stringify(ifaceText)));
            }
        } else {
            console.log(`⚡ Force Overwrite applied for Type: ${ifaceName}`);
        }
    });
};

// --- Generators ---

export const generateInterfaceDefinition = (
    interfaceName: string,
    params: GenericParam[]
): string => {
    if (!params || params.length === 0) return "";

    const fields = params.map((param) => {
        const sanitizedName = sanitizePropertyName(param.name);
        const description = param.description ? ` // ${param.description}` : "";
        const requiredSymbol = param.required ? "" : "?";
        return `  ${sanitizedName}${requiredSymbol}: string;${description}`;
    });

    return `
interface ${interfaceName} {
${fields.join("\n")}
}
`;
};

// Extracted Function Signature Logic
export const generateFunctionSignature = (config: SignatureConfig): string => {
    const { functionName, entityName, pathParams, hasPayload, hasQueryParams } = config;
    const params: Array<{ name: string; type: string; isInterface: boolean }> = [];

    // 1. Path Params
    pathParams.forEach((param) => {
        params.push({ name: param, type: "string", isInterface: false });
    });

    // 2. Payload
    if (hasPayload) {
        params.push({
            name: "payload",
            type: `${entityName}Payload`, // Caller must ensure this type exists or is 'any' logic
            isInterface: true,
        });
    }

    // 3. Query Params
    if (hasQueryParams) {
        params.push({
            name: "params",
            type: `${entityName}Params`,
            isInterface: true,
        });
    }

    if (params.length === 0) {
        return `  ${functionName}: async (): Promise<any> => {`;
    } else if (params.length === 1) {
        const p = params[0];
        if (p.isInterface) {
            return `  ${functionName}: async (${p.name}: ${p.type}): Promise<any> => {`;
        } else {
            return `  ${functionName}: async ({${p.name}}: {${p.name}: ${p.type}}): Promise<any> => {`;
        }
    } else {
        const destructured = params.map((p) => p.name).join(", ");
        const types = params.map((p) => `${p.name}: ${p.type}`).join(", ");
        return `  ${functionName}: async ({${destructured}}: {${types}}): Promise<any> => {`;
    }
};

export const generateAxiosCallBody = (
    method: string,
    functionName: string,
    urlVariableRaw: string,
    hasBody: boolean,
    hasQueryParams: boolean
): string => {
    const methodLower = method.toLowerCase();
    const lines: string[] = [];

    if (hasQueryParams) {
        lines.push(`    const queryString = params ? constructQueryParams(params) : '';`);
        lines.push(`    const url = \`${urlVariableRaw}\${queryString}\`;`);
    } else {
        lines.push(`    const url = \`${urlVariableRaw}\`;`);
    }

    const payloadArg = (hasBody && ['post', 'put', 'patch'].includes(methodLower)) ? ", payload" : "";

    if (methodLower === 'delete') {
        lines.push(`    await handleApiCall(() => BASE_CLIENT.delete(url), "${functionName}");`);
    } else {
        lines.push(`    const res = await handleApiCall(() => BASE_CLIENT.${methodLower}(url${payloadArg}), "${functionName}");`);
        lines.push(`    return res.data;`);
    }

    lines.push(`  },`);
    return lines.join("\n");
};

export const generateModuleTemplate = (
    moduleName: string,
    typeDefinitions: string[],
    functionDefinitions: string[]
): string => {
    const usesQueryParams = functionDefinitions.some((def) => def.includes("constructQueryParams"));
    const utilsImports = ["handleApiCall"];
    if (usesQueryParams) utilsImports.unshift("constructQueryParams");

    return `/* eslint-disable @typescript-eslint/no-explicit-any */
import { BASE_CLIENT } from "../config";
import { ${utilsImports.join(", ")} } from "../config/utils";

// --- Types ---
${typeDefinitions.join("\n")}

// --- API Definition ---

export const ${moduleName}Api = {
${functionDefinitions.join("\n")}
};
`;
};

// --- Core Driver Logic ---

export const processAndMergeModules = (
    modules: ModuleContent[],
    options: GeneratorOptions
): FileOperation[] => {
    const { outputDir, dryRun, filterFunctions, forceOverwrite, returnContent, existingFiles } = options;
    const project = new Project();
    const operations: FileOperation[] = [];
    const apiDir = outputDir ? path.resolve(outputDir, "definitions") : "";

    if (outputDir && !dryRun && !fs.existsSync(apiDir)) {
        try { fs.mkdirSync(apiDir, { recursive: true }); } catch (e) { }
    }

    modules.forEach((mod) => {
        let existingContent: string | null = null;

        // Cloud vs Local Strategy
        if (existingFiles && existingFiles.has(mod.name)) {
            existingContent = existingFiles.get(mod.name) || null;
        } else if (outputDir) {
            const filePath = path.join(apiDir, `${mod.name}.ts`);
            if (fs.existsSync(filePath)) {
                try { existingContent = fs.readFileSync(filePath, "utf8"); } catch (e) { }
            }
        }

        const existingFunctions = new Map<string, string>();
        const existingInterfaces = new Map<string, string>();

        if (existingContent) {
            try {
                const tempSource = project.createSourceFile(`${mod.name}_existing_temp.ts`, existingContent, { overwrite: true });
                getExistingFunctions(tempSource, mod.name).forEach((val, key) => existingFunctions.set(key, val));
                getExistingInterfaces(tempSource).forEach((val, key) => existingInterfaces.set(key, val));
            } catch (e) {
                console.warn(`Failed to read existing file for preservation: ${e}`);
            }
        }

        const sourceFile = project.createSourceFile(`${mod.name}_temp.ts`, mod.content, { overwrite: true });
        const variableDecl = sourceFile.getVariableDeclaration(`${mod.name}Api`);
        const functionsToInclude = filterFunctions?.get(mod.name);

        if (variableDecl) {
            const normalizedForceOverwrite = forceOverwrite?.map(k => k.toLowerCase()) || [];
            const initializer = variableDecl.getInitializerIfKind(SyntaxKind.ObjectLiteralExpression);

            if (initializer) {
                if (functionsToInclude && functionsToInclude.length > 0) {
                    const propsToRemove = initializer.getProperties().filter((prop: any) => {
                        if (prop.getKind() === SyntaxKind.PropertyAssignment) {
                            return !functionsToInclude.includes((prop as PropertyAssignment).getName());
                        }
                        return true;
                    });
                    propsToRemove.forEach((prop: any) => prop.remove());
                }
                mergePreservedFunctions(initializer, mod.name, existingFunctions, normalizedForceOverwrite);
            }
            mergePreservedInterfaces(sourceFile, mod.name, existingInterfaces, normalizedForceOverwrite);

            // Cleanup unused interfaces
            const remainingCode = variableDecl.getInitializer()?.getText() || "";
            sourceFile.getInterfaces().forEach(iface => {
                if (!remainingCode.includes(iface.getName())) iface.remove();
            });
        }

        // Format the file using ts-morph's internal formatter
        sourceFile.formatText({
            indentSize: 2,
            convertTabsToSpaces: true,
            ensureNewLineAtEndOfFile: true,
        });

        const finalContent = sourceFile.getFullText();

        if (returnContent) {
            operations.push({
                type: 'write',
                filePath: path.join('definitions', `${mod.name}.ts`),
                content: finalContent
            });
        } else if (!dryRun && outputDir) {
            const filePath = path.join(apiDir, `${mod.name}.ts`);
            fs.writeFileSync(filePath, finalContent);
            console.log(`✓ Processed ${mod.name}.ts`);
        }
    });

    return operations;
};

// --- CLI Runner (Shared Entry Point) ---

export const runGeneratorCLI = async (
    generatorName: string,
    generatorFn: (opts: GeneratorOptions) => Promise<any>
) => {
    const args = process.argv.slice(2);
    if (args.length === 0) {
        console.error(`✗ Error: ${generatorName} file path is required`);
        process.exit(1);
    }

    const specPath = path.resolve(args[0]);
    // Assuming strict folder structure overlap with the original scripts
    const { API_SERVICES_DIR } = require("../paths");
    const outputDir = API_SERVICES_DIR;

    const filterIndex = args.indexOf("--only");
    let filterModules: string[] | undefined;
    if (filterIndex !== -1 && args[filterIndex + 1]) {
        filterModules = args[filterIndex + 1].split(",");
    }

    const functionsIndex = args.indexOf("--functions");
    let filterFunctions: Map<string, string[]> | undefined;
    if (functionsIndex !== -1 && args[functionsIndex + 1]) {
        try {
            const functionsObj = JSON.parse(args[functionsIndex + 1]);
            filterFunctions = new Map(Object.entries(functionsObj));
        } catch (e) {
            console.error("Failed to parse --functions JSON:", e);
        }
    }

    try {
        await generatorFn({
            specPath,
            outputDir,
            dryRun: false,
            filterModules,
            filterFunctions,
        });
    } catch (err: any) {
        console.error("✗ Error:", err.message);
        process.exit(1);
    }
};