import * as prettier from "prettier";
import {
    Project,
    SyntaxKind,
    SourceFile,
    Statement,
    CommentRange,
    Node,
    ObjectLiteralElementLike,
    PropertyAssignment,
    ArrowFunction,
    FunctionExpression,
    ParameterDeclaration,
    Type,
    TypeNode,
    InterfaceDeclaration,
    TypeAliasDeclaration,
    EnumDeclaration
} from "ts-morph";
import { getInitializerObject } from "@/utils/ast";
import yaml from 'js-yaml';
import { generateOpenApi } from "./generate-openapi-collection";
import { generatePostman } from "./generate-postman-collection";
import { extractBaseUrl, extractCollectionName, ModuleContent } from "./generator-utils";
import { EndpointArg, EndpointArgProperty, EndpointInfo, OpenAPISpec } from "@/types";

interface FunctionDiff {
    name: string;
    status: "new" | "modified" | "deleted" | "unchanged" | "disabled";
    oldContent?: string;
    newContent?: string;
    args?: EndpointArg[];
    requiresAuth?: boolean;
    contentType?: string;
    description?: string;
}

interface AnalysisResult {
    module: string;
    status: "new" | "modified" | "deleted" | "unchanged" | "disabled";
    functions?: FunctionDiff[];
    diff?: string; // Optional: detailed diff
    newContent?: string;
}

// Check for write-disable lock at the module level (top-level statements)
const isModuleWriteDisabled = (sourceFile: SourceFile): boolean => {
    return sourceFile.getStatements().some((s: Statement) =>
        s.getLeadingCommentRanges().some((r: CommentRange) => r.getText().includes("/* write-disable */"))
    );
};

