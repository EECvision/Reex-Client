import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// In-memory generation helpers (mirror of api-npm-bridge logic, no fs calls)
// ---------------------------------------------------------------------------

function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function getHookName(methodName: string) {
  const isQuery = methodName.startsWith("get_");
  const [prefix, ...rest] = methodName.split("_");
  const suffix = rest.map((w) => capitalize(w)).join("");
  const cleanPrefix = prefix ? capitalize(prefix) : "";
  return `use${cleanPrefix}${suffix}${isQuery ? "Query" : "Mutation"}`;
}

function buildTypeSignature(arg: any, indent = "  "): string {
  if (!arg) return "unknown";
  if (arg.isObject && arg.properties) {
    const props = arg.properties
      .map((p: any) => {
        const optional = p.isOptional ? "?" : "";
        const type = p.isObject ? buildTypeSignature(p) : (p.type || "unknown");
        return `${indent}  ${p.name}${optional}: ${type};`;
      })
      .join("\n");
    return `{\n${props}\n${indent}}`;
  }
  return arg.type || "unknown";
}

function buildDefinitionFile(moduleName: string, methods: Record<string, any>): string {
  const TypeName = capitalize(moduleName.replace(/s$/, ""));
  const lines: string[] = [
    `/* eslint-disable @typescript-eslint/no-explicit-any */`,
    `import { apiClient } from "../api-client";`,
    ``,
  ];

  // Collect interfaces needed
  const interfaces: string[] = [];
  const methodEntries = Object.entries(methods);

  methodEntries.forEach(([methodName, def]) => {
    const args: any[] = def.args || [];
    args.forEach((arg: any) => {
      if (arg.isObject && arg.properties) {
        const ifaceName = `${capitalize(methodName.replace(/^(get|post|put|patch|delete)_/, ""))}${capitalize(arg.name)}`;
        const props = arg.properties
          .map((p: any) => {
            const optional = p.isOptional ? "?" : "";
            const type = p.isObject ? buildTypeSignature(p) : (p.type || "unknown");
            return `  ${p.name}${optional}: ${type};`;
          })
          .join("\n");
        interfaces.push(`interface ${ifaceName} {\n${props}\n}`);
      }
    });
  });

  if (interfaces.length > 0) {
    lines.push(...interfaces, "");
  }

  lines.push(`export const ${moduleName}Api = {`);

  methodEntries.forEach(([methodName, def], idx) => {
    const args: any[] = def.args || [];
    const httpMethod = methodName.split("_")[0];
    const url = def.url || `/api/${moduleName}`;

    const argStr = args.map((arg: any) => {
      if (arg.isObject && arg.properties) {
        const props = arg.properties
          .map((p: any) => `${p.name}${p.isOptional ? "?" : ""}: ${p.type || "unknown"}`)
          .join("; ");
        return `${arg.name}: { ${props} }`;
      }
      return `${arg.name}${arg.isOptional ? "?" : ""}: ${arg.type || "unknown"}`;
    }).join(", ");

    const returnsType = `Promise<any>`;

    // Build JSDoc
    const jsdocLines: string[] = [];
    if (def.requiresAuth) jsdocLines.push("   * @auth");
    if (def.contentType) jsdocLines.push(`   * @contentType ${def.contentType}`);
    if (jsdocLines.length > 0) {
      lines.push(`  /**`);
      jsdocLines.forEach(l => lines.push(l));
      lines.push(`   */`);
    }

    // Determine call signature
    const hasBody = ["post", "put", "patch"].includes(httpMethod);
    const bodyArg = hasBody && args.length > 0 ? `, ${args[args.length - 1].name}` : "";
    const paramsArg = !hasBody && args.length > 0 ? `, { params: ${args[0].name} }` : "";
    const pathArg = url.includes("${") ? `\`${url}\`` : `'${url}'`;

    lines.push(
      `  ${methodName}: (${argStr || ""}): ${returnsType} =>`,
      `    apiClient.${httpMethod}(${pathArg}${bodyArg || paramsArg}),`,
    );

    if (idx < methodEntries.length - 1) lines.push("");
  });

  lines.push(`};`, ``);
  return lines.join("\n");
}

