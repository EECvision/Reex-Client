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
    clientMappings?: Record<string, string>;
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

export interface StandardFunctionDefinition {
    name: string;
    method: 'get' | 'post' | 'put' | 'delete' | 'patch';
    path: string; // pre-normalized path with ${param} syntax
    description?: string;
    pathParams: string[];
    queryParams?: GenericParam[];
    bodySchema?: any; // Raw JSON (Postman) or OpenAPI Schema
    isPostman?: boolean;
    clientName?: string; // e.g. "AUTH_CLIENT"
}

export interface StandardModuleDefinition {
    name: string;
    functions: StandardFunctionDefinition[];
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
        .replace(/^\/api\/v\d+/, "")
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
    hasQueryParams: boolean,
    clientName: string = "BASE_CLIENT"
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
        lines.push(`    const res = await handleApiCall(() => ${clientName}.delete(url), "${functionName}");`);
        lines.push(`    if (res.error) throw res.error;`);
    } else {
        lines.push(`    const res = await handleApiCall(() => ${clientName}.${methodLower}(url${payloadArg}), "${functionName}");`);
        lines.push(`    if (res.error) throw res.error;`);
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

    // Collect all used clients (hacky regex or better pass usedClients in)
    // For now, let's just infer from function body or pass it in.
    // Actually, looking at generateStandardModuleContent, we can do better.
    // BUT to keep signature simple, let's just scrape the function definitions.
    const potentialClients = new Set<string>();
    functionDefinitions.forEach(def => {
        const match = def.match(/handleApiCall\(\(\) => ([a-zA-Z0-9_]+)\./);
        if (match && match[1]) potentialClients.add(match[1]);
    });

    // Default to BASE_CLIENT if nothing found (shouldn't happen with new logic)
    if (potentialClients.size === 0) potentialClients.add("BASE_CLIENT");
    const clientImports = Array.from(potentialClients).sort().join(", ");


    return `/* eslint-disable @typescript-eslint/no-explicit-any */
import { ${clientImports} } from "../config";
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

// --- Unified Generator Logic ---

export const generateStandardModuleContent = (
    modules: StandardModuleDefinition[],
    specData?: any // Optional, mostly for OpenAPI ref resolution
): ModuleContent[] => {
    const generatedModules: ModuleContent[] = [];

    modules.forEach((mod) => {
        const moduleName = mod.name;
        const typeDefinitions: string[] = [];
        const functionDefinitions: string[] = [];
        const generatedFunctions = new Set<string>();
        const generatedTypes = new Set<string>();

        mod.functions.forEach((func) => {
            if (generatedFunctions.has(func.name)) return;

            const entityRequestName = toPascalCase(func.name.replace(/^(get|post|put|delete|patch)_/, ""));
            let hasPayloadType = false;
            const needsPayload = ["post", "put", "patch"].includes(func.method);

            // 1. Generate Types (Payload)
            if (needsPayload && func.bodySchema) {
                let bodyType = "";
                const typeName = entityRequestName + "Payload";

                if (func.isPostman) {
                    bodyType = generateTypesFromPostmanBody(func.bodySchema, entityRequestName);
                } else {
                    bodyType = generateTypesFromOpenAPISchema(
                        func.bodySchema,
                        entityRequestName,
                        "Payload",
                        specData
                    );
                }

                if (bodyType && !generatedTypes.has(typeName)) {
                    typeDefinitions.push(bodyType);
                    generatedTypes.add(typeName);
                    hasPayloadType = true;
                }
            }

            // 2. Generate Types (Query Params)
            if (func.queryParams && func.queryParams.length > 0) {
                const typeName = entityRequestName + "Params";
                const queryType = generateInterfaceDefinition(typeName, func.queryParams);
                if (queryType && !generatedTypes.has(typeName)) {
                    typeDefinitions.push(queryType);
                    generatedTypes.add(typeName);
                }
            }

            // 3. Generate Function Signature
            const signature = generateFunctionSignature({
                functionName: func.name,
                entityName: entityRequestName,
                pathParams: func.pathParams,
                hasPayload: hasPayloadType,
                hasQueryParams: !!(func.queryParams && func.queryParams.length > 0)
            });

            // 4. Generate Function Body
            // Path is already normalized to ${param} syntax
            const body = generateAxiosCallBody(
                func.method,
                func.name,
                func.path, // Pre-normalized path
                hasPayloadType,
                !!(func.queryParams && func.queryParams.length > 0),
                func.clientName
            );

            generatedFunctions.add(func.name);
            functionDefinitions.push(`${signature}\n${body}\n`);
        });

        generatedModules.push({
            name: moduleName,
            content: generateModuleTemplate(moduleName, typeDefinitions, functionDefinitions)
        });
    });

    return generatedModules;
};

// --- OpenAPI Specific Helpers ---

export const resolveSchema = (schema: any, spec: any): any => {
    if (!schema) return null;
    if (schema.$ref) {
        const refPath = schema.$ref.replace(/^#\//, "").split("/");
        let resolved = spec;
        for (const segment of refPath) {
            resolved = resolved?.[segment];
            if (!resolved) return null;
        }
        return resolved;
    }
    return schema;
};

export const resolveClientAndPath = (
    pathToCheck: string,
    pathForSubstitution: string,
    clientMappings?: Record<string, string>
): { clientName?: string; path: string } => {
    if (!clientMappings) return { clientName: undefined, path: pathForSubstitution };

    let bestMatch = "";
    let bestClient = "";

    Object.entries(clientMappings).forEach(([prefix, clientName]) => {
        // prefix is the PATH PREFIX (e.g. /api/auth)
        // clientName is the CLIENT NAME (e.g. AUTH_CLIENT)

        // Handle root slash consistency
        const cleanPrefix = prefix === "/" ? "" : prefix.replace(/\/$/, "");
        const checkPath = pathToCheck.startsWith("/") ? pathToCheck : "/" + pathToCheck;
        const checkPrefix = cleanPrefix.startsWith("/") ? cleanPrefix : "/" + cleanPrefix;

        if (checkPath.startsWith(checkPrefix)) {
            if (checkPrefix.length > bestMatch.length) {
                bestMatch = checkPrefix;
                bestClient = clientName;
            }
        }
    });

    if (bestClient) {
        // Strip prefix from the substitution path
        const cleanPrefix = bestMatch === "/" ? "" : bestMatch.replace(/\/$/, "");
        const normalizedSubPath = pathForSubstitution.startsWith("/") ? pathForSubstitution : "/" + pathForSubstitution;
        const normalizedPrefix = cleanPrefix.startsWith("/") ? cleanPrefix : "/" + cleanPrefix;

        if (normalizedSubPath.startsWith(normalizedPrefix)) {
            const trimmed = normalizedSubPath.slice(normalizedPrefix.length);
            return {
                clientName: bestClient,
                path: trimmed.startsWith("/") ? trimmed : "/" + trimmed
            };
        }
        return { clientName: bestClient, path: pathForSubstitution };
    }

    return { clientName: undefined, path: pathForSubstitution };
};

export const convertOpenAPITypeToTS = (schema: any, spec?: any): string => {
    if (!schema) return "any";
    const resolvedSchema = spec ? resolveSchema(schema, spec) : schema;
    if (!resolvedSchema) return "any";

    // 1. Handle Enums
    if (resolvedSchema.enum) {
        return resolvedSchema.enum.map((v: any) => typeof v === 'string' ? `'${v}'` : v).join(' | ');
    }

    // 2. Handle Union Types (oneOf/anyOf)
    if (resolvedSchema.oneOf || resolvedSchema.anyOf) {
        const variants = resolvedSchema.oneOf || resolvedSchema.anyOf;
        return variants.map((v: any) => convertOpenAPITypeToTS(v, spec)).join(' | ');
    }

    if (resolvedSchema.type === "string") return "string";
    if (resolvedSchema.type === "number" || resolvedSchema.type === "integer") return "number";
    if (resolvedSchema.type === "boolean") return "boolean";
    if (resolvedSchema.type === "array") {
        const itemType = convertOpenAPITypeToTS(resolvedSchema.items, spec);
        return `${itemType}[]`;
    }
    if (resolvedSchema.type === "object") {
        if (resolvedSchema.properties) {
            const fields = Object.entries(resolvedSchema.properties).map(
                ([key, prop]: [string, any]) => {
                    const required = resolvedSchema.required?.includes(key);
                    const type = convertOpenAPITypeToTS(prop, spec);
                    return `  ${sanitizePropertyName(key)}${required ? "" : "?"}: ${type};`;
                }
            );
            return `{\n${fields.join("\n")}\n}`;
        }
        return "Record<string, any>";
    }
    return "any";
};

export const generateTypesFromOpenAPISchema = (
    schema: any,
    entityName: string,
    suffix: string,
    spec: any
): string => {
    if (!schema) return "";
    const resolvedSchema = resolveSchema(schema, spec);
    if (!resolvedSchema || !resolvedSchema.properties) return "";

    const fields: string[] = [];
    const required = resolvedSchema.required || [];

    Object.entries(resolvedSchema.properties).forEach(
        ([key, prop]: [string, any]) => {
            const isRequired = required.includes(key);
            const type = convertOpenAPITypeToTS(prop, spec);
            const optional = isRequired ? "" : "?";
            const description = prop.description ? ` // ${prop.description}` : "";
            fields.push(`  ${sanitizePropertyName(key)}${optional}: ${type};${description}`);
        }
    );

    if (fields.length === 0) return "";
    return `
interface ${entityName}${suffix} {
${fields.join("\n")}
}
`;
};

