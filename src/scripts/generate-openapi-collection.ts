// scripts/generate-openapi-collection.ts

import * as fs from "fs";
import * as path from "path";
import { Project, SyntaxKind, PropertyAssignment } from "ts-morph";

// --- Types ---
interface GeneratorOptions {
  specPath?: string;
  specData?: any;
  outputDir?: string;
  dryRun?: boolean;
  filterModules?: string[]; // If provided, only process these modules
  filterFunctions?: Map<string, string[]>; // If provided, only update these functions in the modules
  returnContent?: boolean; // If true, returns file operations instead of writing to disk
}

export interface FileOperation {
  type: 'write' | 'delete';
  filePath: string;
  content?: string;
}


interface ModuleContent {
  name: string;
  content: string;
}

// --- Helper Functions ---
const capitalize = (str: string): string =>
  str.charAt(0).toUpperCase() + str.slice(1);

const toCamelCase = (str: string): string => {
  const words = str
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .trim()
    .split(/\s+/);

  return words
    .map((word, index) => {
      if (index === 0) {
        return word.charAt(0).toLowerCase() + word.slice(1);
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join("");
};

const toPascalCase = (str: string): string => {
  return str
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .trim()
    .split(/\s+/)
    .map((word) => {
      const lower = word.toLowerCase();
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join("");
};

const sanitizeModuleName = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+|-+/g, " ")
    .trim()
    .split(" ")
    .map((word, index) =>
      index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join("");
};

const extractPathParams = (url: string): string[] => {
  const braceMatches = url.match(/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g);
  if (!braceMatches) return [];
  return [...new Set(braceMatches.map((m) => m.slice(1, -1)))];
};

const resolveSchema = (schema: any, spec: any): any => {
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

const convertOpenAPITypeToTS = (schema: any, spec?: any): string => {
  if (!schema) return "any";

  const resolvedSchema = spec ? resolveSchema(schema, spec) : schema;
  if (!resolvedSchema) return "any";

  if (resolvedSchema.type === "string") return "string";
  if (resolvedSchema.type === "number" || resolvedSchema.type === "integer")
    return "number";
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
          const sanitizedKey = sanitizePropertyName(key);
          return `  ${sanitizedKey}${required ? "" : "?"}: ${type};`;
        }
      );
      return `{\n${fields.join("\n")}\n}`;
    }
    return "Record<string, any>";
  }

  return "any";
};

const generateTypesFromOpenAPISchema = (
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
      const sanitizedKey = sanitizePropertyName(key);
      const isRequired = required.includes(key);
      const type = convertOpenAPITypeToTS(prop, spec);
      const optional = isRequired ? "" : "?";
      const description = prop.description ? ` // ${prop.description}` : "";
      fields.push(`  ${sanitizedKey}${optional}: ${type};${description}`);
    }
  );

  if (fields.length === 0) return "";

  return `
interface ${entityName}${suffix} {
${fields.join("\n")}
}
`;
};

const sanitizePropertyName = (name: string): string => {
  if (/[^a-zA-Z0-9_$]/.test(name)) {
    return `"${name}"`;
  }
  return name;
};

const generateQueryParamsType = (
  queryParams: any[],
  entityName: string
): string => {
  if (!queryParams || queryParams.length === 0) return "";

  const fields = queryParams.map((param) => {
    const paramName = param.name;
    const sanitizedName = sanitizePropertyName(paramName);
    const description = param.description ? ` // ${param.description}` : "";
    const required = param.required ? "" : "?";
    return `  ${sanitizedName}${required}: string;${description}`;
  });

  return `
interface ${entityName}Params {
${fields.join("\n")}
}
`;
};

const generateFunctionName = (
  method: string,
  path: string,
  operationId?: string
): string => {
  const prefix = method.toLowerCase();

  if (operationId) {
    const cleaned = operationId.replace(/^(get|post|put|patch|delete)_?/i, "");
    const functionName = toCamelCase(cleaned);
    return `${prefix}_${functionName}`;
  }

  const cleanPath = path
    .replace(/\{[^}]+\}/g, "")
    .replace(/\/+/g, "_")
    .replace(/^_|_$/g, "")
    .replace(/[^a-zA-Z0-9_]/g, "");
  const functionName = toCamelCase(cleanPath);
  return `${prefix}_${functionName}`;
};

