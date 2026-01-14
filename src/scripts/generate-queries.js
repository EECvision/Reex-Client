
// scripts/generate-queries.ts

const ts = require("typescript");
const vm = require("vm");
const path = require("path");
const fs = require("fs");
const { API_DEFINITIONS_DIR, API_GENERATED_DIR, API_MANIFEST_PATH } = require("../paths");

// Load the API manifest
const manifestPath = API_MANIFEST_PATH;
const tsContent = fs.readFileSync(manifestPath, "utf8");
const transpiled = ts.transpileModule(tsContent, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;

const sandbox = { exports: {} };
vm.createContext(sandbox);
vm.runInContext(transpiled, sandbox);
const apiManifest = sandbox.exports.apiManifest;

// Set up directories
const apiDir = API_DEFINITIONS_DIR;
const queriesDir = API_GENERATED_DIR;

// Clear output directory
if (fs.existsSync(queriesDir)) {
  fs.readdirSync(queriesDir).forEach((file) => {
    fs.unlinkSync(path.join(queriesDir, file));
  });
} else {
  fs.mkdirSync(queriesDir, { recursive: true });
}

// Helper: extract exported API function names
function getExportedFunctionNames(filePath) {
  const fileContent = fs.readFileSync(filePath, "utf8");
  const sourceFile = ts.createSourceFile(
    filePath,
    fileContent,
    ts.ScriptTarget.Latest,
    true
  );
  const names = new Set();

  function visit(node) {
    if (
      ts.isPropertyAssignment(node) &&
      ts.isIdentifier(node.name) &&
      ts.isFunctionLike(node.initializer)
    ) {
      names.add(node.name.text);
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return [...names];
}

/* -------------------------------------------------------------------------
   FIXED RECURSIVE TYPE GENERATION
   ------------------------------------------------------------------------- */

// Build a TypeScript inline type recursively
function buildType(param) {
  // Primitive / string / boolean / number / etc.
  if (param.type && !param.isObject) {
    return param.type;
  }

  // Nested object
  if (param.isObject && param.properties) {
    const inner = param.properties
      .map((p) => {
        const nested = buildType(p);
        return `${p.name}${p.isOptional ? "?" : ""}: ${nested} `;
      })
      .join("; ");
    return `{ ${inner} } `;
  }

  return "any"; // fallback
}

// Wrapper for building param type
function toTypeString(param) {
  return buildType(param);
}

/* -------------------------------------------------------------------------
   Query Hook Generator
   ------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------
   Helper: Hook Name Generator
   ------------------------------------------------------------------------- */
function getHookName(methodName) {
  const isQuery = methodName.startsWith("get_");
  const methodPrefix = methodName.split("_")[0];

  return `use${methodPrefix.charAt(0).toUpperCase()}${methodPrefix.slice(1)}${methodName
      .split("_")
      .slice(1)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join("")
    }${isQuery ? "Query" : "Mutation"} `;
}

function toHookContent(methodName, args, moduleName) {
  const isQuery = methodName.startsWith("get_");
  const hookName = getHookName(methodName);

  if (isQuery) {
    if (args.length > 0) {
      const paramsType = toTypeString(args[0]);
      return `export const ${hookName} = (
  params: ${paramsType},
  options?: Parameters<typeof useApiQuery>[2]
) =>
  useApiQuery(
    ["${methodName}", JSON.stringify(params)],
    () => ${moduleName}Api.${methodName}(params),
    options
  ); `;
    } else {
      return `export const ${hookName} = (
    options?: Parameters<typeof useApiQuery>[2]
  ) =>
  useApiQuery(
    ["${methodName}"],
    ${moduleName}Api.${methodName},
    options
  ); `;
    }
  } else {
    return `export const ${hookName} = () =>
  useApiMutation(${moduleName}Api.${methodName}); `;
  }
}

/* -------------------------------------------------------------------------
   File Writer
   ------------------------------------------------------------------------- */

function generateQueryFiles() {
  const allApiFiles = fs
    .readdirSync(apiDir)
    .filter((file) => file.endsWith(".ts") && file !== "index.ts");

  // Phase 1: Scan all modules to detect hook name collisions
  const moduleHooksMap = new Map(); // ModuleName -> Set<HookName>
  const hookFrequency = new Map();  // HookName -> Count

  allApiFiles.forEach((file) => {
    const moduleName = path.basename(file, ".ts");
    const fullPath = path.join(apiDir, file);
    const fnNames = getExportedFunctionNames(fullPath);

    const hooks = new Set();
    fnNames.forEach(fn => {
      const hookName = getHookName(fn);
      hooks.add(hookName);

      hookFrequency.set(hookName, (hookFrequency.get(hookName) || 0) + 1);
    });

    moduleHooksMap.set(moduleName, hooks);
  });

  // Phase 2: Generate index.ts with dynamic aliasing
  const indexContent = `import { useMutation, useQuery } from "@tanstack/react-query";

export const useApiMutation = <TData, TVariables>(
  mutationFn: (data: TVariables) => Promise<TData | undefined>
) =>
  useMutation < TData | undefined, unknown, TVariables> ({
    mutationFn,
  });

export const useApiQuery = <TData>(
  queryKey: string[],
  queryFn: () => Promise<TData | undefined>,
  options?: {
    enabled ?: boolean;
  staleTime?: number;
  cacheTime?: number;
  refetchOnWindowFocus?: boolean;
  }
) =>
  useQuery<TData | undefined>({
    queryKey,
    queryFn,
    ...options,
  });

  ${allApiFiles
      .map((file) => {
        const moduleName = path.basename(file, ".ts");
        const hooks = moduleHooksMap.get(moduleName);

        // Check if THIS module has any conflicting hooks
        let hasConflict = false;
        for (const hook of hooks) {
          if (hookFrequency.get(hook) > 1) {
            hasConflict = true;
            break;
          }
        }

        if (hasConflict) {
          // Module has conflicts -> Must use named exports for EVERYTHING to avoid collision
          // We alias conflicting hooks using ModuleName prefix
          const exports = Array.from(hooks).map((hookName) => {
            const count = hookFrequency.get(hookName);
            if (count > 1) {
              // Collision detected: Alias it!
              // e.g. usePostDeclineMutation -> usePaymentsCryptoPostDeclineMutation
              // PascalCase module name: paymentsCrypto -> PaymentsCrypto
              const pascalModuleName = moduleName.charAt(0).toUpperCase() + moduleName.slice(1);

              // Insert module name after "use"
              // usePost... -> usePaymentsCryptoPost...
              const aliasedName = hookName.replace("use", `use${pascalModuleName}`);
              return `  ${hookName} as ${aliasedName},`;
            }
            // No collision: Keep original name
            return `  ${hookName},`;
          }).join("\n");

          return `export {\n${exports}\n} from "./use${moduleName.charAt(0).toUpperCase() + moduleName.slice(1)}Queries";`;
        }

        // No conflicts in this entire module -> Safe to use export *
        return `export * from "./use${moduleName.charAt(0).toUpperCase() + moduleName.slice(1)
          }Queries";`;
      })
      .join("\n")}
  `;

  fs.writeFileSync(path.join(queriesDir, "index.ts"), indexContent);

  // Generate per-module query files
  allApiFiles.forEach((file) => {
    const moduleName = path.basename(file, ".ts");
    const fullPath = path.join(apiDir, file);
    const fnNames = getExportedFunctionNames(fullPath);

    const queryFilePath = path.join(
      queriesDir,
      `use${moduleName.charAt(0).toUpperCase() + moduleName.slice(1)}Queries.ts`
    );

    const hooks = [];
    const usedHooks = { query: false, mutation: false };

    const hookContents = fnNames.map((methodName) => {
      const manifest = apiManifest?.[moduleName]?.[methodName];
      if (!manifest) return;

      const isQuery = methodName.startsWith("get_");
      if (isQuery) usedHooks.query = true;
      else usedHooks.mutation = true;

      return toHookContent(methodName, manifest.args, moduleName);
    });

    hooks.push(
      `import {${moduleName}Api } from "../definitions/${moduleName}";`
    );

    const imports = [];
    if (usedHooks.query) imports.push("useApiQuery");
    if (usedHooks.mutation) imports.push("useApiMutation");

    if (imports.length > 0) {
      hooks.push(`import { ${imports.join(", ")} } from ".";`);
    }

    hooks.push("");
    hooks.push(...hookContents);

    const content = `// Generated file - DO NOT EDIT
// This file contains React Query hooks for ${moduleName} API

  ${hooks.join("\n\n")}
  `;

    fs.writeFileSync(queryFilePath, content, "utf8");
  });
}

generateQueryFiles();
