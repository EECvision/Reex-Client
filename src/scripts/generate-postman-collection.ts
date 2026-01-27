// scripts/generate-postman-collection.ts
import * as fs from "fs";
import * as path from "path";
import { Project, SyntaxKind, PropertyAssignment } from "ts-morph";

// --- Types ---
interface GeneratorOptions {
  specPath?: string;
  specData?: any;
  outputDir?: string;
  dryRun?: boolean;
  filterModules?: string[];
  filterFunctions?: Map<string, string[]>;
  returnContent?: boolean;
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
  return str
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .trim()
    .split(/\s+/)
    .map((word, index) => {
      const lower = word.toLowerCase();
      return index === 0
        ? lower
        : lower.charAt(0).toUpperCase() + lower.slice(1);
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
  // Convert to camelCase for filenames
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
  const matches = url.match(/:([a-zA-Z_][a-zA-Z0-9_]*)/g);
  return matches ? matches.map((m) => m.slice(1)) : [];
};

const inferTypeFromExample = (value: any): string => {
  if (value === null || value === undefined) return "any";
  if (typeof value === "string") return "string";
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  if (Array.isArray(value)) {
    if (value.length > 0) {
      return `${inferTypeFromExample(value[0])}[]`;
    }
    return "any[]";
  }
  if (typeof value === "object") return "Record<string, any>";
  return "any";
};

const generateTypesFromBody = (body: any, entityName: string): string => {
  if (!body || !body.raw) return "";

  let parsed;
  try {
    parsed = JSON.parse(body.raw);
  } catch (e) {
    try {
      // If strict parse fails, try cleaning comments (fallback)
      // Note: This regex can corrupt URLs (https://), so we only use it if strict parse failed
      let cleanJson = body.raw
        .replace(/\/\/.*$/gm, "") // Remove single-line comments
        .replace(/\/\*[\s\S]*?\*\//g, ""); // Remove multi-line comments

      // Remove trailing commas before closing braces/brackets
      cleanJson = cleanJson.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]");
      parsed = JSON.parse(cleanJson);
    } catch (e2) {
      // Both failed
      return "";
    }
  }

  const fields: string[] = [];

  Object.entries(parsed).forEach(([key, value]) => {
    const type = inferTypeFromExample(value);
    const optional = value === null || value === undefined ? "?" : "";
    fields.push(`  ${key}${optional}: ${type};`);
  });

  if (fields.length === 0) return "";

  return `
interface ${entityName}Payload {
${fields.join("\n")}
}
`;

};

const generateQueryParamsType = (
  queryParams: any[],
  entityName: string
): string => {
  if (!queryParams || queryParams.length === 0) return "";

  const fields = queryParams.map((param) => {
    const description = param.description ? ` // ${param.description}` : "";
    return `  ${param.key}?: string;${description}`;
  });

  return `
interface ${entityName}Params {
${fields.join("\n")}
}
`;
};

const generateFunctionName = (method: string, name: string): string => {
  const prefix = method.toLowerCase();
  const cleanName = toCamelCase(name.replace(/\s+/g, "_"));
  return `${prefix}_${cleanName}`;
};

const generateFunctionSignature = (
  request: any,
  functionName: string,
  entityName: string,
  hasPayloadType: boolean
): string => {
  if (!request || !request.url) {
    console.warn(`⚠️  Skipping function with missing URL data`);
    return "";
  }

  const method = request.method.toLowerCase();
  const url =
    typeof request.url === "string"
      ? request.url
      : request.url.raw || request.url.path?.join("/") || "";

  if (!url) {
    console.warn(`⚠️  Skipping function ${functionName} with empty URL`);
    return "";
  }

  const pathParams = extractPathParams(url);
  const hasBody = request.body && request.body.raw;
  const needsPayload =
    hasBody && (method === "post" || method === "put" || method === "patch");
  const queryParams =
    typeof request.url === "object" ? request.url.query || [] : [];
  const hasQueryParams = queryParams.length > 0;

  const params: Array<{ name: string; type: string; isInterface: boolean }> =
    [];

  // Add path parameters (primitives)
  pathParams.forEach((param) => {
    params.push({ name: param, type: "string", isInterface: false });
  });

  // Add payload parameter (interface)
  if (needsPayload) {
    params.push({
      name: "payload",
      type: hasPayloadType ? `${entityName}Payload` : "any",
      isInterface: true,
    });
  }

  // Add query params parameter
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
    // Multiple parameters - ALL destructured together in one object
    const destructuredNames = params.map((p) => p.name).join(", ");
    const typeAnnotations = params
      .map((p) => `${p.name}: ${p.type}`)
      .join(", ");
    paramSignature = `{${destructuredNames}}: {${typeAnnotations}}`;
  }

  return `  ${functionName}: async (${paramSignature}): Promise<any> => {`;
};

const generateFunctionBody = (
  request: any,
  functionName: string,
  entityName: string
): string => {
  if (!request || !request.url) {
    return "";
  }

  const method = request.method.toLowerCase();
  let url = "";

  if (typeof request.url === "string") {
    url = request.url;
  } else if (request.url.raw) {
    url = request.url.raw;
  } else if (request.url.path) {
    url = "/" + request.url.path.join("/");
  }

  if (!url) {
    return "";
  }

  // Remove query parameters from URL (they'll be handled by constructQueryParams)
  const cleanUrl = url
    .replace(/\{\{BASE_URL\}\}\/?/g, "")
    .replace(/^https?:\/\/[^\/]+/g, "")
    .replace(/\?.*$/, ""); // Remove everything after ?

  // Ensure URL starts with /
  let finalUrl = cleanUrl.startsWith("/") ? cleanUrl : `/${cleanUrl}`;

  // Remove /api prefix
  finalUrl = finalUrl.replace(/^\/api(?=\/|$)/i, "");

  // Remove version prefix (e.g. /v1, /v2)
  finalUrl = finalUrl.replace(/^\/v\d+(?=\/|$)/i, "");

  // Ensure it still starts with / if we removed everything or if it became empty
  if (!finalUrl.startsWith("/")) {
    finalUrl = "/" + finalUrl;
  }

  const pathParams = extractPathParams(finalUrl);
  const hasBody = request.body && request.body.raw;
  const queryParams =
    typeof request.url === "object" ? request.url.query || [] : [];
  const hasQueryParams = queryParams.length > 0;

  // Replace path parameters
  let urlWithParams = finalUrl;
  pathParams.forEach((param) => {
    urlWithParams = urlWithParams.replace(`:${param}`, `\${${param}}`);
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

  if (method === "get") {
    lines.push(
      `    const res = await handleApiCall(() => BASE_CLIENT.get(url), "${functionName}");`
    );
    lines.push(`    return res.data;`);
  } else if (method === "post") {
    const payloadParam = hasBody ? ", payload" : "";
    lines.push(
      `    const res = await handleApiCall(() => BASE_CLIENT.post(url${payloadParam}), "${functionName}");`
    );
    lines.push(`    return res.data;`);
  } else if (method === "put") {
    const payloadParam = hasBody ? ", payload" : "";
    lines.push(
      `    const res = await handleApiCall(() => BASE_CLIENT.put(url${payloadParam}), "${functionName}");`
    );
    lines.push(`    return res.data;`);
  } else if (method === "patch") {
    const payloadParam = hasBody ? ", payload" : "";
    lines.push(
      `    const res = await handleApiCall(() => BASE_CLIENT.patch(url${payloadParam}), "${functionName}");`
    );
    lines.push(`    return res.data;`);
  } else if (method === "delete") {
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

// Flatten collection into a module map
export const processPostmanCollection = (collectionData: any) => {
  const processedModules = new Map<string, any[]>();

  // Recursive item processor
  const processItem = (item: any, folderName?: string) => {
    if (item.item) {
      // It's a folder
      const folder = folderName || item.name;
      item.item.forEach((subItem: any) => processItem(subItem, folder));
    } else if (item.request) {
      // It's a request
      const folder = folderName || "general";
      const moduleName = sanitizeModuleName(folder);

      if (!processedModules.has(moduleName)) {
        processedModules.set(moduleName, []);
      }

      processedModules.get(moduleName)!.push(item);
    }
  };

  // Process all items
  if (collectionData.item) {
    collectionData.item.forEach((item: any) => processItem(item));
  }

  return processedModules;
};

export const generateModuleContent = (
  processedModules: Map<string, any[]>,
  filterModules?: string[]
): ModuleContent[] => {
  const generatedModules: ModuleContent[] = [];

  processedModules.forEach((requests, moduleName) => {
    // Filter if needed
    if (filterModules && !filterModules.includes(moduleName)) {
      return;
    }

    const typeDefinitions: string[] = [];
    const functionDefinitions: string[] = [];
    const generatedFunctions = new Set<string>();
    const generatedTypes = new Set<string>();

    requests.forEach((item) => {
      const request = item.request;
      if (!request || !request.url || !request.method) return;

      const requestName = item.name;
      const entityRequestName = toPascalCase(requestName);
      const functionName = generateFunctionName(request.method, requestName);

      if (generatedFunctions.has(functionName)) return;

      const method = request.method.toLowerCase();
      const hasBody = request.body && request.body.raw;
      const needsPayload = hasBody && (method === "post" || method === "put" || method === "patch");
      let hasPayloadType = false;

      // Generate types from body if needed
      if (needsPayload) {
        try {
          const bodyType = generateTypesFromBody(request.body, entityRequestName);
          if (bodyType) {
            if (!generatedTypes.has(entityRequestName + "Payload")) {
              typeDefinitions.push(bodyType);
              generatedTypes.add(entityRequestName + "Payload");
            }
            // Mark as having payload type regardless of whether it was just added or existed
            hasPayloadType = true;
          }
        } catch (e) {
          console.warn(`⚠️  Could not parse body for: ${requestName}`);
        }
      }

      // Generate query params type
      if (typeof request.url === "object" && request.url.query) {
        const queryType = generateQueryParamsType(
          request.url.query,
          entityRequestName
        );
        if (queryType && !generatedTypes.has(entityRequestName + "Params")) {
          typeDefinitions.push(queryType);
          generatedTypes.add(entityRequestName + "Params");
        }
      }

      const signature = generateFunctionSignature(
        request,
        functionName,
        entityRequestName,
        hasPayloadType
      );
      const body = generateFunctionBody(request, functionName, entityRequestName);

      if (signature && body) {
        generatedFunctions.add(functionName);
        functionDefinitions.push(`${signature}\n${body}\n`);
      }
    });

    const imports = [
      `import { BASE_CLIENT } from "../config";`,
      `import { ${generatedFunctions.size > 0 && Array.from(generatedFunctions).some(fn => functionDefinitions.find(def => def.includes("constructQueryParams")))
        ? "constructQueryParams, "
        : ""
      }handleApiCall } from "../config/utils";`
    ];

    // Better detecting usage logic
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

export const generatePostman = async (options: GeneratorOptions): Promise<ModuleContent[] | FileOperation[]> => {
  const { specPath, specData, outputDir, dryRun, filterModules, filterFunctions } = options;

  let data = specData;
  if (!data && specPath) {
    if (!fs.existsSync(specPath)) {
      throw new Error(`Collection file not found: ${specPath}`);
    }
    data = JSON.parse(fs.readFileSync(specPath, "utf8"));
  }

  if (!data) {
    throw new Error("No collection data provided");
  }

  const processedModules = processPostmanCollection(data);
  const modules = generateModuleContent(processedModules, filterModules);

  if (options.returnContent) {
    const operations: FileOperation[] = [];

    modules.forEach(mod => {
      operations.push({
        type: 'write',
        filePath: path.join('definitions', `${mod.name}.ts`),
        content: mod.content
      });
    });

    // Index.ts is now managed by the Bridge watcher automatically.
    // We do NOT need to generate it here.

    return operations;
  }

  if (!dryRun && outputDir) {
    const apiDir = path.resolve(outputDir, "definitions");
    const apiServicesDir = outputDir;

    if (!fs.existsSync(apiDir)) {
      fs.mkdirSync(apiDir, { recursive: true });
    }

    const project = new Project();

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
            const propsToRemove = initializer.getProperties().filter(prop => {
              if (prop.getKind() === SyntaxKind.PropertyAssignment) {
                const name = (prop as PropertyAssignment).getName();
                return !functionsToInclude.includes(name);
              }
              return true; // Remove non-property assignments
            });

            propsToRemove.forEach(prop => prop.remove());
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
                // Optional: Handling "deleted in spec" but preserved via lock (see OpenAPI logic)
              }
            });
          }
        }

        // Now remove unused interfaces
        // Get the text of the remaining API object to check for interface references
        const remainingCode = variableDecl?.getInitializer()?.getText() || "";

        // Find all interface declarations
        const interfaces = sourceFile.getInterfaces();
        interfaces.forEach(iface => {
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

    // updateIndex is now redundant as Bridge watcher handles it.
    console.log(`✓ Modules generated. Bridge will update index.ts.`);
  }

  return modules;
};

// CLI Entry
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error("✗ Error: Postman collection file path is required");
    process.exit(1);
  }

  const specPath = path.resolve(args[0]);
  const { API_SERVICES_DIR } = require("../paths");
  const outputDir = API_SERVICES_DIR;


  // Parse --only
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

  generatePostman({
    specPath,
    outputDir,
    dryRun: false,
    filterModules,
    filterFunctions
  }).catch((err) => {
    console.error("✗ Error:", err.message);
    process.exit(1);
  });
}