const generateFunctionSignature = (
  method: string,
  url: string,
  functionName: string,
  entityName: string,
  hasPayloadType: boolean,
  hasQueryParams: boolean,
  pathParams: string[]
): string => {
  const methodLower = method.toLowerCase();
  const needsPayload =
    hasPayloadType &&
    (methodLower === "post" ||
      methodLower === "put" ||
      methodLower === "patch");

  const params: Array<{ name: string; type: string; isInterface: boolean }> =
    [];

  if (pathParams.length > 0) {
    pathParams.forEach((param) => {
      params.push({ name: param, type: "string", isInterface: false });
    });
  }

  if (needsPayload) {
    params.push({
      name: "payload",
      type: hasPayloadType ? `${entityName}Payload` : "any",
      isInterface: true,
    });
  }

  if (hasQueryParams) {
    params.push({
      name: "params",
      type: `${entityName}Params`,
      isInterface: true,
    });
  }

  let paramSignature = "";

  if (params.length === 0) {
    paramSignature = "";
  } else if (params.length === 1) {
    const param = params[0];
    if (param.isInterface) {
      paramSignature = `${param.name}: ${param.type}`;
    } else {
      paramSignature = `{${param.name}}: {${param.name}: ${param.type}}`;
    }
  } else {
    const destructuredNames = params.map((p) => p.name).join(", ");
    const typeAnnotations = params
      .map((p) => `${p.name}: ${p.type}`)
      .join(", ");
    paramSignature = `{${destructuredNames}}: {${typeAnnotations}}`;
  }

  return `  ${functionName}: async (${paramSignature}): Promise<any> => {`;
};

const generateFunctionBody = (
  method: string,
  url: string,
  functionName: string,
  hasBody: boolean,
  hasQueryParams: boolean
): string => {
  const methodLower = method.toLowerCase();

  const cleanUrl = url
    .replace(/\{\{BASE_URL\}\}\/?/g, "")
    .replace(/^https?:\/\/[^\/]+/g, "")
    .replace(/\?.*$/, "");

  let finalUrl = cleanUrl.startsWith("/") ? cleanUrl : `/${cleanUrl}`;

  // Remove /api prefix
  finalUrl = finalUrl.replace(/^\/api(?=\/|$)/i, "");

  // Remove version prefix (e.g. /v1, /v2)
  finalUrl = finalUrl.replace(/^\/v\d+(?=\/|$)/i, "");

  // Ensure it still starts with / if we removed everything or if it became empty (though unlikely to be empty for valid api)
  if (!finalUrl.startsWith("/")) {
    finalUrl = "/" + finalUrl;
  }
  const pathParams = extractPathParams(finalUrl);

  let urlWithParams = finalUrl;
  pathParams.forEach((param) => {
    urlWithParams = urlWithParams.replace(`{${param}}`, `\${${param}}`);
  });

  const lines: string[] = [];

  if (hasQueryParams) {
    lines.push(
      `    const queryString = params ? constructQueryParams(params) : '';`
    );
    lines.push(`    const url = \`${urlWithParams}\${queryString}\`;`);
  } else {
    lines.push(`    const url = \`${urlWithParams}\`;`);
  }

  if (methodLower === "get") {
    lines.push(
      `    const res = await handleApiCall(() => BASE_CLIENT.get(url), "${functionName}");`
    );
    lines.push(`    return res.data;`);
  } else if (methodLower === "post") {
    const payloadParam = hasBody ? ", payload" : "";
    lines.push(
      `    const res = await handleApiCall(() => BASE_CLIENT.post(url${payloadParam}), "${functionName}");`
    );
    lines.push(`    return res.data;`);
  } else if (methodLower === "put") {
    const payloadParam = hasBody ? ", payload" : "";
    lines.push(
      `    const res = await handleApiCall(() => BASE_CLIENT.put(url${payloadParam}), "${functionName}");`
    );
    lines.push(`    return res.data;`);
  } else if (methodLower === "patch") {
    const payloadParam = hasBody ? ", payload" : "";
    lines.push(
      `    const res = await handleApiCall(() => BASE_CLIENT.patch(url${payloadParam}), "${functionName}");`
    );
    lines.push(`    return res.data;`);
  } else if (methodLower === "delete") {
    lines.push(
      `    await handleApiCall(() => BASE_CLIENT.delete(url), "${functionName}");`
    );
  }

  lines.push(`  },`);

  return lines.join("\n");
};

