import * as LZString from "lz-string";
import {
  REEX_PROVIDER_CONTENT,
  CUSTOM_INDEX_CONTENT,
  LOADING_SCREEN_CONTENT,
  APP_NOTIFICATION_CONTENT,
  APP_NOTIFICATION_CSS_CONTENT,
  AUTH_PROVIDER_CONTENT,
  AUTH_MANAGER_CONTENT,
  AUTH_TYPES_CONTENT,
  API_CONFIG_CONTENT,
  COOKIE_GUARD_CONTENT,
  COOKIE_PROVIDER_CONTENT,
  JWT_GUARD_CONTENT,
  JWT_PROVIDER_CONTENT,
  USE_AUTH_SESSION_HOOK_CONTENT,
  USE_NOTIFICATION_HOOK_CONTENT,
  USE_HEADERS_HOOK_CONTENT,
  BASE_API_CLIENT_CONTENT,
  QUERY_CONFIG_CONTENT,
  REEX_CONFIG_CONTENT,
  REEX_METADATA_CONTENT,
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
  files["src/api-services/providers/ReexProvider.tsx"] = {
    isBinary: false,
    content: REEX_PROVIDER_CONTENT,
  };
  
  files["src/api-services/custom/index.ts"] = {
    isBinary: false,
    content: CUSTOM_INDEX_CONTENT,
  };
  files["src/api-services/custom/loadingScreen/LoadingScreen.tsx"] = {
    isBinary: false,
    content: LOADING_SCREEN_CONTENT,
  };
  files["src/api-services/custom/notification/AppNotification/AppNotification.tsx"] = {
    isBinary: false,
    content: APP_NOTIFICATION_CONTENT,
  };
  files["src/api-services/custom/notification/AppNotification/AppNotification.module.css"] = {
    isBinary: false,
    content: APP_NOTIFICATION_CSS_CONTENT,
  };
  files["src/api-services/auth-methods/AuthProvider.tsx"] = {
    isBinary: false,
    content: AUTH_PROVIDER_CONTENT,
  };
  files["src/api-services/auth-methods/manager.ts"] = {
    isBinary: false,
    content: AUTH_MANAGER_CONTENT,
  };
  files["src/api-services/auth-methods/types.ts"] = {
    isBinary: false,
    content: AUTH_TYPES_CONTENT,
  };

  files["src/api-services/auth-methods/cookie-auth/CookieAuthGuard.tsx"] = {
    isBinary: false,
    content: COOKIE_GUARD_CONTENT,
  };
  files["src/api-services/auth-methods/cookie-auth/provider.ts"] = {
    isBinary: false,
    content: COOKIE_PROVIDER_CONTENT,
  };

  files["src/api-services/auth-methods/jwt-auth/JwtAuthGuard.tsx"] = {
    isBinary: false,
    content: JWT_GUARD_CONTENT,
  };
  files["src/api-services/auth-methods/jwt-auth/provider.ts"] = {
    isBinary: false,
    content: JWT_PROVIDER_CONTENT,
  };

  files["src/api-services/.reex/config.ts"] = {
    isBinary: false,
    content: REEX_CONFIG_CONTENT,
  };
  files["src/api-services/.reex/metadata.json"] = {
    isBinary: false,
    content: REEX_METADATA_CONTENT,
  };

  const apiConfigContent = API_CONFIG_CONTENT.replace(
    /"https:\/\/example\.com\/api\/v1"|"https:\/\/api\.money\.orki\.io"/, 
    `"${baseURL || "https://example.com/api/v1"}"`
  );
  files["src/api-services/api.config.ts"] = {
    isBinary: false,
    content: apiConfigContent,
  };

  files["src/api-services/hooks/useAuthSession.ts"] = {
    isBinary: false,
    content: USE_AUTH_SESSION_HOOK_CONTENT,
  };
  files["src/api-services/hooks/useNotification.ts"] = {
    isBinary: false,
    content: USE_NOTIFICATION_HOOK_CONTENT,
  };
  files["src/api-services/hooks/useHeaders.ts"] = {
    isBinary: false,
    content: USE_HEADERS_HOOK_CONTENT,
  };

  files["src/api-services/core.ts"] = {
    isBinary: false,
    content: BASE_API_CLIENT_CONTENT,
  };

  const moduleNames = Object.keys(modules).sort();

  const globalHookFrequency = new Map<string, number>();
  if (config.manifest) {
    moduleNames.forEach((modName) => {
      const methods = config.manifest?.[modName];
      if (methods) {
        Object.keys(methods).forEach((m) => {
          const hook = getHookName(m);
          globalHookFrequency.set(hook, (globalHookFrequency.get(hook) || 0) + 1);
        });
      }
    });
  }

  // 4. Inject Generated Definitions, Types, and Hooks
  let indexHooksContent = "";
  const barrelExports: string[] = [];

  moduleNames.forEach((modName) => {
    // A. Definitions
    let cleanContent = modules[modName].replace(
      /import\s+{([^}]+)}\s+from\s+['"].*?['"];?/g,
      (match, imports) => {
        if (imports.includes("CLIENT") || imports.includes("apiClient")) {
          return `import { apiClient } from '../core';`;
        }
        return match;
      },
    );
    files[`src/api-services/definitions/${modName}.ts`] = {
      isBinary: false,
      content: cleanContent,
    };

    // B. Types and Hooks (Ported logic from node backend)
    const methods = config.manifest?.[modName];
    if (methods) {
      const methodNames = Object.keys(methods);

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
${commonImports ? `import { ${commonImports} } from "./query.config";` : ""}

// Helper Types
type ApiData<T extends (...args: any) => any> = Awaited<ReturnType<T>>;
type ApiVars<T extends (...args: any) => any> = Parameters<T> extends [] ? void : Parameters<T>[0];

${keyFactory}

${hooks.join("\n\n")}
`;
      files[`src/api-services/generated/use${pascalModule}Queries.ts`] = {
        isBinary: false,
        content: hookFileContent,
      };

      // Add to hooks index export
      const moduleHooks = methodNames.map((m) => getHookName(m));
      const hasConflict = moduleHooks.some((h) => (globalHookFrequency.get(h) || 0) > 1);
      if (hasConflict) {
        indexHooksContent += `export {\n${moduleHooks.map((h) => ((globalHookFrequency.get(h) || 0) > 1 ? `  ${h} as ${h.replace("use", `use${pascalModule}`)},` : `  ${h},`)).join("\n")}\n} from "./use${pascalModule}Queries";\n`;
      } else {
        barrelExports.push(`export * from "./use${pascalModule}Queries";`);
      }
    }
  });

  indexHooksContent += barrelExports.join("\n");
  
  files["src/api-services/generated/index.ts"] = {
    isBinary: false,
    content: indexHooksContent,
  };

  files["src/api-services/generated/query.config.ts"] = {
    isBinary: false,
    content: QUERY_CONFIG_CONTENT,
  };

  files["src/api-services/definitions/index.ts"] = {
    isBinary: false,
    content: `import { type ReexDefinition } from "../.reex/config";\n\n${moduleNames.map((modName) => `import { ${modName}Api } from "./${modName}";`).join("\n")}\n\nexport const api = {\n${moduleNames.map((name) => `  ...${name}Api,`).join("\n")}\n} satisfies ReexDefinition;`,
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
import { ReexProvider } from "./api-services/providers/ReexProvider";
import App from "./App";

const rootElement = document.getElementById("root");
const root = createRoot(rootElement!);

root.render(
  <React.StrictMode>
    <ReexProvider strategy="jwt">
      <App />
    </ReexProvider>
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
import { api } from './api-services/definitions';

export default function App() {
  const [result, setResult] = useState<any>(null);

  const testApi = async () => {
    try {
        setResult("API Client ready! Import 'api' from './api-services/definitions' to use it.");
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
