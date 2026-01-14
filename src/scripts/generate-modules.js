// scripts/generate-modules.ts

const fs = require("fs");
const path = require("path");

const {
  API_DEFINITIONS_DIR,
  CLIENT_CONFIG_DIR,
  PROVIDERS_DIR,

  API_MODULES_PATH,
  API_SERVICES_CONFIG_DIR,
  API_SERVICES_DIR
} = require("../paths");

const apiDir = API_DEFINITIONS_DIR;
const apiConfigDir = CLIENT_CONFIG_DIR;
const providersDir = PROVIDERS_DIR;
const apiServicesIndexPath = path.join(API_SERVICES_DIR, "index.ts");

const manifestPath = API_MODULES_PATH;
const configDir = API_SERVICES_CONFIG_DIR;
const indexPath = path.resolve(configDir, "index.ts");
const utilsPath = path.resolve(configDir, "utils.ts");



// Ensure the endpoints directory exists
if (!fs.existsSync(apiDir)) {
  fs.mkdirSync(apiDir, { recursive: true });
  console.log(`📁 Created directory: ${apiDir}`);
}

// Ensure the config directory exists
if (!fs.existsSync(apiConfigDir)) {
  fs.mkdirSync(apiConfigDir, { recursive: true });
  console.log(`📁 Created directory: ${apiConfigDir}`);
}

// Ensure the api-services/config directory exists
if (!fs.existsSync(configDir)) {
  fs.mkdirSync(configDir, { recursive: true });
  console.log(`📁 Created directory: ${configDir}`);
}

// Ensure the providers directory exists
if (!fs.existsSync(providersDir)) {
  fs.mkdirSync(providersDir, { recursive: true });
  console.log(`📁 Created directory: ${providersDir}`);
}

// Create index.ts in config folder if it doesn't exist
if (!fs.existsSync(indexPath)) {
  const indexContent = `/* eslint-disable @typescript-eslint/no-explicit-any */

// index.ts

import axios, { AxiosResponse, AxiosError } from "axios";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface ApiError {
  message: string;
  code?: string;
  statusCode?: number;
}

export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
}

// ============================================================================
// REQUEST CONFIG
// ============================================================================

export const baseURL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000/api";

export const BASE_CLIENT = axios.create({
  baseURL,
  timeout: 30000,
});

export const BASE_CLIENT_V1 = axios.create({
  baseURL: baseURL + "/v1",
  timeout: 30000,
});

export const AUTH_CLIENT = axios.create({
  baseURL: baseURL + "/auth",
  timeout: 30000,
});

// ============================================================================
// REQUEST INTERCEPTOR (attach token)
// ============================================================================

const attachTokenInterceptor = (client: any) => {
  client.interceptors.request.use((config: any) => {
    const token = ""; // READ FROM STATE
    if (token) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = \`Bearer \${token}\`;
    }
    return config;
  });
};

attachTokenInterceptor(BASE_CLIENT);
attachTokenInterceptor(BASE_CLIENT_V1);
attachTokenInterceptor(AUTH_CLIENT);

// ============================================================================
// RESPONSE INTERCEPTOR (handle 401)
// ============================================================================

const attachErrorInterceptor = (client: any) => {
  client.interceptors.response.use(
    (res: AxiosResponse) => res,
    async (err: AxiosError) => {
      if (err.response?.status === 401) {
        console.warn("[AUTH] Unauthorized → Token cleared.");
      }
      return Promise.reject(err);
    }
  );
};

attachErrorInterceptor(BASE_CLIENT);
attachErrorInterceptor(BASE_CLIENT_V1);
attachErrorInterceptor(AUTH_CLIENT);
`;

  fs.writeFileSync(indexPath, indexContent);
  console.log("✅ index.ts created in api-services/config folder!");
} else {
  console.log(
    "ℹ️  index.ts already exists in api-services/config folder, skipping..."
  );
}

