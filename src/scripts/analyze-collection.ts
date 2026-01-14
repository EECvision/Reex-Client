/* eslint-disable @typescript-eslint/no-explicit-any */
import * as fs from "fs";
import * as path from "path";
import * as prettier from "prettier";
import { Project, SyntaxKind, PropertyAssignment } from "ts-morph";
// @ts-ignore
const { API_DEFINITIONS_DIR } = require("../paths");
import { generateOpenApi } from "./generate-openapi-collection";
import { generatePostman } from "./generate-postman-collection";

interface FunctionDiff {
    name: string;
    status: "new" | "modified" | "deleted" | "unchanged" | "disabled";
    oldContent?: string;
    newContent?: string;
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
    const functions = new Map<string, { content: string, disabled: boolean }>();

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

            // Combine function body and its dependencies for comparison
            // We append dependencies so that logic changes in the function are prioritized visually if we were to diff
            // but here we just normalization & equality check.
            const fullContent = functionBody + "\n" + dependencyDefs;

            // Check for write-disable leading comment
            const ranges = assignment.getLeadingCommentRanges ? assignment.getLeadingCommentRanges() : []; // Safe access
            // ts-morph PropertyAssignment has getLeadingCommentRanges
            const disabled = ranges.some((r: any) => r.getText().includes("/* write-disable */"));

            functions.set(name, { content: fullContent, disabled });
        }
    });

    return functions;
};

const analyzeCollection = async (specPath: string) => {
    try {
        const apiDir = API_DEFINITIONS_DIR;

        // Read file to detect type
        if (!fs.existsSync(specPath)) {
            throw new Error(`File not found: ${specPath}`);
        }

        const fileContent = fs.readFileSync(specPath, 'utf-8');
        const specData = JSON.parse(fileContent);

        // 1. Generate new code in-memory (Dry Run)
        let newModules: { name: string; content: string }[] = [];

        let rawModules: any[] = [];

        if (specData.openapi || specData.swagger) {
            console.log("📋 Detected OpenAPI spec");
            rawModules = await generateOpenApi({
                specData,
                dryRun: true,
            }) as any[];
        } else if (specData.info && specData.item) {
            console.log("📋 Detected Postman collection");
            rawModules = await generatePostman({
                specData,
                dryRun: true
            }) as any[];
        } else {
            throw new Error("Unknown collection format. Use OpenAPI (json) or Postman Collection v2.1");
        }

        // Normalize to { name, content }
        newModules = rawModules.map((m: any) => {
            if (m.filePath) {
                // FileOperation format
                const name = path.basename(m.filePath, '.ts');
                return { name, content: m.content };
            }
            return m; // Assume already in correct format
        });

        // 2. Read existing modules
        const existingFiles = fs.existsSync(apiDir)
            ? fs.readdirSync(apiDir).filter((f) => f.endsWith(".ts"))
            : [];
        const existingModules = new Map<string, string>();

        existingFiles.forEach((file) => {
            const name = file.replace(".ts", "");
            const content = fs.readFileSync(path.join(apiDir, file), "utf8");
            existingModules.set(name, content);
        });

        // 3. Compare and Analyze
        const analysis: AnalysisResult[] = [];
        const project = new Project({ useInMemoryFileSystem: true });

        // Check for New, Modified, Unchanged
        for (const mod of newModules) {
            const existingContent = existingModules.get(mod.name);

            if (!existingContent) {
                // For new modules, extract functions from the new content
                const sourceFileNew = project.createSourceFile(`${mod.name}_new.ts`, mod.content, { overwrite: true });
                const newFuncs = getFunctionsFromModule(sourceFileNew, mod.name);

                const functionDiffs: FunctionDiff[] = [];
                for (const [name, _] of newFuncs) {
                    const formattedNew = await formatCode(newFuncs.get(name)!.content);
                    functionDiffs.push({ name, status: "new", newContent: formattedNew });
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
                                functionDiffs.push({ name, status: "new", newContent: formattedNew });
                            } else {
                                const { content: existingBody, disabled } = existingData;
                                if (disabled) {
                                    const formattedOld = await formatCode(existingBody);
                                    const formattedNew = await formatCode(newBody);
                                    functionDiffs.push({ name, status: "disabled", oldContent: formattedOld, newContent: formattedNew });
                                    processedExisting.add(name);
                                } else if (normalize(existingBody) !== normalize(newBody)) {
                                    // It is modified based on normalization
                                    // Format both to see if the visual diff is actually clean
                                    const formattedOld = await formatCode(existingBody);
                                    const formattedNew = await formatCode(newBody);

                                    // Safety check: if formatted versions are identical, mark as unchanged
                                    // This handles cases where normalize() sees a change but prettier makes them identical (rare but possible)
                                    if (formattedOld === formattedNew) {
                                        functionDiffs.push({ name, status: "unchanged" });
                                    } else {
                                        functionDiffs.push({
                                            name,
                                            status: "modified",
                                            oldContent: formattedOld,
                                            newContent: formattedNew
                                        });
                                    }
                                    processedExisting.add(name);
                                } else {
                                    functionDiffs.push({ name, status: "unchanged" });
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
                        }
                    } else {
                        // For unchanged modules, still list the functions so user can see them
                        const sourceFileExisting = project.createSourceFile("existing_unchanged.ts", existingContent, { overwrite: true });
                        const existingFuncs = getFunctionsFromModule(sourceFileExisting, mod.name);

                        const functionDiffs: FunctionDiff[] = [];
                        existingFuncs.forEach((data, name) => {
                            if (data.disabled) {
                                functionDiffs.push({ name, status: "disabled" });
                            } else {
                                functionDiffs.push({ name, status: "unchanged" });
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

        // Output result
        console.log(JSON.stringify(analysis, null, 2));

    } catch (error) {
        console.error("Analysis failed:", error);
        process.exit(1);
    }
};

// CLI Entry
if (require.main === module) {
    const args = process.argv.slice(2);
    if (args.length === 0) {
        console.error("Usage: ts-node analyze-collection.ts path/to/spec.json");
        process.exit(1);
    }

    analyzeCollection(args[0]);
}
