
import fs from "fs";
import path from "path";
import {
    Project,
    SyntaxKind,
    SourceFile,
    VariableDeclaration,
    FunctionExpression,
    ArrowFunction,
    TypeNode,
    ParameterDeclaration,
    ObjectLiteralExpression,
    PropertyAssignment,
    StringLiteral,
    NoSubstitutionTemplateLiteral,
    TemplateExpression,
    CallExpression,
    PropertyAccessExpression,
    TypeLiteralNode,
    InterfaceDeclaration,
    TypeAliasDeclaration
} from "ts-morph";

interface EndpointMetadata {
    client: string;
    url: string;
    requiresAuth?: boolean;
}

interface EndpointArg {
    name: string;
    isOptional: boolean;
    type?: string;
    isObject?: boolean;
    properties?: any[]; // Recursive type
}

interface ModuleExports {
    [key: string]: {
        args: EndpointArg[];
        client: string;
        url: string;
        requiresAuth?: boolean;
    }
}

class ProjectService {
    private project: Project | null;

    constructor() {
        this.project = null;
    }

    /**
     * Generates the API manifest from the target directory.
     * @param targetDir - The directory containing API definitions.
     * @returns The generated manifest object.
     */
    generateManifest(targetDir: string): Record<string, ModuleExports> {
        if (!fs.existsSync(targetDir)) {
            console.warn(`[ProjectService] Warning: Target directory not found: ${targetDir}`);
            return {};
        }

        this.project = new Project({
            compilerOptions: {
                allowJs: true,
                declaration: true,
                emitDeclarationOnly: true,
            },
            skipAddingFilesFromTsConfig: true,
        });

        const files = fs.readdirSync(targetDir).filter((f) => f.endsWith(".ts"));
        const apiManifest: Record<string, ModuleExports> = {};

        for (const file of files) {
            const moduleName = file.replace(".ts", "");
            const filePath = path.join(targetDir, file);
            if (!this.project) continue;
            const sourceFile: SourceFile = this.project.addSourceFileAtPath(filePath);
            const moduleExports: ModuleExports = {};
            const exports = sourceFile.getExportedDeclarations();
            let count = 0;

            for (const [_, declarations] of exports) {
                for (const declaration of declarations) {
                    const kind = declaration.getKind();

                    // Helper to extract metadata from function body
                    const extractMetadata = (funcNode: ArrowFunction | FunctionExpression): EndpointMetadata => {
                        let client = "UNKNOWN_CLIENT";
                        let url = "";

                        // Look for: const url = "/path";
                        const variableStatements = funcNode.getBody().getDescendantsOfKind(SyntaxKind.VariableStatement);
                        for (const stmt of variableStatements) {
                            const decl = stmt.getDeclarations()[0];
                            if (decl.getName() === "url") {
                                const init = decl.getInitializer();
                                if (init) {
                                    if (init.getKind() === SyntaxKind.StringLiteral || init.getKind() === SyntaxKind.NoSubstitutionTemplateLiteral) {
                                        url = (init as StringLiteral | NoSubstitutionTemplateLiteral).getLiteralValue();
                                    } else if (init.getKind() === SyntaxKind.TemplateExpression) {
                                        // Handle `path${query}` -> extract "path"
                                        url = (init as TemplateExpression).getHead().getLiteralText();
                                    }
                                }
                            }
                        }

                        // Look for: handleApiCall(() => CLIENT.method(url), ...)
                        const callExprs = funcNode.getBody().getDescendantsOfKind(SyntaxKind.CallExpression);
                        for (const call of callExprs) {
                            if (call.getExpression().getText() === "handleApiCall") {
                                // First arg is arrow function: () => CLIENT.method(...)
                                const firstArg = call.getArguments()[0];
                                if (firstArg && (firstArg.getKind() === SyntaxKind.ArrowFunction || firstArg.getKind() === SyntaxKind.FunctionExpression)) {
                                    const innerCall = (firstArg as ArrowFunction).getBody(); // CLIENT.method(url)
                                    if (innerCall.getKind() === SyntaxKind.CallExpression) {
                                        const expr = (innerCall as CallExpression).getExpression(); // CLIENT.method (PropertyAccessExpression)
                                        if (expr.getKind() === SyntaxKind.PropertyAccessExpression) {
                                            client = (expr as PropertyAccessExpression).getExpression().getText(); // CLIENT
                                        }
                                    }
                                }
                            }
                        }

                        // Check for JSDoc @auth
                        let requiresAuth = false;
                        const jsDocs = funcNode.getJsDocs();
                        for (const doc of jsDocs) {
                            if (doc.getText().includes("@auth")) {
                                requiresAuth = true;
                            }
                        }

                        return { client, url, requiresAuth };
                    };


                    if (kind === SyntaxKind.VariableDeclaration) {
                        const initializer = (declaration as VariableDeclaration).getInitializer();
                        if (initializer && initializer.getKind() === SyntaxKind.ObjectLiteralExpression) {
                            const properties = (initializer as ObjectLiteralExpression).getProperties();
                            for (const property of properties) {
                                if (property.getKind() === SyntaxKind.PropertyAssignment) {
                                    const methodName = (property as PropertyAssignment).getName();
                                    const init = (property as PropertyAssignment).getInitializer();
                                    if (init && (init.getKind() === SyntaxKind.ArrowFunction || init.getKind() === SyntaxKind.FunctionExpression)) {
                                        const funcInit = init as ArrowFunction | FunctionExpression;
                                        const params = funcInit.getParameters().map((p) => this.getParameterDetails(p, sourceFile));

                                        const metadata = extractMetadata(funcInit);

                                        // Check for @auth in leading comments on the PropertyAssignment
                                        let requiresAuth = false;
                                        const fullText = sourceFile.getFullText();
                                        const leadingComments = property.getLeadingCommentRanges();
                                        for (const comment of leadingComments) {
                                            const commentText = fullText.substring(comment.getPos(), comment.getEnd());
                                            if (commentText.includes("@auth")) {
                                                requiresAuth = true;
                                                break;
                                            }
                                        }

                                        moduleExports[methodName] = { args: params, ...metadata, requiresAuth };
                                        count++;
                                    }
                                }
                            }
                        }
                    }
                }
            }

            if (count) {
                apiManifest[moduleName] = moduleExports;
            }
        }

        return apiManifest;
    }

