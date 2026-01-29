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
  getCommonPrefix,
  proposeClientForFunctions,
  calculateFunctionName
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
        functionName = calculateFunctionName(method, operationId);
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
    const proposedClient = proposeClientForFunctions(functions);

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