// --- Preservation Logic ---

const getLockedFunctions = (sourceFile: any, moduleName: string): Map<string, string> => {
  const lockedFunctions = new Map<string, string>();
  const variableDecl = sourceFile.getVariableDeclaration(`${moduleName}Api`);

  if (variableDecl) {
    const initializer = variableDecl.getInitializerIfKind(SyntaxKind.ObjectLiteralExpression);
    if (initializer) {
      initializer.getProperties().forEach((prop: any) => {
        if (prop.getKind() === SyntaxKind.PropertyAssignment) {
          const assignment = prop as PropertyAssignment;
          const name = assignment.getName();

          // Check for write-disable on the property
          const ranges = assignment.getLeadingCommentRanges ? assignment.getLeadingCommentRanges() : [];
          const isLocked = ranges.some((r: any) => r.getText().includes("/* write-disable */"));

          if (isLocked) {
            // getFullText() to include comments/formatting
            lockedFunctions.set(name, assignment.getFullText());
          }
        }
      });
    }
  }
  return lockedFunctions;
};

// --- Core Logic ---

// Exported for analysis script
export const processOpenAPI = (spec: any) => {
  const processedModules = new Map<string, any[]>();

  Object.entries(spec.paths).forEach(([path, pathItem]: [string, any]) => {
    Object.entries(pathItem).forEach(([method, operation]: [string, any]) => {
      if (["get", "post", "put", "patch", "delete"].includes(method)) {
        const tags = operation.tags || ["general"];
        const tag = tags[0];
        const moduleName = sanitizeModuleName(tag);

        if (!processedModules.has(moduleName)) {
          processedModules.set(moduleName, []);
        }

        processedModules.get(moduleName)!.push({
          method,
          path,
          operation,
          operationId: operation.operationId,
          summary: operation.summary || operation.description,
          spec,
        });
      }
    });
  });

  return processedModules;
};

// Exported for analysis script
export const generateModuleContent = (
  processedModules: Map<string, any[]>,
  filterModules?: string[]
): ModuleContent[] => {
  const generatedModules: ModuleContent[] = [];

  processedModules.forEach((items, moduleName) => {
    // Filter if needed
    if (filterModules && !filterModules.includes(moduleName)) {
      return;
    }

    const entityName = capitalize(moduleName.replace(/-/g, ""));
    const typeDefinitions: string[] = [];
    const functionDefinitions: string[] = [];
    const generatedFunctions = new Set<string>();
    const generatedTypes = new Set<string>();

    items.forEach((item) => {
      const { method, path, operation, operationId, summary, spec } = item;
      const entityRequestName = toPascalCase(operationId || summary || path);
      const functionName = generateFunctionName(method, path, operationId);

      if (generatedFunctions.has(functionName)) {
        return;
      }

      const pathParams = extractPathParams(path);
      const hasRequestBody =
        operation.requestBody?.content?.["application/json"]?.schema;
      const hasQueryParams = operation.parameters?.some(
        (p: any) => p.in === "query"
      );

      let hasPayloadType = false;

      if (hasRequestBody) {
        const bodyType = generateTypesFromOpenAPISchema(
          operation.requestBody.content["application/json"].schema,
          entityRequestName,
          "Payload",
          spec
        );
        if (bodyType) {
          if (!generatedTypes.has(entityRequestName + "Payload")) {
            typeDefinitions.push(bodyType);
            generatedTypes.add(entityRequestName + "Payload");
          }
          // Mark as having payload type regardless of whether it was just added or existed
          hasPayloadType = true;
        }
      }

      if (hasQueryParams) {
        const queryParams = operation.parameters.filter(
          (p: any) => p.in === "query"
        );
        const queryType = generateQueryParamsType(
          queryParams,
          entityRequestName
        );
        if (queryType && !generatedTypes.has(entityRequestName + "Params")) {
          typeDefinitions.push(queryType);
          generatedTypes.add(entityRequestName + "Params");
        }
      }

      const signature = generateFunctionSignature(
        method,
        path,
        functionName,
        entityRequestName,
        hasPayloadType,
        hasQueryParams,
        pathParams
      );
      const body = generateFunctionBody(
        method,
        path,
        functionName,
        hasPayloadType,
        hasQueryParams
      );

      generatedFunctions.add(functionName);
      functionDefinitions.push(`${signature}\n${body}\n`);
    });

    // Detect usage
    const usesQueryParams = functionDefinitions.some(def => def.includes("constructQueryParams"));
    const utilsImports = [];
    utilsImports.push("handleApiCall");
    if (usesQueryParams) {
      utilsImports.unshift("constructQueryParams");
    }

    const templateContent = `/* eslint-disable @typescript-eslint/no-explicit-any */
import { BASE_CLIENT } from "../config";
import { ${utilsImports.join(", ")} } from "../config/utils";

// --- Types ---
${typeDefinitions.join("\n")}

// --- API Definition ---

export const ${moduleName}Api = {
${functionDefinitions.join("\n")}
};
`;
    generatedModules.push({ name: moduleName, content: templateContent });
  });

  return generatedModules;
};