function buildHooksFile(moduleName: string, methods: Record<string, any>): string {
  const pascalModule = capitalize(moduleName);
  const keyFactoryName = `${moduleName}Keys`;
  const methodNames = Object.keys(methods);

  let usedQuery = false;
  let usedMutation = false;
  methodNames.forEach((m) => {
    if (m.startsWith("get_")) usedQuery = true;
    else usedMutation = true;
  });

  const tanstackImports: string[] = [];
  if (usedMutation) {
    tanstackImports.push("useQueryClient", "type UseMutationOptions");
  }
  if (usedQuery) {
    tanstackImports.push("type UseQueryOptions");
  }

  const commonImports = [
    usedQuery && "useApiQuery",
    usedMutation && "useApiMutation",
  ].filter(Boolean).join(", ");

  const lines: string[] = [
    `/* eslint-disable @typescript-eslint/no-explicit-any */`,
    `// Generated file - DO NOT EDIT`,
  ];

  if (tanstackImports.length > 0) {
    lines.push(`import { ${tanstackImports.join(", ")} } from "@tanstack/react-query";`);
  }
  lines.push(`import { ${moduleName}Api } from "../definitions/${moduleName}";`);
  if (commonImports) {
    lines.push(`import { ${commonImports} } from ".";`);
  }
  lines.push(
    ``,
    `// Helper Types`,
    `type ApiData<T extends (...args: any) => any> = Awaited<ReturnType<T>>;`,
    `type ApiVars<T extends (...args: any) => any> = Parameters<T>[0];`,
    ``,
  );

  // Key Factory
  const keyLines = [`export const ${keyFactoryName} = {`, `  all: ["${moduleName}"] as const,`];
  methodNames.filter(m => m.startsWith("get_")).forEach(method => {
    const hasArgs = methods[method].args && methods[method].args.length > 0;
    const paramDef = hasArgs
      ? `params: ApiVars<typeof ${moduleName}Api.${method}>`
      : `params?: ApiVars<typeof ${moduleName}Api.${method}>`;
    keyLines.push(`  ${method}: (${paramDef}) => [...${keyFactoryName}.all, "${method}", params] as const,`);
  });
  keyLines.push(`};`);
  lines.push(...keyLines, ``);

  // Hooks
  methodNames.forEach(method => {
    const def = methods[method];
    const isQuery = method.startsWith("get_");
    const hookName = getHookName(method);
    const apiMethod = `${moduleName}Api.${method}`;
    const apiData = `ApiData<typeof ${apiMethod}>`;
    const apiVars = `ApiVars<typeof ${apiMethod}>`;

    const jsdocLines: string[] = [];
    if (def.requiresAuth) jsdocLines.push(" * @auth");
    if (def.contentType) jsdocLines.push(` * @contentType ${def.contentType}`);
    const jsDoc = jsdocLines.length > 0 ? `/**\n${jsdocLines.join("\n")}\n */\n` : "";

    const hasArgs = def.args && def.args.length > 0;

    if (isQuery) {
      if (hasArgs) {
        lines.push(
          `${jsDoc}export const ${hookName} = <TData = ${apiData}>(`,
          `  params: ${apiVars},`,
          `  options?: Omit<`,
          `    UseQueryOptions<${apiData}, Error, TData>,`,
          `    "queryKey" | "queryFn"`,
          `  >`,
          `) =>`,
          `  useApiQuery(`,
          `    ${keyFactoryName}.${method}(params),`,
          `    () => ${apiMethod}(params),`,
          `    options`,
          `  );`,
          ``,
        );
      } else {
        lines.push(
          `${jsDoc}export const ${hookName} = <TData = ${apiData}>(`,
          `  options?: Omit<`,
          `    UseQueryOptions<${apiData}, Error, TData>,`,
          `    "queryKey" | "queryFn"`,
          `  >`,
          `) =>`,
          `  useApiQuery(`,
          `    ${keyFactoryName}.${method}(),`,
          `    () => ${apiMethod}(),`,
          `    options`,
          `  );`,
          ``,
        );
      }
    } else {
      lines.push(
        `${jsDoc}export const ${hookName} = (`,
        `  options?: Omit<`,
        `    UseMutationOptions<${apiData}, Error, ${apiVars}>,`,
        `    "mutationFn"`,
        `  >`,
        `) => {`,
        `  const queryClient = useQueryClient();`,
        ``,
        `  return useApiMutation(${apiMethod}, {`,
        `    ...options,`,
        `    onSuccess: (data, variables, context) => {`,
        `      queryClient.invalidateQueries({ queryKey: ${keyFactoryName}.all });`,
        `      (options?.onSuccess as any)?.(data, variables, context);`,
        `    },`,
        `  });`,
        `};`,
        ``,
      );
    }
  });

  return lines.join("\n");
}

