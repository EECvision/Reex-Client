import * as fs from "fs";
import {
  FileOperation,
  ModuleContent,
  GeneratorOptions,
  toCamelCase,
  sanitizeModuleName,
  processAndMergeModules,
  runGeneratorCLI,
  GenericParam,
  StandardModuleDefinition,
  StandardFunctionDefinition,
  generateStandardModuleContent,
  normalizeApiUrl,
  extractPostmanPathParams,
  resolveClientAndPath,
  getCommonPrefix
} from "./generator-utils";

// --- Main Processing ---

export const processPostmanCollection = (collectionData: any) => {
  const processedModules = new Map<string, any[]>();
  const processItem = (item: any, folderName?: string) => {
    if (item.item) {
      const folder = folderName || item.name;
      item.item.forEach((subItem: any) => processItem(subItem, folder));
    } else if (item.request) {
      const folder = folderName || "general";
      const moduleName = sanitizeModuleName(folder);
      if (!processedModules.has(moduleName)) processedModules.set(moduleName, []);
      processedModules.get(moduleName)!.push(item);
    }
  };
  if (collectionData.item) collectionData.item.forEach((item: any) => processItem(item));
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
      const { request } = item;
      if (!request || !request.url || !request.method) return;

      const requestName = item.name;
      const method = request.method.toLowerCase();
      const functionName = `${method}_${toCamelCase(requestName.replace(/\s+/g, "_"))}`;

      if (generatedFunctions.has(functionName)) return;

      // URL Handling
      let url = "";
      if (typeof request.url === "string") url = request.url;
      else if (request.url.raw) url = request.url.raw;
      else if (request.url.path) url = "/" + request.url.path.join("/");

      if (!url) return;

      const finalUrl = normalizeApiUrl(url);
      const pathParams = extractPostmanPathParams(finalUrl);

      // Normalize Path: :param -> ${param}
      let normalizedPath = finalUrl;
      pathParams.forEach((param) => {
        normalizedPath = normalizedPath.replace(`:${param}`, `\${${param}}`);
      });

      // Query Params
      const queryParams = typeof request.url === "object" ? request.url.query : null;
      let genericQueryParams: GenericParam[] = [];
      if (queryParams && queryParams.length > 0) {
        genericQueryParams = queryParams.map((p: any) => ({
          name: p.key,
          required: false,
          description: p.description
        }));
      }

      // Body Schema (Example/Raw)
      const bodySchema = (request.body && request.body.raw) ? { raw: request.body.raw } : undefined;

      // Resolve Client and Adjust Path
      const { clientName, path: finalPath } = resolveClientAndPath(finalUrl, normalizedPath, clientMappings);

      functions.push({
        name: functionName,
        method: method as any,
        path: finalPath, // Pre-normalized
        description: request.description,
        pathParams,
        queryParams: genericQueryParams,
        bodySchema,
        isPostman: true,
        clientName
      });

      generatedFunctions.add(functionName);
    });

    // Auto-Client Proposal
    const unassignedFunctions = functions.filter(f => !f.clientName);
    let proposedClient: { name: string; path: string } | undefined;

    if (unassignedFunctions.length > 0) {
      const unassignedPaths = unassignedFunctions.map(f => f.path);
      const commonPrefix = getCommonPrefix(unassignedPaths);

      if (commonPrefix && commonPrefix.length > 1 && commonPrefix !== "/") {
        const nameParts = commonPrefix.split('/').filter(Boolean);
        // Sanitize: replace non-alphanumeric chars (like -) with _
        const sanitizedParts = nameParts.map(p => p.replace(/[^a-zA-Z0-9]/g, '_'));
        const candidateName = sanitizedParts.join('_').toUpperCase() + "_CLIENT";

        proposedClient = { name: candidateName, path: commonPrefix };

        unassignedFunctions.forEach(f => {
          f.clientName = candidateName;
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

export const generatePostman = async (options: GeneratorOptions): Promise<ModuleContent[] | FileOperation[]> => {
  const { specPath, specData } = options;
  let data = specData;

  if (!data && specPath) {
    if (!fs.existsSync(specPath)) throw new Error(`File not found: ${specPath}`);
    data = JSON.parse(fs.readFileSync(specPath, "utf8"));
  }
  if (!data) throw new Error("No collection data provided");

  const processed = processPostmanCollection(data);
  const standardModules = mapToStandardIR(processed, options.filterModules, options.clientMappings);
  const modules = generateStandardModuleContent(standardModules);
  const operations = processAndMergeModules(modules, options);

  if (options.returnContent) return operations;
  if (!options.dryRun && options.outputDir) console.log(`✓ Modules generated.`);
  return modules;
};

if (require.main === module) {
  runGeneratorCLI("Postman Collection", generatePostman);
}