// --- Postman Specific Helpers ---

export const extractPostmanPathParams = (url: string): string[] => {
    const matches = url.match(/:([a-zA-Z_][a-zA-Z0-9_]*)/g);
    return matches ? matches.map((m) => m.slice(1)) : [];
};

export const inferTypeFromExample = (value: any): string => {
    if (value === null || value === undefined) return "any";
    if (typeof value === "string") return "string";
    if (typeof value === "number") return "number";
    if (typeof value === "boolean") return "boolean";
    if (Array.isArray(value)) return value.length > 0 ? `${inferTypeFromExample(value[0])}[]` : "any[]";
    if (typeof value === "object") return "Record<string, any>";
    return "any";
};

export const generateTypesFromPostmanBody = (body: any, entityName: string): string => {
    if (!body || !body.raw) return "";

    let parsed;
    try {
        parsed = JSON.parse(body.raw);
    } catch (e) {
        try {
            // Fallback: simple comment stripping to try and rescue invalid JSON
            let cleanJson = body.raw.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
            cleanJson = cleanJson.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]");
            parsed = JSON.parse(cleanJson);
        } catch (e2) {
            return "";
        }
    }

    const fields: string[] = [];
    Object.entries(parsed).forEach(([key, value]) => {
        const type = inferTypeFromExample(value);
        const optional = value === null || value === undefined ? "?" : "";
        fields.push(`  ${sanitizePropertyName(key)}${optional}: ${type};`);
    });

    if (fields.length === 0) return "";
    return `
interface ${entityName}Payload {
${fields.join("\n")}
}
`;
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