// --- Main Entry ---

export const generateOpenApi = async (options: GeneratorOptions): Promise<ModuleContent[] | FileOperation[]> => {
  const { specPath, specData, outputDir, dryRun, filterModules, filterFunctions } = options;

  let data = specData;
  if (!data && specPath) {
    if (!fs.existsSync(specPath)) {
      throw new Error(`Specification file not found: ${specPath}`);
    }
    data = JSON.parse(fs.readFileSync(specPath, "utf8"));
  }

  if (!data) {
    throw new Error("No specification data provided");
  }

  // Validate OpenAPI format
  const isOpenAPI = data.openapi || data.swagger;
  if (!isOpenAPI) {
    throw new Error(
      "Invalid OpenAPI specification format. Must contain 'openapi' or 'swagger' field."
    );
  }

  console.log(`📋 Detected OpenAPI version: ${data.openapi || data.swagger}`);

  const processedModules = processOpenAPI(data);
  const modules = generateModuleContent(processedModules, filterModules);

  if (options.returnContent) {
    const operations: FileOperation[] = [];

    // Modules
    modules.forEach(mod => {
      operations.push({
        type: 'write',
        filePath: path.join('definitions', `${mod.name}.ts`),
        content: mod.content
      });
    });
    return operations;
  }

  if (!dryRun && outputDir) {
    // Ensure directories exist
    const apiDir = path.resolve(outputDir, "definitions");
    const apiServicesDir = outputDir;

    if (!fs.existsSync(apiDir)) {
      fs.mkdirSync(apiDir, { recursive: true });
    }

    const project = new Project();

    // Write files
    modules.forEach((mod) => {
      const filePath = path.join(apiDir, `${mod.name}.ts`);

      // 1. Identify Locked Functions in EXISTING file (if it exists)
      const lockedFunctions = new Map<string, string>();
      if (fs.existsSync(filePath)) {
        try {
          const existingContent = fs.readFileSync(filePath, "utf8");
          const tempSource = project.createSourceFile(`${mod.name}_existing_temp.ts`, existingContent, { overwrite: true });
          const locked = getLockedFunctions(tempSource, mod.name);
          locked.forEach((val, key) => lockedFunctions.set(key, val));
        } catch (e) {
          console.warn(`Failed to read existing file for preservation: ${e}`);
        }
      }

      // 2. Force Include Locked Functions (prevent deletion)
      const functionsToInclude = filterFunctions?.get(mod.name);
      if (functionsToInclude && functionsToInclude.length > 0) {
        // Add any locked functions to the include list if not present
        lockedFunctions.forEach((_, name) => {
          if (!functionsToInclude.includes(name)) {
            functionsToInclude.push(name);
            console.log(`🔒 Preserving locked function (preventing deletion): ${name}`);
          }
        });
      }

      if (functionsToInclude && functionsToInclude.length > 0) {
        // Filter the generated content to only include selected functions
        const sourceFile = project.createSourceFile(`${mod.name}_temp.ts`, mod.content, { overwrite: true });
        const variableDecl = sourceFile.getVariableDeclaration(`${mod.name}Api`);

        if (variableDecl) {
          const initializer = variableDecl.getInitializerIfKind(SyntaxKind.ObjectLiteralExpression);
          if (initializer) {
            // Remove properties not in the filter list
            const propsToRemove = initializer.getProperties().filter((prop: any) => {
              if (prop.getKind() === SyntaxKind.PropertyAssignment) {
                const name = (prop as PropertyAssignment).getName();
                return !functionsToInclude.includes(name);
              }
              return true; // Remove non-property assignments
            });

            propsToRemove.forEach((prop: any) => prop.remove());
          }
        }

        // 3. Overwrite Generated Content with Locked Content (prevent update)
        if (variableDecl && lockedFunctions.size > 0) {
          const initializer = variableDecl.getInitializerIfKind(SyntaxKind.ObjectLiteralExpression);
          if (initializer) {
            lockedFunctions.forEach((content, name) => {
              const prop = initializer.getProperty(name);
              if (prop && prop.getKind() === SyntaxKind.PropertyAssignment) {
                (prop as PropertyAssignment).replaceWithText(content.trim());
                console.log(`🔒 Restored locked content for: ${name}`);
              } else if (!prop) {
                // If it was forced-included but didn't exist in new spec (deleted in spec),
                // we might need to ADD it back if we want to support "Keep deleted functions that are locked"
                // But 'functionsToInclude' only filters what is ALREADY in mod.content.
                // If mod.content (new spec) doesn't have it, 'prop' will be undefined.
                // We should add it back.
                initializer.addPropertyAssignment({
                  name: name,
                  initializer: content.split(":").slice(1).join(":").trim() // This is risky parsing. 
                  // Better to just add the full text? No, addPropertyAssignment takes structure.
                  // Or just insertText?
                });
                console.log(`🔒 Restored locked function (was deleted in spec): ${name}`);
                // Actually, re-injecting full text safely is tricky with ts-morph addPropertyAssignment structure.
                // Let's stick to overwrite existing first. Handling "deleted in spec" restoration needs more complex logic 
                // (appending text to object literal).
                // For now, if it's not in new spec, it won't be in 'variableDecl' initial properties, so we skip restoring it 
                // UNLESS we explicitly append it. 
              }
            });
          }
        }

        // Now remove unused interfaces
        // Get the text of the remaining API object to check for interface references
        const remainingCode = variableDecl?.getInitializer()?.getText() || "";

        // Find all interface declarations
        const interfaces = sourceFile.getInterfaces();
        interfaces.forEach((iface) => {
          const ifaceName = iface.getName();
          // Check if interface name is referenced in the remaining code
          if (!remainingCode.includes(ifaceName)) {
            iface.remove();
          }
        });

        const filteredContent = sourceFile.getFullText();
        fs.writeFileSync(filePath, filteredContent);
        console.log(`✓ Created ${mod.name}.ts (${functionsToInclude.length} functions selected)`);
      } else {
        // Write full module content
        fs.writeFileSync(filePath, mod.content);
        console.log(`✓ Created/Updated ${mod.name}.ts`);
      }
    });

    // Update index.ts
    // updateIndex is now redundant as Bridge watcher handles it.
    console.log(`✓ Modules generated. Bridge will update index.ts.`);
    console.log(`✓ Updated index.ts`);
  }

  return modules;
};

