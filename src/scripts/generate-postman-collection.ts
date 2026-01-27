import * as fs from "fs";
import {
  FileOperation,
  ModuleContent,
  GeneratorOptions,
  toCamelCase,
  toPascalCase,
  sanitizeModuleName,
  sanitizePropertyName,
  normalizeApiUrl,
  processAndMergeModules,
  generateAxiosCallBody,
  generateInterfaceDefinition,
  generateFunctionSignature,
  generateModuleTemplate,
  runGeneratorCLI,
  GenericParam
} from "./generator-utils";

// --- Postman Specific Helpers ---

const extractPathParams = (url: string): string[] => {
  const matches = url.match(/:([a-zA-Z_][a-zA-Z0-9_]*)/g);
  return matches ? matches.map((m) => m.slice(1)) : [];
};

const inferTypeFromExample = (value: any): string => {
  if (value === null || value === undefined) return "any";
  if (typeof value === "string") return "string";
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  if (Array.isArray(value)) return value.length > 0 ? `${inferTypeFromExample(value[0])}[]` : "any[]";
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
      // Fallback: simple comment stripping to try and rescue invalid JSON
      let cleanJson = body.raw.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
      cleanJson = cleanJson.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]");
      parsed = JSON.parse(cleanJson);
    } catch (e2) {
      return "";
    }
  }

  const fields: string[] = [];
  Object.entries(parsed).forEach(([key, value]) => {
    const type = inferTypeFromExample(value);
    const optional = value === null || value === undefined ? "?" : "";
    // FIX: sanitizePropertyName applied here to handle keys like "user-name"
    fields.push(`  ${sanitizePropertyName(key)}${optional}: ${type};`);
  });

  if (fields.length === 0) return "";
  return `
interface ${entityName}Payload {
${fields.join("\n")}
}
`;
};

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

export const generateModuleContent = (
  processedModules: Map<string, any[]>,
  filterModules?: string[]
): ModuleContent[] => {
  const generatedModules: ModuleContent[] = [];

  processedModules.forEach((requests, moduleName) => {
    if (filterModules && !filterModules.includes(moduleName)) return;

    const typeDefinitions: string[] = [];
    const functionDefinitions: string[] = [];
    const generatedFunctions = new Set<string>();
    const generatedTypes = new Set<string>();

    requests.forEach((item) => {
      const request = item.request;
      if (!request || !request.url || !request.method) return;

      const requestName = item.name;
      const entityRequestName = toPascalCase(requestName);
      const method = request.method.toLowerCase();
      const functionName = `${method}_${toCamelCase(requestName.replace(/\s+/g, "_"))}`;

      if (generatedFunctions.has(functionName)) return;

      const hasBody = request.body && request.body.raw;
      const needsPayload = hasBody && ["post", "put", "patch"].includes(method);
      let hasPayloadType = false;

      // 1. Types
      if (needsPayload) {
        try {
          const bodyType = generateTypesFromBody(request.body, entityRequestName);
          if (bodyType && !generatedTypes.has(entityRequestName + "Payload")) {
            typeDefinitions.push(bodyType);
            generatedTypes.add(entityRequestName + "Payload");
            hasPayloadType = true;
          }
        } catch (e) {
          console.warn(`⚠️  Could not parse body for: ${requestName}`);
        }
      }

      const queryParams = typeof request.url === "object" ? request.url.query : null;
      if (queryParams && queryParams.length > 0) {
        const genericParams: GenericParam[] = queryParams.map((p: any) => ({
          name: p.key,
          required: false,
          description: p.description
        }));
        const queryType = generateInterfaceDefinition(`${entityRequestName}Params`, genericParams);
        if (queryType && !generatedTypes.has(entityRequestName + "Params")) {
          typeDefinitions.push(queryType);
          generatedTypes.add(entityRequestName + "Params");
        }
      }

      // 2. Signature
      let url = "";
      if (typeof request.url === "string") url = request.url;
      else if (request.url.raw) url = request.url.raw;
      else if (request.url.path) url = "/" + request.url.path.join("/");

      if (!url) return;

      const finalUrl = normalizeApiUrl(url);
      const pathParams = extractPathParams(finalUrl);
      const hasQueryParams = queryParams && queryParams.length > 0;

      const signature = generateFunctionSignature({
        functionName,
        entityName: entityRequestName,
        pathParams,
        hasPayload: needsPayload,
        hasQueryParams: !!hasQueryParams
      });

      // 3. Body
      let urlWithParams = finalUrl;
      pathParams.forEach((param) => {
        urlWithParams = urlWithParams.replace(`:${param}`, `\${${param}}`);
      });

      const body = generateAxiosCallBody(method, functionName, urlWithParams, hasPayloadType, !!hasQueryParams);

      generatedFunctions.add(functionName);
      functionDefinitions.push(`${signature}\n${body}\n`);
    });

    generatedModules.push({
      name: moduleName,
      content: generateModuleTemplate(moduleName, typeDefinitions, functionDefinitions)
    });
  });

  return generatedModules;
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
  const modules = generateModuleContent(processed, options.filterModules);
  const operations = processAndMergeModules(modules, options);

  if (options.returnContent) return operations;
  if (!options.dryRun && options.outputDir) console.log(`✓ Modules generated.`);
  return modules;
};

if (require.main === module) {
  runGeneratorCLI("Postman Collection", generatePostman);
}