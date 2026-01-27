import * as fs from "fs";
import {
  FileOperation,
  ModuleContent,
  GeneratorOptions,
  capitalize,
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

// --- OpenAPI Specific Helpers ---

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
  if (resolvedSchema.type === "number" || resolvedSchema.type === "integer") return "number";
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
          return `  ${sanitizePropertyName(key)}${required ? "" : "?"}: ${type};`;
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
      const isRequired = required.includes(key);
      const type = convertOpenAPITypeToTS(prop, spec);
      const optional = isRequired ? "" : "?";
      const description = prop.description ? ` // ${prop.description}` : "";
      fields.push(`  ${sanitizePropertyName(key)}${optional}: ${type};${description}`);
    }
  );

  if (fields.length === 0) return "";
  return `
interface ${entityName}${suffix} {
${fields.join("\n")}
}
`;
};

const getFunctionName = (method: string, path: string, operationId?: string): string => {
  const prefix = method.toLowerCase();
  if (operationId) {
    const cleaned = operationId.replace(/^(get|post|put|patch|delete)_?/i, "");
    return `${prefix}_${toCamelCase(cleaned)}`;
  }
  const cleanPath = path
    .replace(/\{[^}]+\}/g, "")
    .replace(/\/+/g, "_")
    .replace(/^_|_$/g, "")
    .replace(/[^a-zA-Z0-9_]/g, "");
  return `${prefix}_${toCamelCase(cleanPath)}`;
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

export const generateModuleContent = (
  processedModules: Map<string, any[]>,
  filterModules?: string[]
): ModuleContent[] => {
  const generatedModules: ModuleContent[] = [];

  processedModules.forEach((items, moduleName) => {
    if (filterModules && !filterModules.includes(moduleName)) return;

    const entityName = capitalize(moduleName.replace(/-/g, ""));
    const typeDefinitions: string[] = [];
    const functionDefinitions: string[] = [];
    const generatedFunctions = new Set<string>();
    const generatedTypes = new Set<string>();

    items.forEach((item) => {
      const { method, path, operation, operationId, summary, spec } = item;
      const entityRequestName = toPascalCase(operationId || summary || path);
      const functionName = getFunctionName(method, path, operationId);

      if (generatedFunctions.has(functionName)) return;

      const pathParams = extractPathParams(path);
      const hasRequestBody = operation.requestBody?.content?.["application/json"]?.schema;
      const hasQueryParams = operation.parameters?.some((p: any) => p.in === "query");
      let hasPayloadType = false;

      // 1. Types
      if (hasRequestBody) {
        const bodyType = generateTypesFromOpenAPISchema(
          operation.requestBody.content["application/json"].schema,
          entityRequestName,
          "Payload",
          spec
        );
        if (bodyType && !generatedTypes.has(entityRequestName + "Payload")) {
          typeDefinitions.push(bodyType);
          generatedTypes.add(entityRequestName + "Payload");
          hasPayloadType = true;
        }
      }

      if (hasQueryParams) {
        const queryParams = operation.parameters.filter((p: any) => p.in === "query");
        const genericParams: GenericParam[] = queryParams.map((p: any) => ({
          name: p.name,
          required: p.required,
          description: p.description
        }));
        const queryType = generateInterfaceDefinition(`${entityRequestName}Params`, genericParams);
        if (queryType && !generatedTypes.has(entityRequestName + "Params")) {
          typeDefinitions.push(queryType);
          generatedTypes.add(entityRequestName + "Params");
        }
      }

      // 2. Signature
      const needsPayload = hasPayloadType && ["post", "put", "patch"].includes(method.toLowerCase());
      const signature = generateFunctionSignature({
        functionName,
        entityName: entityRequestName,
        pathParams,
        hasPayload: needsPayload,
        hasQueryParams: !!hasQueryParams
      });

      // 3. Body
      const finalUrl = normalizeApiUrl(path);
      let urlWithParams = finalUrl;
      pathParams.forEach((param) => {
        urlWithParams = urlWithParams.replace(`{${param}}`, `\${${param}}`);
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
  const modules = generateModuleContent(processed, options.filterModules);
  const operations = processAndMergeModules(modules, options);

  if (options.returnContent) return operations;
  if (!options.dryRun && options.outputDir) console.log(`✓ Modules generated.`);
  return modules;
};

if (require.main === module) {
  runGeneratorCLI("OpenAPI Spec", generateOpenApi);
}