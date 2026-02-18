/* eslint-disable @typescript-eslint/no-explicit-any */
import * as fs from "fs";
import * as path from "path";
import * as prettier from "prettier";
import { Project, SyntaxKind, PropertyAssignment } from "ts-morph";
// @ts-ignore
const { API_DEFINITIONS_DIR } = require("../paths");
import yaml from 'js-yaml';
import { generateOpenApi } from "./generate-openapi-collection";
import { generatePostman } from "./generate-postman-collection";
import { extractBaseUrl, extractCollectionName } from "./generator-utils";

interface FunctionDiff {
    name: string;
    status: "new" | "modified" | "deleted" | "unchanged" | "disabled";
    oldContent?: string;
    newContent?: string;
    args?: any[];
    requiresAuth?: boolean;
    contentType?: string;
}

interface AnalysisResult {
    module: string;
    status: "new" | "modified" | "deleted" | "unchanged" | "disabled";
    functions?: FunctionDiff[];
    diff?: string; // Optional: detailed diff
}

// Check for write-disable lock at the module level (top-level statements)
const isModuleWriteDisabled = (sourceFile: any) => {
    return sourceFile.getStatements().some((s: any) =>
        s.getLeadingCommentRanges().some((r: any) => r.getText().includes("/* write-disable */"))
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
    } catch (e) {
        // Fallback to original code if formatting fails (e.g. syntax error in fragment)
        return code;
    }
};

// Helper to extract all types/interfaces from the source file
const getAllTypes = (sourceFile: any) => {
    const types = new Map<string, string>();
    // Try-catch or check existence of methods just to be safe, though ts-morph SourceFile should have them
    const tryAdd = (decl: any) => {
        try { types.set(decl.getName(), decl.getText()); } catch (e) { }
    };

    if (sourceFile.getInterfaces) sourceFile.getInterfaces().forEach(tryAdd);
    if (sourceFile.getTypeAliases) sourceFile.getTypeAliases().forEach(tryAdd);
    if (sourceFile.getEnums) sourceFile.getEnums().forEach(tryAdd);
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

const getFunctionsFromModule = (sourceFile: any, moduleName: string) => {
    const functions = new Map<string, { content: string, disabled: boolean, args: any[], requiresAuth?: boolean, contentType?: string }>();

    // Extract all local types to check for dependencies
    const allTypes = getAllTypes(sourceFile);

    // The generator creates: export const {ModuleName}Api = { ... }
    // We need to find that variable
    const variableName = `${moduleName}Api`;
    const variableDecl = sourceFile.getVariableDeclaration(variableName);

    if (!variableDecl) return functions;

    const initializer = variableDecl.getInitializerIfKind(SyntaxKind.ObjectLiteralExpression);
    if (!initializer) return functions;

    initializer.getProperties().forEach((prop: any) => {
        if (prop.getKind() === SyntaxKind.PropertyAssignment) {
            const assignment = prop as PropertyAssignment;
            const name = assignment.getName();

            const functionBody = assignment.getInitializer()?.getText() || "";

            // Resolve any types used by this function
            const dependencyDefs = getReferencedDefs(functionBody, allTypes);

            // Check for write-disable leading comment and capture JSDoc comments
            const ranges = assignment.getLeadingCommentRanges ? assignment.getLeadingCommentRanges() : [];
            let disabled = false;
            let leadingComments = "";
            let requiresAuth = false;
            let contentType: string | undefined;

            // ts-morph PropertyAssignment has getLeadingCommentRanges
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
                // Capture all JSDoc comments (for @auth, @contentType, etc.)
                leadingComments += commentText + "\n";
            }

            // Extract Args
            const args: any[] = [];
            const func = assignment.getInitializer();
            if (func && (func.getKind() === SyntaxKind.ArrowFunction || func.getKind() === SyntaxKind.FunctionExpression)) {
                const callSig = func as any;
                callSig.getParameters().forEach((p: any) => {
                    const paramName = p.getName();
                    const isOptional = p.isOptional();
                    const typeNode = p.getTypeNode();
                    const arg: any = { name: paramName, isOptional };

                    if (typeNode) {
                        if (typeNode.getKind() === SyntaxKind.TypeLiteral) {
                            arg.isObject = true;
                            arg.properties = [];
                            typeNode.getMembers().forEach((m: any) => {
                                if (m.getKind() === SyntaxKind.PropertySignature) {
                                    arg.properties.push({
                                        name: m.getName(),
                                        isOptional: m.hasQuestionToken()
                                    });
                                }
                            });
                        } else if (typeNode.getKind() === SyntaxKind.TypeReference) {
                            // Attempt to resolve the type using the TypeChecker
                            try {
                                const type = typeNode.getType();
                                if (type.isObject()) {
                                    arg.isObject = true;
                                    arg.properties = [];
                                    const props = type.getProperties();
                                    props.forEach((prop: any) => {
                                        const declaration = prop.getValueDeclaration();
                                        const isOptional = declaration
                                            ? (declaration as any).hasQuestionToken?.()
                                            : false;

                                        arg.properties.push({
                                            name: prop.getName(),
                                            isOptional: isOptional
                                        });
                                    });
                                }
                            } catch (e) {
                                // Fallback or ignore if type resolution fails
                                // console.warn("Could not resolve type for", paramName);
                            }
                        }
                    }
                    args.push(arg);
                });
            }

            // Combine JSDoc comments, function body and its dependencies
            // Include leading comments so @auth and @contentType can be parsed
            const fullContent = leadingComments + functionBody + "\n" + dependencyDefs;

            functions.set(name, { content: fullContent, disabled, args, requiresAuth, contentType });
        }
    });

    return functions;
};