    /**
     * Reads the project config to get BaseURLs.
     * @param configDir - Path to src/api-services/config
     */
    getProjectConfig(configDir: string): any {
        if (!fs.existsSync(configDir)) return {};
        const filePath = path.join(configDir, "index.ts");
        if (!fs.existsSync(filePath)) return {};

        const project = new Project({ skipAddingFilesFromTsConfig: true });
        const sourceFile = project.addSourceFileAtPath(filePath);
        const config: any = { clients: {} };

        // 1. Get baseURL
        const baseURLDecl = sourceFile.getVariableDeclaration("baseURL");
        if (baseURLDecl) {
            const init = baseURLDecl.getInitializer();
            // Handle: import.meta.env.V || "http..."
            if (init && init.getKind() === SyntaxKind.BinaryExpression) {
                config.baseURL = (init as any).getRight().getText().replace(/"/g, '');
            } else if (init && init.getKind() === SyntaxKind.StringLiteral) {
                config.baseURL = (init as StringLiteral).getLiteralValue();
            }
        }

        // 2. Get Clients and their baseURLs
        const exports = sourceFile.getExportedDeclarations();
        for (const [name, declarations] of exports) {
            if (name.endsWith("_CLIENT") || name === "BASE_CLIENT") {
                // Inspect the axios.create({ baseURL: ... })
                const decl = declarations[0]; // VariableDeclaration
                if (decl.getKind() === SyntaxKind.VariableDeclaration) {
                    const initializer = (decl as VariableDeclaration).getInitializer(); // CallExpression axios.create()
                    if (initializer && initializer.getKind() === SyntaxKind.CallExpression) {
                        const arg = (initializer as CallExpression).getArguments()[0]; // ObjectLiteral
                        if (arg && arg.getKind() === SyntaxKind.ObjectLiteralExpression) {
                            const baseURLProp = (arg as ObjectLiteralExpression).getProperty("baseURL");
                            if (baseURLProp && baseURLProp.getKind() === SyntaxKind.PropertyAssignment) {
                                const initializer = (baseURLProp as PropertyAssignment).getInitializer();
                                if (!initializer) continue;
                                let urlVal = initializer.getText();
                                // Evaluate "baseURL + '/v1'" -> we can't easily eval, but we can return the raw string or try to simplistically resolve it.
                                // e.g. "baseURL + "/v1""
                                if (urlVal.startsWith("baseURL +")) {
                                    const suffix = urlVal.split('+')[1].trim().replace(/"/g, '').replace(/'/g, '');
                                    config.clients[name] = (config.baseURL || "") + suffix;
                                } else if (urlVal === "baseURL") {
                                    config.clients[name] = config.baseURL;
                                } else {
                                    config.clients[name] = urlVal.replace(/"/g, '');
                                }
                            }
                        }
                    }
                }
            }
        }
        return config;
    }

    getParameterDetails(param: ParameterDeclaration, sourceFile: SourceFile): EndpointArg {
        const name = param.getName();
        const isOptional = param.isOptional();
        const typeNode = param.getTypeNode();
        const expanded = this.expandTypeRecursively(typeNode, sourceFile);

        if (expanded) return { name, isOptional, ...expanded };
        return { name, isOptional };
    }

    expandTypeRecursively(typeNode: TypeNode | undefined, sourceFile: SourceFile): any {
        if (!typeNode) return null;

        const kind = typeNode.getKind();

        if (kind === SyntaxKind.TypeLiteral) {
            const props = (typeNode as TypeLiteralNode).getProperties();
            return {
                isObject: true,
                properties: props.map((prop) => {
                    const name = prop.getName();
                    const optional = prop.hasQuestionToken();
                    const propTypeNode = prop.getTypeNode();
                    const nested = this.expandTypeRecursively(propTypeNode, sourceFile);
                    if (nested) return { name, isOptional: optional, ...nested };
                    return { name, isOptional: optional, type: prop.getType().getText() };
                }),
            };
        }

        if (kind === SyntaxKind.TypeReference) {
            const typeName = (typeNode as any).getTypeName().getText();
            const declaration =
                sourceFile.getInterfaces().find((i) => i.getName() === typeName) ||
                sourceFile.getTypeAliases().find((t) => t.getName() === typeName);

            if (!declaration) return { type: typeName };

            let props: any[] = [];
            if (declaration.getKind() === SyntaxKind.InterfaceDeclaration) {
                props = (declaration as InterfaceDeclaration).getProperties();
            } else if (declaration.getKind() === SyntaxKind.TypeAliasDeclaration) {
                const tn = (declaration as TypeAliasDeclaration).getTypeNode();
                if (tn && tn.getKind() === SyntaxKind.TypeLiteral) {
                    props = (tn as TypeLiteralNode).getProperties();
                }
            }

            return {
                isObject: true,
                properties: props.map((prop) => {
                    const name = prop.getName();
                    const optional = prop.hasQuestionToken();
                    const propTypeNode = prop.getTypeNode();
                    const nested = this.expandTypeRecursively(propTypeNode, sourceFile);
                    if (nested) return { name, isOptional: optional, ...nested };
                    return { name, isOptional: optional, type: prop.getType().getText() };
                }),
            };
        }

        return null;
    }

    /**
     * Enumerates modules in the target directory
     */
    getModules(targetDir: string): Record<string, boolean> {
        if (!fs.existsSync(targetDir)) return {};
        const files = fs.readdirSync(targetDir).filter((f) => f.endsWith(".ts"));
        const modules: Record<string, boolean> = {};
        files.forEach(f => {
            const name = f.replace(".ts", "");
            modules[name] = true;
        });
        return modules;
    }
}

const projectService = new ProjectService();
export default projectService;