function buildHooksIndexFile(moduleNames: string[]): string {
  const exportLines = moduleNames.map(m => `export * from "./use${capitalize(m)}Queries";`);

  return `// Generated file - DO NOT EDIT
import {
  type QueryKey,
  type UseMutationOptions,
  type UseQueryOptions,
  type UseQueryResult,
  type DefaultError,
  useMutation,
  useQuery,
} from "@tanstack/react-query";

// 1. Mutation Wrapper
export const useApiMutation = <
  TData = unknown,
  TVariables = void,
  TError = DefaultError,
  TContext = unknown,
>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: Omit<
    UseMutationOptions<TData, TError, TVariables, TContext>,
    "mutationFn"
  >,
) => {
  return useMutation<TData, TError, TVariables, TContext>({
    mutationFn,
    ...options,
  });
};

// 2. Query Wrapper
export const useApiQuery = <
  TQueryFnData = unknown,
  TError = DefaultError,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(
  queryKey: TQueryKey,
  queryFn: () => Promise<TQueryFnData>,
  options?: Omit<
    UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>,
    "queryKey" | "queryFn"
  >,
): UseQueryResult<TData, TError> => {
  return useQuery<TQueryFnData, TError, TData, TQueryKey>({
    queryKey,
    queryFn,
    refetchOnWindowFocus: false,
    retry: 1,
    ...options,
  });
};

${exportLines.join("\n")}
`;
}

function buildBarrelFile(moduleNames: string[]): string {
  const imports = moduleNames.map(m => `import { ${m}Api } from "./definitions/${m}";`).join("\n");
  const exports = moduleNames.map(m => `  ...${m}Api,`).join("\n");
  return `${imports}

export const api = {
${exports}
};
`;
}

function buildTypeFile(methodName: string): string {
  return `export type ${methodName} = unknown;\n`;
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { manifest, apiServicesDir = "src/api-services" } = body;

    if (!manifest || typeof manifest !== "object") {
      return NextResponse.json({ success: false, error: "manifest is required" }, { status: 400 });
    }

    const files: Record<string, string> = {};
    const manifestKeys = Object.keys(manifest).sort();
    const cleanModuleNames = new Set<string>();

    manifestKeys.forEach((manifestKey) => {
      const methods = manifest[manifestKey];

      // Extract original module name if it's namespaced (e.g. col_123__users -> users)
      let moduleName = manifestKey;
      if (manifestKey.startsWith("col_") && manifestKey.includes("__")) {
        moduleName = manifestKey.split("__").slice(1).join("__");
      }

      cleanModuleNames.add(moduleName);

      // definitions/{module}.ts
      files[`${apiServicesDir}/definitions/${moduleName}.ts`] =
        buildDefinitionFile(moduleName, methods);

      // generated/use{Module}Queries.ts
      const pascal = capitalize(moduleName);
      files[`${apiServicesDir}/generated/use${pascal}Queries.ts`] =
        buildHooksFile(moduleName, methods);

      // types/{module}/{fn}.ts
      Object.keys(methods).forEach((methodName) => {
        if (!methodName.startsWith("delete_")) {
          files[`${apiServicesDir}/types/${moduleName}/${methodName}.ts`] =
            buildTypeFile(methodName);
        }
      });
    });

    const uniqueModuleNames = Array.from(cleanModuleNames).sort();

    // generated/index.ts (hooks barrel + wrappers)
    files[`${apiServicesDir}/generated/index.ts`] = buildHooksIndexFile(uniqueModuleNames);

    // index.ts (api barrel)
    files[`${apiServicesDir}/index.ts`] = buildBarrelFile(uniqueModuleNames);

    return NextResponse.json({ success: true, files });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.toString() }, { status: 500 });
  }
}