// Create utils.ts in config folder if it doesn't exist
if (!fs.existsSync(utilsPath)) {
  const utilsContent = `/* eslint-disable @typescript-eslint/no-explicit-any */

//utils.ts

import { AxiosResponse } from "axios";
import { ApiError, ApiResponse } from ".";

// ============================================================================
// ERROR HANDLING
// ============================================================================

export const handleError = (error: any, label?: string): ApiError => {
  const message =
    error?.response?.data?.msg ||
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    "An unexpected error occurred";

  const apiError: ApiError = {
    message,
    code: error?.response?.data?.code,
    statusCode: error?.response?.status,
  };

  console.error(\`[API ERROR - \${label}]\`, apiError);
  return apiError;
};

// ============================================================================
// API CALL WRAPPER
// ============================================================================

export const handleApiCall = async <T>(
  fn: () => Promise<AxiosResponse<T>>,
  label: string
): Promise<ApiResponse<T>> => {
  try {
    const res = await fn();
    return { data: res.data };
  } catch (err: any) {
    return { error: handleError(err, label) };
  }
};

// ============================================================================
// QUERY UTIL
// ============================================================================

export const constructQueryParams = (payload: Record<string, any>): string => {
  const query = Object.entries(payload)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(
      ([k, v]) => \`\${encodeURIComponent(k)}=\${encodeURIComponent(String(v))}\`
    )
    .join("&");

  return query ? \`?\${query}\` : "";
};
`;

  fs.writeFileSync(utilsPath, utilsContent);
  console.log("✅ utils.ts created in api-services/config folder!");
} else {
  console.log(
    "ℹ️  utils.ts already exists in api-services/config folder, skipping..."
  );
}


// Generate apiModules.ts manifest
const files = fs.readdirSync(apiDir).filter((f) => f.endsWith(".ts"));

if (files.length === 0) {
  console.warn(`⚠️ No API files found in ${apiDir}.`);
  fs.writeFileSync(
    manifestPath,
    `// No API files found in "${apiDir}".\n\nexport const apiModules = {};\n`
  );
  // Continue to generate empty index.ts so imports are cleared
}

// Calculate correct relative path dynamically
const relativePathToApis = path
  .relative(apiConfigDir, apiDir)
  .replace(/\\/g, "/");

// Verify export naming and warn
const imports = files
  .map((file) => {
    const name = file.replace(".ts", "");
    const varName = `${name}Api`;

    const filePath = path.join(apiDir, file);
    const content = fs.readFileSync(filePath, "utf8");

    if (!content.includes(`export const ${varName}`)) {
      console.warn(
        `⚠️  Warning: ${file} does not export "${varName}" as expected.`
      );
    }

    return `import { ${varName} } from '${relativePathToApis}/${name}';`;
  })
  .join("\n");

const exportBlock = files
  .map((file) => {
    const name = file.replace(".ts", "");
    const varName = `${name}Api`;
    return `  '${name}': ${varName},`;
  })
  .join("\n");

const content = `
// This file is auto-generated. Do not edit manually.

${imports}

export const apiModules = {
${exportBlock}
};
`;

fs.writeFileSync(manifestPath, content.trim() + "\n");
console.log("✅ apiModules.ts generated!");


// ============================================================================
// GENERATE api-services/index.ts
// ============================================================================

// 1. Calculate imports for index.ts (relative to api-services/index.ts)
// definitions are in ./definitions relative to api-services/
const indexImports = files
  .map((file) => {
    const name = file.replace(".ts", "");
    const varName = `${name}Api`;
    return `import { ${varName} } from "./definitions/${name}";`;
  })
  .join("\n");

// 2. Calculate spread exports
const spreadExports = files
  .map((file) => {
    const name = file.replace(".ts", "");
    const varName = `${name}Api`;
    return `  ...${varName},`;
  })
  .join("\n");

const indexContent = `
export * from "./config";
export * from "./config/utils";

${indexImports}

// Export all apis

export const apiClient = {
${spreadExports}
};
`;

fs.writeFileSync(apiServicesIndexPath, indexContent.trim() + "\n");
console.log("✅ api-services/index.ts generated!");
