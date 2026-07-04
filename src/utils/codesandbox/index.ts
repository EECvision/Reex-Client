import * as LZString from "lz-string";
import {
  QUERY_PROVIDER_CONTENT,
  AUTH_PROVIDER_CONTENT,
  AUTH_MANAGER_CONTENT,
  AUTH_TYPES_CONTENT,
  USER_CONFIG_AUTH_CONTENT,
  COOKIE_GUARD_CONTENT,
  COOKIE_PROVIDER_CONTENT,
  LOCALSTORAGE_GUARD_CONTENT,
  LOCALSTORAGE_PROVIDER_CONTENT,
  USE_AUTH_HOOK_CONTENT,
  USE_NOTIFICATION_HOOK_CONTENT,
  BASE_API_CLIENT_CONTENT,
  INDEX_HOOKS_CONTENT,
  REACT_QUERY_WRAPPERS_CONTENT,
} from "./templates";
import {
  generateKeyFactory,
  toHookContent,
  getHookName,
} from "./hookGenerator";

function compress(string: string) {
  return LZString.compressToBase64(string)
    .replace(/\+/g, "-") // Convert '+' to '-'
    .replace(/\//g, "_") // Convert '/' to '_'
    .replace(/=+$/, ""); // Remove ending '='
}

export const createSandboxPayload = (
  collectionName: string,
  baseURL: string,
  modules: Record<string, string>,
  config: any,
) => {
  const files: Record<string, { content: string; isBinary: boolean }> = {};

  // 1. Package.json
  files["package.json"] = {
    isBinary: false,
    content: JSON.stringify(
      {
        name:
          collectionName.toLowerCase().replace(/[^a-z0-9]/g, "-") ||
          "reex-api-client",
        version: "1.0.0",
        description: "Auto-generated API Client",
        main: "src/index.tsx",
        dependencies: {
          axios: "^1.6.0",
          react: "^18.2.0",
          "react-dom": "^18.2.0",
          "react-scripts": "^5.0.1",
          "@tanstack/react-query": "^5.0.0",
        },
        devDependencies: {
          "@types/react": "^18.2.0",
          "@types/react-dom": "^18.2.0",
          typescript: "^5.2.2",
        },
        scripts: {
          start: "react-scripts start",
          build: "react-scripts build",
          test: "react-scripts test --env=jsdom",
          eject: "react-scripts eject",
        },
        browserslist: [">0.2%", "not dead", "not ie <= 11", "not op_mini all"],
      },
      null,
      2,
    ),
  };

  // 2. tsconfig.json
  files["tsconfig.json"] = {
    isBinary: false,
    content: JSON.stringify(
      {
        compilerOptions: {
          target: "es5",
          lib: ["dom", "dom.iterable", "esnext"],
          allowJs: true,
          skipLibCheck: true,
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          strict: true,
          forceConsistentCasingInFileNames: true,
          noFallthroughCasesInSwitch: true,
          module: "esnext",
          moduleResolution: "node",
          resolveJsonModule: true,
          isolatedModules: true,
          noEmit: true,
          jsx: "react-jsx",
        },
        include: ["src"],
      },
      null,
      2,
    ),
  };

  // 3. Setup Boilerplate Files (Providers, Auth, Client, Constants, Hooks)
  files["src/api-services/providers/QueryProvider.tsx"] = {
    isBinary: false,
    content: QUERY_PROVIDER_CONTENT,
  };
  files["src/api-services/auth/AuthProvider.tsx"] = {
    isBinary: false,
    content: AUTH_PROVIDER_CONTENT,
  };
  files["src/api-services/auth/manager.ts"] = {
    isBinary: false,
    content: AUTH_MANAGER_CONTENT,
  };
  files["src/api-services/auth/types.ts"] = {
    isBinary: false,
    content: AUTH_TYPES_CONTENT,
  };

  files["src/api-services/auth/cookie-auth/CookieAuthGuard.tsx"] = {
    isBinary: false,
    content: COOKIE_GUARD_CONTENT,
  };
  files["src/api-services/auth/cookie-auth/provider.ts"] = {
    isBinary: false,
    content: COOKIE_PROVIDER_CONTENT,
  };

  files["src/api-services/auth/localstorage-auth/LocalStorageAuthGuard.tsx"] = {
    isBinary: false,
    content: LOCALSTORAGE_GUARD_CONTENT,
  };
  files["src/api-services/auth/localstorage-auth/provider.ts"] = {
    isBinary: false,
    content: LOCALSTORAGE_PROVIDER_CONTENT,
  };

  files["src/api-services/user-config/auth.ts"] = {
    isBinary: false,
    content: USER_CONFIG_AUTH_CONTENT,
  };
  files["src/api-services/user-config/constants.ts"] = {
    isBinary: false,
    content: `export const baseURL = "${baseURL || "https://api.example.com"}";\n`,
  };

  files["src/api-services/hooks/useAuth.ts"] = {
    isBinary: false,
    content: USE_AUTH_HOOK_CONTENT,
  };
  files["src/api-services/hooks/useNotification.ts"] = {
    isBinary: false,
    content: USE_NOTIFICATION_HOOK_CONTENT,
  };

  files["src/api-services/api-client/core.ts"] = {
    isBinary: false,
    content: BASE_API_CLIENT_CONTENT,
  };
  files["src/api-services/api-client/index.ts"] = {
    isBinary: false,
    content: INDEX_HOOKS_CONTENT,
  };

  const moduleNames = Object.keys(modules).sort();

  // 4. Inject Generated Definitions, Types, and Hooks
  let indexHooksContent = REACT_QUERY_WRAPPERS_CONTENT + "\n";
  const barrelExports: string[] = [];

  moduleNames.forEach((modName) => {
    // A. Definitions
    let cleanContent = modules[modName].replace(
      /import\s+{([^}]+)}\s+from\s+['"].*?['"];?/g,
      (match, imports) => {
        if (imports.includes("CLIENT")) {
          return `import { CLIENT } from '../core';`;
        }
        return match;
      },
    );
    files[`src/api-services/definitions/${modName}.ts`] = {
      isBinary: false,
      content: cleanContent,
    };

    barrelExports.push(
      `import { ${modName}Api } from "./definitions/${modName}";`,
    );

    // B. Types and Hooks (Ported logic from node backend)
    const methods = config.manifest?.[modName];
    if (methods) {
      const methodNames = Object.keys(methods);
      const hookFrequency = new Map();
      methodNames.forEach((m) => {
        const hook = getHookName(m);
        hookFrequency.set(hook, (hookFrequency.get(hook) || 0) + 1);
      });

      // Types
      methodNames.forEach((methodName) => {
        if (methodName.startsWith("delete_")) return;
        files[`src/api-services/types/${modName}/${methodName}.ts`] = {
          isBinary: false,
          content: `export type ${methodName} = unknown;\n`,
        };
      });

      // Hooks
      const keyFactoryName = `${modName}Keys`;
      const keyFactory = generateKeyFactory(modName, methodNames, methods);
      const hooks = methodNames.map((methodName) => {
        const methodDef = methods[methodName];
        return toHookContent(
          methodName,
          methodDef.args || [],
          modName,
          keyFactoryName,
          methodDef.requiresAuth,
          methodDef.contentType,
        );
      });

      let usedQuery = false;
      let usedMutation = false;
      methodNames.forEach((method) => {
        if (method.startsWith("get_")) usedQuery = true;
        else usedMutation = true;
      });

      const tanstackImports = [];
      if (usedMutation) {
        tanstackImports.push("useQueryClient");
        tanstackImports.push("type UseMutationOptions");
      }
      if (usedQuery) {
        tanstackImports.push("type UseQueryOptions");
      }
      const tanstackImportLine =
        tanstackImports.length > 0
          ? `import { ${tanstackImports.join(", ")} } from "@tanstack/react-query";`
          : "";
      const commonImports = [
        usedQuery && "useApiQuery",
        usedMutation && "useApiMutation",
      ]
        .filter(Boolean)
        .join(", ");
      const pascalModule = modName.charAt(0).toUpperCase() + modName.slice(1);

      const hookFileContent = `/* eslint-disable @typescript-eslint/no-explicit-any */
// Generated file - DO NOT EDIT
${tanstackImportLine}
import { ${modName}Api } from "../definitions/${modName}";
${commonImports ? `import { ${commonImports} } from ".";` : ""}

// Helper Types
type ApiData<T extends (...args: any) => any> = Awaited<ReturnType<T>>;
type ApiVars<T extends (...args: any) => any> = Parameters<T>[0];

${keyFactory}

${hooks.join("\n\n")}
`;
      files[`src/api-services/generated/use${pascalModule}Queries.ts`] = {
        isBinary: false,
        content: hookFileContent,
      };

      // Add to hooks index export
      const moduleHooks = methodNames.map((m) => getHookName(m));
      const hasConflict = moduleHooks.some((h) => hookFrequency.get(h) > 1);
      if (hasConflict) {
        indexHooksContent += `export {\n${moduleHooks.map((h) => (hookFrequency.get(h) > 1 ? `  ${h} as ${h.replace("use", `use${pascalModule}`)},` : `  ${h},`)).join("\n")}\n} from "./use${pascalModule}Queries";\n`;
      } else {
        indexHooksContent += `export * from "./use${pascalModule}Queries";\n`;
      }
    }
  });

  files["src/api-services/generated/index.ts"] = {
    isBinary: false,
    content: indexHooksContent,
  };

  files["src/api-services/index.ts"] = {
    isBinary: false,
    content: `${barrelExports.join("\n")}\n\nexport const api = {\n${moduleNames.map((name) => `  ...${name}Api,`).join("\n")}\n};`,
  };

  // 5. Index and App
  files["public/index.html"] = {
    isBinary: false,
    content: `<div id="root"></div>`,
  };

  files["src/index.tsx"] = {
    isBinary: false,
    content: `import React from "react";
import { createRoot } from "react-dom/client";
import { QueryProvider } from "./api-services/providers/QueryProvider";
import { AuthProvider } from "./api-services/auth/AuthProvider";
import App from "./App";

const rootElement = document.getElementById("root");
const root = createRoot(rootElement!);

root.render(
  <React.StrictMode>
    <QueryProvider>
      <AuthProvider strategy="localstorage">
         <App />
      </AuthProvider>
    </QueryProvider>
  </React.StrictMode>
);`,
  };

  // Find a query hook to demonstrate
  let firstMod = moduleNames.length > 0 ? moduleNames[0] : null;
  let demoHook = null;
  let pascalFirstMod = "";

  if (firstMod && config.manifest?.[firstMod]) {
    const methods = Object.keys(config.manifest[firstMod]);
    const getMethod = methods.find((m) => m.startsWith("get_"));
    if (getMethod) {
      demoHook = getHookName(getMethod);
      pascalFirstMod = firstMod.charAt(0).toUpperCase() + firstMod.slice(1);
    }
  }

  let appContent = `import React from 'react';\n\nexport default function App() {\n  return (\n    <div style={{ padding: '20px', fontFamily: 'system-ui, sans-serif' }}>\n      <h1>${collectionName || "API Client"}</h1>\n      <p>Your API client is ready to use.</p>\n    </div>\n  );\n}`;

  if (demoHook && pascalFirstMod) {
    appContent = `import React from 'react';
import { ${demoHook} } from './api-services/generated';

export default function App() {
  // Using the generated React Query hook!
  const { data, isLoading, error, refetch } = ${demoHook}();

  const isCorsError = error && (error as any).message === "Network Error";

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
      <h1>${collectionName || "API Client"} SDK</h1>
      <p style={{ color: '#4b5563' }}>This sandbox contains your fully generated, type-safe API client and React Query hooks.</p>
      
      <div style={{ margin: '20px 0', padding: '16px', border: '1px solid #e5e7eb', borderRadius: '8px', background: '#f9fafb' }}>
          <h3 style={{ marginTop: 0, fontSize: '16px' }}>Live Hook Demonstration</h3>
          <p style={{ fontSize: '14px', color: '#6b7280' }}>Executing: <code>${demoHook}()</code></p>
          
          <button 
            onClick={() => refetch()}
            style={{ padding: '8px 16px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 500 }}
          >
            {isLoading ? 'Fetching Data...' : 'Refetch Data'}
          </button>

          {error && (
            <div style={{ marginTop: '16px', padding: '12px', background: '#fef2f2', borderLeft: '4px solid #ef4444', borderRadius: '4px' }}>
                <p style={{ color: '#b91c1c', margin: 0, fontWeight: 600 }}>Error: {(error as any).message}</p>
                {isCorsError && (
                    <p style={{ color: '#991b1b', fontSize: '14px', marginTop: '8px', marginBottom: 0 }}>
                        <strong>Note:</strong> A "Network Error" usually means your backend API is blocking requests from CodeSandbox due to CORS (Cross-Origin Resource Sharing). 
                        The generated SDK code is still perfectly valid and will work when imported into your own local project.
                    </p>
                )}
            </div>
          )}

          {data && (
            <pre style={{ marginTop: '16px', padding: '16px', background: '#1e293b', color: '#e2e8f0', borderRadius: '8px', overflowX: 'auto', maxHeight: '400px', fontSize: '13px' }}>
              {JSON.stringify(data, null, 2)}
            </pre>
          )}
      </div>
    </div>
  );
}`;
  } else if (firstMod) {
    // Fallback to basic API client test if no GET query was found
    appContent = `import React, { useState } from 'react';
import { api } from './api-services';

export default function App() {
  const [result, setResult] = useState<any>(null);

  const testApi = async () => {
    try {
        setResult("API Client ready! Import 'api' from './api-services' to use it.");
    } catch (error) {
        setResult(error);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
      <h1>${collectionName || "API Client"} SDK</h1>
      <button onClick={testApi}>Test API</button>
      <pre>{JSON.stringify(result, null, 2)}</pre>
    </div>
  );
}`;
  }

  files["src/App.tsx"] = { isBinary: false, content: appContent };

  return { files };
};

export const openInCodeSandbox = (
  collectionName: string,
  baseURL: string,
  modules: Record<string, string>,
  config: any,
) => {
  const payload = createSandboxPayload(
    collectionName,
    baseURL,
    modules,
    config,
  );
  const parameters = compress(JSON.stringify(payload));

  const form = document.createElement("form");
  form.method = "POST";
  form.target = "_blank";
  form.action = "https://codesandbox.io/api/v1/sandboxes/define";

  const paramsInput = document.createElement("input");
  paramsInput.type = "hidden";
  paramsInput.name = "parameters";
  paramsInput.value = parameters;
  form.appendChild(paramsInput);

  document.body.appendChild(form);
  form.submit();
  document.body.removeChild(form);
};
