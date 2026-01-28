import * as fs from "fs";
import {
  FileOperation,
  ModuleContent,
  GeneratorOptions,
  toCamelCase,
  sanitizeModuleName,
  normalizeApiUrl,
  processAndMergeModules,
  runGeneratorCLI,
  GenericParam,
  StandardModuleDefinition,
  StandardFunctionDefinition,
  generateStandardModuleContent,
  resolveClientAndPath,
  getCommonPrefix
} from "./generator-utils";

// --- Helpers ---

const extractPathParams = (url: string): string[] => {
  const braceMatches = url.match(/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g);
  if (!braceMatches) return [];
  return [...new Set(braceMatches.map((m) => m.slice(1, -1)))];
};

// --- Main Processing ---

export const processOpenAPI = (spec: any) => {
  const processedModules = new Map<string, any[]>();
  Object.entries(spec.paths).forEach(([path, pathItem]: [string, any]) => {
    Object.entries(pathItem).forEach(([method, operation]: [string, any]) => {
      if (["get", "post", "put", "patch", "delete"].includes(method)) {
        const tag = (operation.tags || ["general"])[0];
        const moduleName = sanitizeModuleName(tag);
        if (!processedModules.has(moduleName)) processedModules.set(moduleName, []);

        processedModules.get(moduleName)!.push({
          method,
          path, // Raw path e.g. /users/{id}
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

const mapToStandardIR = (
  processedModules: Map<string, any[]>,
  filterModules?: string[],
  clientMappings?: Record<string, string>
): StandardModuleDefinition[] => {
  const standardModules: StandardModuleDefinition[] = [];

  processedModules.forEach((items, moduleName) => {
    if (filterModules && !filterModules.includes(moduleName)) return;

    const functions: StandardFunctionDefinition[] = [];
    const generatedFunctions = new Set<string>();

    items.forEach((item) => {
      const { method, path, operation, operationId } = item;

      // Determine Function Name
      const prefix = method.toLowerCase();
      let functionName = "";
      if (operationId) {
        const cleaned = operationId.replace(/^(get|post|put|patch|delete)_?/i, "");
        functionName = `${prefix}_${toCamelCase(cleaned)}`;
      } else {
        const cleanPath = path
          .replace(/\{[^}]+\}/g, "")
          .replace(/\/+/g, "_")
          .replace(/^_|_$/g, "")
          .replace(/[^a-zA-Z0-9_]/g, "");
        functionName = `${prefix}_${toCamelCase(cleanPath)}`;
      }

      if (generatedFunctions.has(functionName)) return;

      // Extract Path Params & Normalize Path
      // Convert /users/{id} -> /users/${id}
      const pathParams = extractPathParams(path);
      let normalizedPath = normalizeApiUrl(path);
      pathParams.forEach((param) => {
        normalizedPath = normalizedPath.replace(`{${param}}`, `\${${param}}`);
      });

      // Query Params
      const queryParams: GenericParam[] = [];
      const hasQueryParams = operation.parameters?.some((p: any) => p.in === "query");
      if (hasQueryParams) {
        operation.parameters.filter((p: any) => p.in === "query").forEach((p: any) => {
          queryParams.push({
            name: p.name,
            required: p.required,
            description: p.description
          });
        });
      }

      // Body Schema
      const bodySchema = operation.requestBody?.content?.["application/json"]?.schema;

      // Resolve Client and Adjust Path
      const { clientName, path: finalPath } = resolveClientAndPath(path, normalizedPath, clientMappings);

      functions.push({
        name: functionName,
        method: method.toLowerCase() as any,
        path: finalPath, // Pre-normalized to ${param} syntax
        description: operation.summary || operation.description,
        pathParams,
        queryParams,
        bodySchema,
        isPostman: false,
        clientName
      });

      generatedFunctions.add(functionName);
    });

    // Auto-Client Proposal
    const paths = functions.map(f => f.path);
    // We need the RAW paths for prefix calculation? 
    // Actually, `functions` has the trimmed path if `resolveClientAndPath` matched.
    // But potential new clients rely on the UNTRIMMED path relative to server root.
    // `resolveClientAndPath` returns `clientName` as undefined if no match.
    // So we should check if we can propose a client for functions WITHOUT a clientName.

    // Group functions by existing client or undefined
    const unassignedFunctions = functions.filter(f => !f.clientName);

    let proposedClient: { name: string; path: string } | undefined;

    if (unassignedFunctions.length > 0) {
      // We need original paths for these? 
      // `item.path` in the loop above was used.
      // But here we only have `StandardFunctionDefinition`. 
      // `StandardFunctionDefinition.path` IS the final path to be used in code. 
      // If client is undefined, it's the full path.
      // So we can use it for prefix detection.

      const unassignedPaths = unassignedFunctions.map(f => f.path);
      const commonPrefix = getCommonPrefix(unassignedPaths);

      // Heuristic: Prefix must be at least 2 chars and not just "/"
      if (commonPrefix && commonPrefix.length > 1 && commonPrefix !== "/") {
        // Generate Candidate Name
        // e.g. /v1/users -> V1_USERS_CLIENT? 
        // e.g. /v1 -> V1_CLIENT
        const nameParts = commonPrefix.split('/').filter(Boolean);
        // Sanitize: replace non-alphanumeric chars (like -) with _
        const sanitizedParts = nameParts.map(p => p.replace(/[^a-zA-Z0-9]/g, '_'));
        const candidateName = sanitizedParts.join('_').toUpperCase() + "_CLIENT";

        proposedClient = { name: candidateName, path: commonPrefix };

        // Apply to functions immediately (assuming it will be created)
        unassignedFunctions.forEach(f => {
          f.clientName = candidateName;
          // Trim the prefix from the function path
          if (f.path.startsWith(commonPrefix)) {
            f.path = f.path.slice(commonPrefix.length);
            if (!f.path.startsWith('/')) f.path = '/' + f.path;
          }
        });
      }
    }

    standardModules.push({
      name: moduleName,
      functions,
      proposedClient
    });
  });

  return standardModules;
};

export const generateOpenApi = async (options: GeneratorOptions): Promise<ModuleContent[] | FileOperation[]> => {
  const { specPath, specData } = options;
  let data = specData;

  if (!data && specPath) {
    if (!fs.existsSync(specPath)) throw new Error(`File not found: ${specPath}`);
    data = JSON.parse(fs.readFileSync(specPath, "utf8"));
  }
  if (!data) throw new Error("No specification data provided");
  if (!data.openapi && !data.swagger) throw new Error("Invalid OpenAPI/Swagger format.");

  console.log(`📋 OpenAPI Version: ${data.openapi || data.swagger}`);

  const processed = processOpenAPI(data);
  const standardModules = mapToStandardIR(processed, options.filterModules, options.clientMappings);
  const modules = generateStandardModuleContent(standardModules, data); // Pass data for Ref resolution
  const operations = processAndMergeModules(modules, options);

  if (options.returnContent) return operations;
  if (!options.dryRun && options.outputDir) console.log(`✓ Modules generated.`);
  return modules;
};

if (require.main === module) {
  runGeneratorCLI("OpenAPI Spec", generateOpenApi);
}