// Start script if run directly
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error("✗ Error: OpenAPI specification file path is required");
    process.exit(1);
  }

  const specPath = path.resolve(args[0]);
  const { API_SERVICES_DIR } = require("../paths");
  const outputDir = API_SERVICES_DIR;


  // Basic CLI argument parsing for filters
  // Usage: node script.js path/to/spec.json --only module1,module2
  const filterIndex = args.indexOf("--only");
  let filterModules: string[] | undefined;
  if (filterIndex !== -1 && args[filterIndex + 1]) {
    filterModules = args[filterIndex + 1].split(",");
    console.log(`🔍 Filtering modules: ${filterModules.join(", ")}`);
  }

  // Parse --functions
  const functionsIndex = args.indexOf("--functions");
  let filterFunctions: Map<string, string[]> | undefined;
  if (functionsIndex !== -1 && args[functionsIndex + 1]) {
    try {
      const functionsObj = JSON.parse(args[functionsIndex + 1]);
      filterFunctions = new Map(Object.entries(functionsObj));
      console.log(`🔍 Filtering functions:`, Object.keys(functionsObj));
    } catch (e) {
      console.error("Failed to parse --functions JSON:", e);
    }
  }

  generateOpenApi({
    specPath,
    outputDir,
    dryRun: false,
    filterModules,
    filterFunctions,
  }).catch((err) => {
    console.error("✗ Error:", err.message);
    process.exit(1);
  });
}
