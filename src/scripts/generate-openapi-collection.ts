import * as fs from "fs";
import {
  FileOperation,
  ModuleContent,
  GeneratorOptions,
  toCamelCase,
  sanitizeModuleName,
  normalizeApiUrl,
  extractBaseUrl,
  processAndMergeModules,
  runGeneratorCLI,
  GenericParam,
  StandardModuleDefinition,
  StandardFunctionDefinition,
  generateStandardModuleContent,
  resolveClientAndPath,
  proposeClientForFunctions,
  calculateFunctionName
} from "./generator-utils";
import { OpenAPISpec, OpenAPIOperation } from "@/types";

// --- Helpers ---

const extractPathParams = (url: string): string[] => {
  const braceMatches = url.match(/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g);
  if (!braceMatches) return [];
  return [...new Set(braceMatches.map((m) => m.slice(1, -1)))];
};

// --- Main Processing ---

export const processOpenAPI = (spec: OpenAPISpec | Record<string, unknown>) => {
  const processedModules = new Map<string, Array<{
    method: string;
    path: string;
    operation: OpenAPIOperation;
    operationId?: string;
    summary?: string;
    spec: OpenAPISpec;
  }>>();

  const paths = (spec.paths || {}) as Record<string, Record<string, OpenAPIOperation>>;

  Object.entries(paths).forEach(([path, pathItem]) => {
    Object.entries(pathItem).forEach(([method, operation]) => {
      if (["get", "post", "put", "patch", "delete"].includes(method.toLowerCase())) {
        const op = operation as OpenAPIOperation;
        const tag = (op.tags && op.tags.length > 0 ? op.tags[0] : "general") || "general";
        const moduleName = sanitizeModuleName(tag);
        if (!processedModules.has(moduleName)) processedModules.set(moduleName, []);

        processedModules.get(moduleName)!.push({
          method,
          path, // Raw path e.g. /users/{id}
          operation: op,
          operationId: op.operationId,
          summary: op.summary || op.description,
          spec: spec as OpenAPISpec,
        });
      }
    });
  });
  return processedModules;
};

const mapToStandardIR = (
  processedModules: Map<string, Array<{
    method: string;
    path: string;
    operation: OpenAPIOperation;
    operationId?: string;
    summary?: string;
    spec: OpenAPISpec;
  }>>,
  filterModules?: string[],
  clientMappings?: Record<string, string>,
  baseUrl?: string
): StandardModuleDefinition[] => {
  const standardModules: StandardModuleDefinition[] = [];

  processedModules.forEach((items, moduleName) => {
    if (filterModules && !filterModules.includes(moduleName)) return;

    const functions: StandardFunctionDefinition[] = [];
    const generatedFunctions = new Set<string>();

    items.forEach((item) => {
      const { method, path, operation, operationId, spec } = item;

      // Determine Function Name
      const prefix = String(method).toLowerCase();
      let functionName = "";

      if (operationId) {
        functionName = calculateFunctionName(String(method), String(operationId));
      } else {
        const cleanPath = String(path)
          .replace(/\{[^}]+\}/g, "")
          .replace(/\/+/g, "_")
          .replace(/^_|_$/g, "")
          .replace(/[^a-zA-Z0-9_]/g, "");
        functionName = `${prefix}_${toCamelCase(cleanPath)}`;
      }

      if (generatedFunctions.has(functionName)) return;

      // Extract Path Params & Normalize Path
      // Convert /users/{id} -> /users/${id}
      const pathParams = extractPathParams(String(path));
      let normalizedPath = normalizeApiUrl(String(path), baseUrl);
      // Ensure no query params leak into the path
      normalizedPath = normalizedPath.split("?")[0];

      pathParams.forEach((param) => {
        normalizedPath = normalizedPath.replace(`{${param}}`, `\${${param}}`);
      });

      // Query Params
      const queryParams: GenericParam[] = [];
      const params = operation.parameters;
      const hasQueryParams = params?.some((p) => p.in === "query");
      if (hasQueryParams && params) {
        params.filter((p) => p.in === "query").forEach((p) => {
          queryParams.push({
            name: decodeURIComponent(String(p.name || "")),
            required: p.required as boolean | undefined,
            description: p.description as string | undefined
          });
        });
      }

      // Body Schema - Check for multipart/form-data first, then application/json
      const requestBodyContent = operation.requestBody?.content;
      let bodySchema: Record<string, unknown> | undefined = undefined;
      let contentType = 'application/json'; // default

      if (requestBodyContent) {
        if (requestBodyContent["multipart/form-data"]) {
          bodySchema = requestBodyContent["multipart/form-data"].schema;
          contentType = 'multipart/form-data';
        } else if (requestBodyContent["application/json"]) {
          bodySchema = requestBodyContent["application/json"].schema;
          contentType = 'application/json';
        } else {
          // Fallback to first available content type
          const firstKey = Object.keys(requestBodyContent)[0];
          if (firstKey) {
            bodySchema = requestBodyContent[firstKey]?.schema;
            contentType = firstKey;
          }
        }
      }

      // Resolve Client and Adjust Path
      const { clientName, path: finalPath } = resolveClientAndPath(String(path), normalizedPath, clientMappings);

      // Security / Auth
      const globalSecurity = spec?.security || [];
      const operationSecurity = operation.security;
      const security = operationSecurity !== undefined ? operationSecurity : globalSecurity;
      const requiresAuth = Array.isArray(security) && security.length > 0;

      // Path Param Descriptions (from OpenAPI parameters where in === 'path')
      const pathParamDescriptions: Record<string, string> = {};
      if (params) {
        params.filter((p) => p.in === 'path').forEach((p) => {
          if (p.name && p.description) {
            pathParamDescriptions[String(p.name)] = String(p.description);
          }
        });
      }

      functions.push({
        name: functionName,
        method: String(method).toLowerCase() as "get" | "post" | "put" | "delete" | "patch",
        path: finalPath, // Pre-normalized to ${param} syntax
        description: operation.summary || operation.description,
        pathParams,
        pathParamDescriptions: Object.keys(pathParamDescriptions).length > 0 ? pathParamDescriptions : undefined,
        queryParams,
        bodySchema,
        isPostman: false,
        clientName,
        requiresAuth,
        contentType
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
  let data: OpenAPISpec | undefined = specData as OpenAPISpec | undefined;

  if (!data && specPath) {
    if (!fs.existsSync(specPath)) throw new Error(`File not found: ${specPath}`);
    data = JSON.parse(fs.readFileSync(specPath, "utf8")) as OpenAPISpec;
  }
  if (!data) throw new Error("No specification data provided");
  if (!data.openapi && !data.swagger) throw new Error("Invalid OpenAPI/Swagger format.");

  console.log(`📋 OpenAPI Version: ${data.openapi || data.swagger}`);

  const processed = processOpenAPI(data);
  const baseUrl = extractBaseUrl(data);
  const standardModules = mapToStandardIR(processed, options.filterModules, options.clientMappings, baseUrl);
  const modules = generateStandardModuleContent(standardModules, data); // Pass data for Ref resolution
  const operations = processAndMergeModules(modules, options);

  if (options.returnContent) return operations;
  if (!options.dryRun && options.outputDir) console.log(`✓ Modules generated.`);
  return modules;
};

if (require.main === module) {
  runGeneratorCLI("OpenAPI Spec", generateOpenApi);
}