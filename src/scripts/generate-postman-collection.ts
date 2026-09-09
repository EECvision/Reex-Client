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

  proposeClientForFunctions,
  calculateFunctionName
} from "./generator-utils";

// --- Main Processing ---

export const processPostmanCollection = (collectionData: Record<string, unknown>) => {
  const processedModules = new Map<string, Record<string, unknown>[]>();

  const processItem = (item: Record<string, unknown>, folderName?: string, parentAuth?: unknown) => {
    // 1. Resolve Auth (Local > Parent)
    const currentAuth = item.auth || parentAuth;

    if (item.item) {
      const folder = folderName || (item.name as string);
      (item.item as Record<string, unknown>[]).forEach((subItem: Record<string, unknown>) => processItem(subItem, folder, currentAuth));
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
  if (collectionData.item) (collectionData.item as Record<string, unknown>[]).forEach((item: Record<string, unknown>) => processItem(item, undefined, collectionAuth));

  return processedModules;
};

const mapToStandardIR = (
  processedModules: Map<string, Record<string, unknown>[]>,
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
      const request = item.request as Record<string, unknown>;
      if (!request || !request.url || typeof request.method !== 'string') return;

      const requestName = item.name as string;
      const method = request.method.toLowerCase();
      // Aggressively clean requestName to avoid "get_getSomething"
      const functionName = calculateFunctionName(method, requestName);

      if (generatedFunctions.has(functionName)) return;

      // URL Handling
      let url = "";
      if (typeof request.url === "string") url = request.url;
      else if (typeof request.url === "object" && request.url !== null) {
        const urlObj = request.url as Record<string, unknown>;
        if (urlObj.raw && typeof urlObj.raw === 'string') url = urlObj.raw;
        else if (Array.isArray(urlObj.path)) url = "/" + urlObj.path.join("/");
      }

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
      const urlObj = typeof request.url === "object" ? (request.url as Record<string, unknown>) : null;
      const queryParams = urlObj?.query;
      let genericQueryParams: GenericParam[] = [];
      if (Array.isArray(queryParams) && queryParams.length > 0) {
        genericQueryParams = queryParams.map((p: Record<string, unknown>) => ({
          name: typeof p.key === 'string' ? decodeURIComponent(p.key) : '',
          required: false,
          description: typeof p.description === 'string' ? p.description : ''
        }));
      }

      // Body Schema (raw JSON or formdata)
      let bodySchema: Record<string, unknown> | undefined = undefined;
      const requestBody = request.body as Record<string, unknown> | undefined;
      if (requestBody?.raw) {
        bodySchema = { raw: requestBody.raw };
      } else if (requestBody?.mode === 'formdata' && Array.isArray(requestBody.formdata) && requestBody.formdata.length > 0) {
        bodySchema = { formdata: requestBody.formdata };
      }

      // Content Type from body mode
      let contentType = 'application/json'; // default
      if (requestBody?.mode === 'formdata') {
        contentType = 'multipart/form-data';
      } else if (requestBody?.mode === 'urlencoded') {
        contentType = 'application/x-www-form-urlencoded';
      }

      // Resolve Client and Adjust Path
      const { clientName, path: finalPath } = resolveClientAndPath(finalUrl, normalizedPath, clientMappings);

      // Auth (Postman)
      // 1. Check specific request auth OR inherited auth
      const auth = (request.auth || item.inheritedAuth) as Record<string, unknown> | undefined;

      // 2. Check for manual Authorization header
      const hasAuthHeader = request.header && Array.isArray(request.header)
        ? request.header.some((h: Record<string, unknown>) => typeof h.key === 'string' && h.key.toLowerCase() === 'authorization')
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
      if (urlObj && Array.isArray(urlObj.variable)) {
        urlObj.variable.forEach((v: Record<string, unknown>) => {
          if (typeof v.key === 'string' && v.description) {
            pathParamDescriptions[v.key] = typeof v.description === 'string' ? v.description : (v.description as Record<string, string>).content || '';
          }
        });
      }

      functions.push({
        name: functionName,
        method: method as StandardFunctionDefinition['method'],
        path: finalPath, // Pre-normalized
        description: typeof request.description === 'string' ? request.description : (request.description as Record<string, string>)?.content,
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
  let data: Record<string, unknown> | undefined = specData as Record<string, unknown> | undefined;

  if (!data && specPath) {
    if (!fs.existsSync(specPath)) throw new Error(`File not found: ${specPath}`);
    data = JSON.parse(fs.readFileSync(specPath, "utf8")) as Record<string, unknown>;
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