// Exportable main function
export const analyze = async (specContent: string, existingModules: Map<string, string> = new Map(), clientMappings?: Record<string, string>) => {
    try {
        // Robust format detection: handles JSON, JSON-wrapped YAML strings, and raw YAML
        let specData: any;
        try {
            const parsed = JSON.parse(specContent);
            if (typeof parsed === 'string') {
                // JSON-encoded string — likely YAML wrapped in JSON (from URL fetch)
                // Try parsing the inner string as JSON first, then YAML
                try {
                    specData = JSON.parse(parsed);
                } catch {
                    specData = yaml.load(parsed) as any;
                }
            } else {
                specData = parsed;
            }
        } catch {
            // Not valid JSON at all — try YAML directly
            specData = yaml.load(specContent) as any;
        }
        const baseUrl = extractBaseUrl(specData);
        const collectionName = extractCollectionName(specData);
        console.log("[ANALYZE] Extracted baseURL from spec:", baseUrl);
        console.log("[ANALYZE] Extracted collectionName from spec:", collectionName);

        // 1. Generate new code in-memory (Dry Run)
        // rawModules now contains proposedClient info
        let rawModules: any[] = [];

        if (specData.openapi || specData.swagger) {
            rawModules = await generateOpenApi({
                specData,
                dryRun: true,
                clientMappings
            }) as any[];
        } else if (specData.info && specData.item) {
            rawModules = await generatePostman({
                specData,
                dryRun: true,
                clientMappings
            }) as any[];
        } else {
            throw new Error("Unknown collection format. Use OpenAPI (json) or Postman Collection v2.1");
        }

        // Aggregate Proposed Clients
        const proposedClients: Record<string, string> = {};
        rawModules.forEach((m: any) => {
            if (m.proposedClient) {
                proposedClients[m.proposedClient.name] = m.proposedClient.path;
            }
        });

        // Normalize to { name, content }
        const newModules = rawModules.map((m: any) => {
            if (m.filePath) {
                const name = path.basename(m.filePath, '.ts');
                return { name, content: m.content };
            }
            return { name: m.name, content: m.content };
        });

        // 3. Compare and Analyze
        const analysis: AnalysisResult[] = [];
        const project = new Project({ useInMemoryFileSystem: true });

        // Check for New, Modified, Unchanged
        // Pre-load all modules into project to allow type resolution across files
        for (const mod of newModules) {
            // Use a virtual path. We assume flat structure for resolution simplicity in this context
            // or we'd need the real file paths. Most generators used here output to flat dir or known structure.
            project.createSourceFile(`${mod.name}.ts`, mod.content, { overwrite: true });
        }

        for (const mod of newModules) {
            const existingContent = existingModules.get(mod.name);

            if (!existingContent) {
                // For new modules, extract functions from the new content
                // It's already in the project, retrieve it
                const sourceFileNew = project.getSourceFileOrThrow(`${mod.name}.ts`);
                const newFuncs = getFunctionsFromModule(sourceFileNew, mod.name);

                const functionDiffs: FunctionDiff[] = [];
                for (const [name, _] of newFuncs) {
                    const formattedNew = await formatCode(newFuncs.get(name)!.content);
                    const args = newFuncs.get(name)!.args;
                    const requiresAuth = newFuncs.get(name)!.requiresAuth;
                    const contentType = newFuncs.get(name)!.contentType;
                    functionDiffs.push({ name, status: "new", newContent: formattedNew, args, requiresAuth, contentType });
                }

                analysis.push({
                    module: mod.name,
                    status: "new",
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
                    };

                    if (isModified || true) { // Always check for disabled functions even if content seems same
                        const sourceFileNew = project.createSourceFile("new.ts", mod.content, { overwrite: true });
                        const existingFuncs = getFunctionsFromModule(sourceFileExisting, mod.name);
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
                                    contentType: newData.contentType
                                });
                            } else {
                                const { content: existingBody, disabled } = existingData;
                                if (disabled) {
                                    const formattedOld = await formatCode(existingBody);
                                    const formattedNew = await formatCode(newBody);
                                    functionDiffs.push({ name, status: "disabled", oldContent: formattedOld, newContent: formattedNew, args: newData.args });
                                    processedExisting.add(name);
                                } else if (normalize(existingBody) !== normalize(newBody)) {
                                    // It is modified based on normalization
                                    // Format both to see if the visual diff is actually clean
                                    const formattedOld = await formatCode(existingBody);
                                    const formattedNew = await formatCode(newBody);

                                    // Safety check: if formatted versions are identical, mark as unchanged
                                    if (formattedOld === formattedNew) {
                                        functionDiffs.push({ name, status: "unchanged", args: newData.args });
                                        processedExisting.add(name);
                                    } else {
                                        functionDiffs.push({
                                            name,
                                            status: "modified",
                                            oldContent: formattedOld,
                                            newContent: formattedNew,
                                            args: newData.args,
                                            requiresAuth: newData.requiresAuth,
                                            contentType: newData.contentType
                                        });
                                        processedExisting.add(name);
                                    }
                                } else {
                                    functionDiffs.push({
                                        name,
                                        status: "unchanged",
                                        args: newData.args,
                                        requiresAuth: newData.requiresAuth,
                                        contentType: newData.contentType
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

                            // INTELLIGENT STATUS UPDATE:
                            // If we have function diffs, check if ANY are actually modified/new/deleted
                            // If all are "unchanged" or "disabled", then the module is effectively unchanged
                            const hasRealChanges = functionDiffs.some(f =>
                                ["new", "modified", "deleted"].includes(f.status)
                            );

                            if (!hasRealChanges) {
                                result.status = "unchanged";
                            } else {
                                result.status = "modified";
                            }
                        }
                    } else {
                        // For unchanged modules, still list the functions so user can see them
                        const sourceFileExisting = project.createSourceFile("existing_unchanged.ts", existingContent, { overwrite: true });
                        const existingFuncs = getFunctionsFromModule(sourceFileExisting, mod.name);

                        const functionDiffs: FunctionDiff[] = [];
                        existingFuncs.forEach((data, name) => {
                            if (data.disabled) {
                                functionDiffs.push({ name, status: "disabled", args: data.args });
                            } else {
                                functionDiffs.push({
                                    name,
                                    status: "unchanged",
                                    args: data.args,
                                    requiresAuth: data.requiresAuth,
                                    contentType: data.contentType
                                });
                            }
                        });

                        if (functionDiffs.length > 0) {
                            result.functions = functionDiffs;
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