// Normalize code by removing all formatting differences
// This ensures Prettier/formatting changes don't appear as modifications
const normalize = (str: string) =>
    str
        .replace(/\/\*[\s\S]*?\*\//g, "")  // Remove multi-line comments
        .replace(/\/\/.*$/gm, "")           // Remove single-line comments
        .replace(/\r\n/g, "\n")             // Normalize line endings
        .replace(/\s+/g, "")                // Remove ALL whitespace
        .replace(/"/g, "'")                 // Normalize quotes
        .replace(/,}/g, "}")                // Remove trailing commas
        .replace(/;/g, "")                  // Remove all semicolons
        .replace(/\b[a-zA-Z_$][a-zA-Z0-9_$]*\./g, "CLIENT.") // Treat any object property access (CLIENT.post, backend.get) as generic
        .toLowerCase();                     // Case insensitive (for minor casing diffs)

// Helper to format code with Prettier for clean diffs
const formatCode = async (code: string) => {
    try {
        // We use a basic config that should match most TS files
        return await prettier.format(code, {
            parser: "typescript",
            semi: true,
            singleQuote: false,
            trailingComma: "all",
            printWidth: 80,
            tabWidth: 2,
        });
    } catch {
        // Fallback to original code if formatting fails (e.g. syntax error in fragment)
        return code;
    }
};

// Helper to extract all types/interfaces from the source file
const getAllTypes = (sourceFile: SourceFile): Map<string, string> => {
    const types = new Map<string, string>();
    const tryAdd = (decl: InterfaceDeclaration | TypeAliasDeclaration | EnumDeclaration) => {
        try { types.set(decl.getName(), decl.getText()); } catch {}
    };

    sourceFile.getInterfaces().forEach(tryAdd);
    sourceFile.getTypeAliases().forEach(tryAdd);
    sourceFile.getEnums().forEach(tryAdd);
    return types;
};

// Recursive helper to find all referenced types in a text blob
const getReferencedDefs = (text: string, allTypes: Map<string, string>): string => {
    const found = new Set<string>();
    const queue = [text];

    // Perform a breadth-first search for dependencies
    while (queue.length > 0) {
        const currentText = queue.shift()!;

        allTypes.forEach((body, name) => {
            if (!found.has(name)) {
                // Use regex to ensure we match whole words (e.g. "User" shouldn't match "UserType")
                // Escape regex special characters in name
                const regex = new RegExp(`\\b${name}\\b`);
                if (regex.test(currentText)) {
                    found.add(name);
                    queue.push(body); // recursively check this type's body
                }
            }
        });
    }

    // Sort by name to ensure stable output regardless of file order
    const sortedNames = Array.from(found).sort();
    return sortedNames.map(name => allTypes.get(name)).join("\n");
};

const getFunctionsFromModule = (sourceFile: SourceFile, moduleName: string) => {
    const functions = new Map<string, { content: string, disabled: boolean, args: EndpointArg[], requiresAuth?: boolean, contentType?: string, description?: string }>();

    // Extract all local types to check for dependencies
    const allTypes = getAllTypes(sourceFile);

    // The generator creates: export const {ModuleName}Api = { ... }
    // We need to find that variable
    const variableName = `${moduleName}Api`;
    const variableDecl = sourceFile.getVariableDeclaration(variableName);

    if (!variableDecl) return functions;

    const initializer = getInitializerObject(variableDecl);

    if (!initializer) return functions;

    initializer.getProperties().forEach((prop: ObjectLiteralElementLike) => {
        if (Node.isPropertyAssignment(prop)) {
            const assignment = prop as PropertyAssignment;
            const name = assignment.getName();

            const functionBody = assignment.getInitializer()?.getText() || "";

            // Resolve any types used by this function
            const dependencyDefs = getReferencedDefs(functionBody, allTypes);

            // Check for write-disable leading comment and capture JSDoc comments
            const ranges = assignment.getLeadingCommentRanges();
            let disabled = false;
            let leadingComments = "";
            let requiresAuth = false;
            let contentType: string | undefined;
            let description: string | undefined;

            for (const r of ranges) {
                const commentText = r.getText();
                if (commentText.includes("/* write-disable */")) {
                    disabled = true;
                }
                if (commentText.includes("@auth")) {
                    requiresAuth = true;
                }
                const contentTypeMatch = commentText.match(/@contentType\s+(\S+)/);
                if (contentTypeMatch) {
                    contentType = contentTypeMatch[1];
                }
                const descMatch = commentText.match(/@description\s+([\s\S]+?)(?=\s*@(?:auth|contentType)|\s*\*\/)/);
                if (descMatch) {
                    description = descMatch[1].trim();
                }
                // Capture all JSDoc comments (for @auth, @contentType, etc.)
                leadingComments += commentText + "\n";
            }

            // Extract Args
            const args: EndpointArg[] = [];
            const paramDescriptions = new Map<string, string>();

            // Extract @param descriptions from JSDoc
            for (const r of ranges) {
                const commentText = r.getText();
                const paramRegex = /@param\s+(\S+)\s+([^@*]+)/g;
                let paramMatch;
                while ((paramMatch = paramRegex.exec(commentText)) !== null) {
                    paramDescriptions.set(paramMatch[1].trim(), paramMatch[2].trim());
                }
            }

            const func = assignment.getInitializer();
            if (func && (func.getKind() === SyntaxKind.ArrowFunction || func.getKind() === SyntaxKind.FunctionExpression)) {
                const callSig = func as ArrowFunction | FunctionExpression;

                // Helper: resolve sub-properties from a ts-morph Type
                const resolveSubProperties = (type: Type, depth = 0): EndpointArgProperty[] | undefined => {
                    if (depth > 2) return undefined; // Limit nesting depth
                    try {
                        let targetType = type;

                        // If union type, filter out FormData / unknown / null / undefined to find object/interface type
                        if (targetType.isUnion()) {
                            const unionTypes = targetType.getUnionTypes();
                            const nonFormData = unionTypes.find((t) => {
                                const text = t.getText();
                                return text !== "FormData" && text !== "any" && !t.isNull() && !t.isUndefined();
                            });
                            if (nonFormData) {
                                targetType = nonFormData;
                            }
                        }

                        // If array type, get the element type
                        if (targetType.isArray()) {
                            const elem = targetType.getArrayElementType();
                            if (!elem) return undefined;
                            targetType = elem;
                        }

                        // Check if the resolved type is an object with properties
                        if (targetType.isObject()) {
                            const props = targetType.getProperties();
                            if (!props || props.length === 0) return undefined;

                            return props.map((p) => {
                                const declaration = p.getValueDeclaration();
                                const isOptional = declaration && Node.isPropertySignature(declaration)
                                    ? declaration.hasQuestionToken()
                                    : false;
                                const propName = p.getName();
                                const propTypeNode = declaration && Node.isPropertySignature(declaration) ? declaration.getTypeNode() : undefined;
                                const propTypeText = propTypeNode?.getText();

                                const propObj: EndpointArgProperty = {
                                    name: propName,
                                    isOptional: isOptional,
                                    type: propTypeText || undefined
                                };

                                // Check for @param description matching this property
                                const propDesc = paramDescriptions.get(propName);
                                if (propDesc) propObj.description = propDesc;

                                // Recurse: resolve sub-properties for this property's type
                                try {
                                    const propType = declaration?.getType();
                                    if (propType) {
                                        const subProps = resolveSubProperties(propType, depth + 1);
                                        if (subProps && subProps.length > 0) {
                                            propObj.properties = subProps;
                                        }
                                    }
                                } catch {}

                                return propObj;
                            });
                        }
                    } catch {}
                    return undefined;
                };

                callSig.getParameters().forEach((p: ParameterDeclaration) => {
                    const paramName = p.getName();
                    const isOptional = p.isOptional();
                    const typeNode = p.getTypeNode();
                    const arg: EndpointArg = { name: paramName, isOptional };

                    // Attach description from @param if available
                    const paramDesc = paramDescriptions.get(paramName);
                    if (paramDesc) arg.description = paramDesc;

                    // Extract type text
                    if (typeNode) {
                        arg.type = typeNode.getText();

                        let effectiveTypeNode: TypeNode = typeNode;

                        // If union type (e.g. BooksControllerCreatePayload | FormData), find the non-FormData type node
                        if (Node.isUnionTypeNode(typeNode)) {
                            const unionTypes = typeNode.getTypeNodes();
                            const targetMember = unionTypes.find((m) => {
                                const text = m.getText();
                                return text !== "FormData" && text !== "any";
                            });
                            if (targetMember) {
                                effectiveTypeNode = targetMember;
                            }
                        }

                        if (Node.isTypeLiteral(effectiveTypeNode)) {
                            arg.isObject = true;
                            const properties: EndpointArgProperty[] = [];
                            effectiveTypeNode.getMembers().forEach((m) => {
                                if (Node.isPropertySignature(m)) {
                                    const propName = m.getName();
                                    const propTypeNode = m.getTypeNode();
                                    const prop: EndpointArgProperty = {
                                        name: propName,
                                        isOptional: m.hasQuestionToken(),
                                        type: propTypeNode ? propTypeNode.getText() : undefined
                                    };
                                    // Check for @param description matching this property
                                    const propDesc = paramDescriptions.get(propName);
                                    if (propDesc) prop.description = propDesc;

                                    // Resolve sub-properties for complex types
                                    try {
                                        const memberType = m.getType();
                                        if (memberType.isObject()) {
                                            const subProps = resolveSubProperties(memberType, 1);
                                            if (subProps && subProps.length > 0) {
                                                prop.properties = subProps;
                                            }
                                        }
                                    } catch {}

                                    properties.push(prop);
                                }
                            });
                            arg.properties = properties;
                        } else if (Node.isTypeReference(effectiveTypeNode)) {
                            // Attempt to resolve the type using the TypeChecker
                            try {
                                const type = effectiveTypeNode.getType();
                                const resolved = resolveSubProperties(type, 0);
                                if (resolved && resolved.length > 0) {
                                    arg.isObject = true;
                                    arg.properties = resolved;
                                }
                            } catch {
                                // Fallback or ignore if type resolution fails
                            }
                        }
                    }
                    args.push(arg);
                });
            }

            // Combine JSDoc comments, function body and its dependencies
            // Include leading comments so @auth and @contentType can be parsed
            const fullContent = leadingComments + functionBody + "\n" + dependencyDefs;

            functions.set(name, { content: fullContent, disabled, args, requiresAuth, contentType, description });
        }
    });

    return functions;
};

// Exportable main function
export const analyze = async (
    specContent: string,
    existingModules: Map<string, string> = new Map(),
    clientMappings?: Record<string, string>,
    existingManifest?: Record<string, Record<string, EndpointInfo>>
) => {
    try {
        // Robust format detection: handles JSON, JSON-wrapped YAML strings, and raw YAML
        let specData: OpenAPISpec | Record<string, unknown>;
        try {
            const parsed = JSON.parse(specContent);
            if (typeof parsed === 'string') {
                // JSON-encoded string — likely YAML wrapped in JSON (from URL fetch)
                try {
                    specData = JSON.parse(parsed) as Record<string, unknown>;
                } catch {
                    specData = yaml.load(parsed) as Record<string, unknown>;
                }
            } else {
                specData = parsed;
            }
        } catch {
            // Not valid JSON at all — try YAML directly
            specData = yaml.load(specContent) as Record<string, unknown>;
        }
        const baseUrl = extractBaseUrl(specData);
        const collectionName = extractCollectionName(specData);
        console.log("[ANALYZE] Extracted baseURL from spec:", baseUrl);
        console.log("[ANALYZE] Extracted collectionName from spec:", collectionName);

        // 1. Generate new code in-memory (Dry Run)
        let rawModules: ModuleContent[] = [];

        if (specData.openapi || specData.swagger) {
            rawModules = (await generateOpenApi({
                specData,
                dryRun: true,
                clientMappings
            })) as ModuleContent[];
        } else if (specData.info && specData.item) {
            rawModules = (await generatePostman({
                specData,
                dryRun: true,
                clientMappings
            })) as ModuleContent[];
        } else {
            throw new Error("Unknown collection format. Use OpenAPI (json) or Postman Collection v2.1");
        }

        // Aggregate Proposed Clients
        const proposedClients: Record<string, string> = {};
        rawModules.forEach((m) => {
            if (m.proposedClient) {
                proposedClients[m.proposedClient.name] = m.proposedClient.path;
            }
        });

        // Normalize to { name, content }
        const newModules = rawModules.map((m) => {
            return { name: m.name, content: m.content };
        });

        // 3. Compare and Analyze
        const analysis: AnalysisResult[] = [];
        const project = new Project({ useInMemoryFileSystem: true });

        // Check for New, Modified, Unchanged
        // Pre-load all modules into project to allow type resolution across files
        for (const mod of newModules) {
            project.createSourceFile(`${mod.name}.ts`, mod.content, { overwrite: true });
        }

        for (const mod of newModules) {
            const existingContent = existingModules.get(mod.name);

            if (!existingContent) {
                // For new modules, extract functions from the new content
                const sourceFileNew = project.getSourceFileOrThrow(`${mod.name}.ts`);
                const newFuncs = getFunctionsFromModule(sourceFileNew, mod.name);

                const functionDiffs: FunctionDiff[] = [];
                for (const [name] of newFuncs) {
                    const formattedNew = await formatCode(newFuncs.get(name)!.content);
                    const args = newFuncs.get(name)!.args;
                    const requiresAuth = newFuncs.get(name)!.requiresAuth;
                    const contentType = newFuncs.get(name)!.contentType;
                    const description = newFuncs.get(name)!.description;
                    functionDiffs.push({ name, status: "new", newContent: formattedNew, args, requiresAuth, contentType, description });
                }

                analysis.push({
                    module: mod.name,
                    status: "new",
                    newContent: mod.content,
                    functions: functionDiffs.length > 0 ? functionDiffs : undefined
                });
            } else {
                const sourceFileExisting = project.createSourceFile("existing.ts", existingContent, { overwrite: true });

                if (isModuleWriteDisabled(sourceFileExisting)) {
                    analysis.push({
                        module: mod.name,
                        status: "disabled"
                    });
                } else {
                    const isModified = normalize(existingContent) !== normalize(mod.content);

                    const result: AnalysisResult = {
                        module: mod.name,
                        status: isModified ? "modified" : "unchanged",
                        newContent: mod.content,
                    };

                    const sourceFileNew = project.createSourceFile("new.ts", mod.content, { overwrite: true });
                    const existingFuncs = getFunctionsFromModule(sourceFileExisting, mod.name);
                    
                    // Filter existingFuncs based on manifest:
                    // Treat any function NOT in the manifest as if it doesn't exist in the DB
                    if (existingManifest && existingManifest[mod.name]) {
                        const selectedFnNames = new Set(Object.keys(existingManifest[mod.name]));
                        for (const fnName of existingFuncs.keys()) {
                            if (!selectedFnNames.has(fnName)) {
                                existingFuncs.delete(fnName);
                            }
                        }
                    }

                    const newFuncs = getFunctionsFromModule(sourceFileNew, mod.name);

                    const functionDiffs: FunctionDiff[] = [];
                    const processedExisting = new Set<string>();

                    // Check new and modified
                    for (const [name, newData] of newFuncs) {
                        const newBody = newData.content;
                        const existingData = existingFuncs.get(name);

                        if (!existingData) {
                            // New function - format it
                            const formattedNew = await formatCode(newBody);
                            functionDiffs.push({
                                name,
                                status: "new",
                                newContent: formattedNew,
                                args: newData.args,
                                requiresAuth: newData.requiresAuth,
                                contentType: newData.contentType,
                                description: newData.description
                            });
                        } else {
                            const { content: existingBody, disabled } = existingData;
                            if (disabled) {
                                const formattedOld = await formatCode(existingBody);
                                const formattedNew = await formatCode(newBody);
                                functionDiffs.push({ name, status: "disabled", oldContent: formattedOld, newContent: formattedNew, args: newData.args, description: newData.description });
                                processedExisting.add(name);
                            } else if (normalize(existingBody) !== normalize(newBody)) {
                                const formattedOld = await formatCode(existingBody);
                                const formattedNew = await formatCode(newBody);

                                if (formattedOld === formattedNew) {
                                    functionDiffs.push({ name, status: "unchanged", args: newData.args, description: newData.description });
                                    processedExisting.add(name);
                                } else {
                                    functionDiffs.push({
                                        name,
                                        status: "modified",
                                        oldContent: formattedOld,
                                        newContent: formattedNew,
                                        args: newData.args,
                                        requiresAuth: newData.requiresAuth,
                                        contentType: newData.contentType,
                                        description: newData.description
                                    });
                                    processedExisting.add(name);
                                }
                            } else {
                                functionDiffs.push({
                                    name,
                                    status: "unchanged",
                                    args: newData.args,
                                    requiresAuth: newData.requiresAuth,
                                    contentType: newData.contentType,
                                    description: newData.description
                                });
                                processedExisting.add(name);
                            }
                        }
                    }

                    // Check deleted (functions in existing but not in new)
                    for (const [name, data] of existingFuncs) {
                        if (!processedExisting.has(name) && !newFuncs.has(name)) {
                            if (data.disabled) {
                                functionDiffs.push({ name, status: "disabled" });
                            } else {
                                const formattedOld = await formatCode(data.content);
                                functionDiffs.push({ name, status: "deleted", oldContent: formattedOld });
                            }
                        }
                    }

                    if (functionDiffs.length > 0) {
                        result.functions = functionDiffs;

                        const hasRealChanges = functionDiffs.some(f =>
                            ["new", "modified", "deleted"].includes(f.status)
                        );

                        if (!hasRealChanges) {
                            result.status = "unchanged";
                        } else {
                            result.status = "modified";
                        }
                    }

                    analysis.push(result);
                }
            }

            // Remove from map to track deletions
            existingModules.delete(mod.name);
        }

        // Check for Deleted (remaining items in map)
        existingModules.forEach((_, name) => {
            analysis.push({ module: name, status: "deleted" });
        });

        // Return result
        return { diffs: analysis, proposedClients, baseUrl, collectionName };

    } catch (error) {
        console.error("Analysis failed:", error);
        throw error;
    }
};
