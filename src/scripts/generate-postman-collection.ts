import * as fs from "fs";
import {
  FileOperation,
  ModuleContent,
  GeneratorOptions,
  sanitizeModuleName,
  processAndMergeModules,
  runGeneratorCLI,
  GenericParam,
  StandardModuleDefinition,
  StandardFunctionDefinition,
  generateStandardModuleContent,
  normalizeApiUrl,
  extractBaseUrl,
  extractPostmanPathParams,
  resolveClientAndPath,
  getCommonPrefix,
  proposeClientForFunctions,
  calculateFunctionName
} from "./generator-utils";

// --- Main Processing ---

export const processPostmanCollection = (collectionData: any) => {
  const processedModules = new Map<string, any[]>();

  const processItem = (item: any, folderName?: string, parentAuth?: any) => {
    // 1. Resolve Auth (Local > Parent)
    const currentAuth = item.auth || parentAuth;

    if (item.item) {
      const folder = folderName || item.name;
      item.item.forEach((subItem: any) => processItem(subItem, folder, currentAuth));
    } else if (item.request) {
      const folder = folderName || "general";
      const moduleName = sanitizeModuleName(folder);
      if (!processedModules.has(moduleName)) processedModules.set(moduleName, []);

      // Attach the resolved auth to the item for later use
      item.inheritedAuth = currentAuth;
      processedModules.get(moduleName)!.push(item);
    }
  };

  // Start processing from root
  // Collection itself might have auth
  const collectionAuth = collectionData.auth;
  if (collectionData.item) collectionData.item.forEach((item: any) => processItem(item, undefined, collectionAuth));

  return processedModules;
};

const mapToStandardIR = (
  processedModules: Map<string, any[]>,
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
      const { request } = item;
      if (!request || !request.url || !request.method) return;

      const requestName = item.name;
      const method = request.method.toLowerCase();
      // Aggressively clean requestName to avoid "get_getSomething"
      const functionName = calculateFunctionName(method, requestName);

      if (generatedFunctions.has(functionName)) return;

      // URL Handling
      let url = "";
      if (typeof request.url === "string") url = request.url;
      else if (request.url.raw) url = request.url.raw;
      else if (request.url.path) url = "/" + request.url.path.join("/");

      if (!url) return;

      const finalUrl = normalizeApiUrl(url, baseUrl);
      const [pathOnly] = finalUrl.split("?");
      const pathParams = extractPostmanPathParams(pathOnly);

      // Normalize Path: :param and {{param}} -> ${param}
      let normalizedPath = pathOnly;
      pathParams.forEach((param) => {
        normalizedPath = normalizedPath.replace(`:${param}`, `\${${param}}`);
        normalizedPath = normalizedPath.replace(`{{${param}}}`, `\${${param}}`);
      });

      // Query Params
      const queryParams = typeof request.url === "object" ? request.url.query : null;
      let genericQueryParams: GenericParam[] = [];
      if (queryParams && queryParams.length > 0) {
        genericQueryParams = queryParams.map((p: any) => ({
          name: decodeURIComponent(p.key),
          required: false,
          description: p.description
        }));
      }

      // Body Schema (raw JSON or formdata)
      let bodySchema: any = undefined;
      if (request.body?.raw) {
        bodySchema = { raw: request.body.raw };
      } else if (request.body?.mode === 'formdata' && Array.isArray(request.body.formdata) && request.body.formdata.length > 0) {
        bodySchema = { formdata: request.body.formdata };
      }

      // Content Type from body mode
      let contentType = 'application/json'; // default
      if (request.body?.mode === 'formdata') {
        contentType = 'multipart/form-data';
      } else if (request.body?.mode === 'urlencoded') {
        contentType = 'application/x-www-form-urlencoded';
      }

      // Resolve Client and Adjust Path
      const { clientName, path: finalPath } = resolveClientAndPath(finalUrl, normalizedPath, clientMappings);

      // Auth (Postman)
      // 1. Check specific request auth OR inherited auth
      const auth = request.auth || item.inheritedAuth;

      // 2. Check for manual Authorization header
      const hasAuthHeader = request.header && Array.isArray(request.header)
        ? request.header.some((h: any) => h.key.toLowerCase() === 'authorization')
        : false;

      // Logic:
      // - If 'noauth' is explicitly set (locally or inherited) -> FALSE
      // - If Authorization header matches -> TRUE
      // - If explicit auth is set (and not noauth) -> TRUE
      // - If NO auth info is present (undefined) -> TRUE (Assume secure by default for APIs)

      let requiresAuth = true; // Default to secure

      if (auth) {
        if (auth.type === 'noauth') {
          requiresAuth = false;
        } else {
          requiresAuth = true;
        }
      } else {
        // No auth object locally or inherited. Default to true.
        requiresAuth = true;
      }

      // Override if header is present (doubly sure)
      if (hasAuthHeader) requiresAuth = true;

      // Path Variable Descriptions (from Postman url.variable array)
      const pathParamDescriptions: Record<string, string> = {};
      if (typeof request.url === "object" && Array.isArray(request.url.variable)) {
        request.url.variable.forEach((v: any) => {
          if (v.key && v.description) {
            pathParamDescriptions[v.key] = typeof v.description === 'string' ? v.description : v.description.content || '';
          }
        });
      }

      functions.push({
        name: functionName,
        method: method as any,
        path: finalPath, // Pre-normalized
        description: typeof request.description === 'string' ? request.description : request.description?.content,
        pathParams,
        pathParamDescriptions: Object.keys(pathParamDescriptions).length > 0 ? pathParamDescriptions : undefined,
        queryParams: genericQueryParams,
        bodySchema,
        isPostman: true,
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

export const generatePostman = async (options: GeneratorOptions): Promise<ModuleContent[] | FileOperation[]> => {
  const { specPath, specData } = options;
  let data = specData;

  if (!data && specPath) {
    if (!fs.existsSync(specPath)) throw new Error(`File not found: ${specPath}`);
    data = JSON.parse(fs.readFileSync(specPath, "utf8"));
  }
  if (!data) throw new Error("No collection data provided");

  const processed = processPostmanCollection(data);
  const baseUrl = extractBaseUrl(data);
  const standardModules = mapToStandardIR(processed, options.filterModules, options.clientMappings, baseUrl);
  const modules = generateStandardModuleContent(standardModules);
  const operations = processAndMergeModules(modules, options);

  if (options.returnContent) return operations;
  if (!options.dryRun && options.outputDir) console.log(`✓ Modules generated.`);
  return modules;
};

if (require.main === module) {
  runGeneratorCLI("Postman Collection", generatePostman);
}