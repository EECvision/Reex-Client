const fs = require("fs");
const path = require("path");
const { API_DEFINITIONS_DIR, API_SERVICES_DIR, CLIENT_CONFIG_DIR } = require("../paths");

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length === 0) {
  console.error("❌ Error: module name is required");
  console.log("Usage: node generate-api-template users");
  process.exit(1);
}

const moduleName = args[0].replace(/^-+/, ""); // Remove leading dashes if any
// Use constants from paths.js
const apiDir = API_DEFINITIONS_DIR;
const apiServicesDir = API_SERVICES_DIR;
const indexPath = path.join(apiServicesDir, "index.ts");
const templateFilePath = path.join(apiDir, `${moduleName}.ts`);

// Ensure the definitions directory exists
if (!fs.existsSync(apiDir)) {
  fs.mkdirSync(apiDir, { recursive: true });
  console.log(`📁 Created directory: ${apiDir}`);
}

// Ensure the api-services directory exists
if (!fs.existsSync(apiServicesDir)) {
  fs.mkdirSync(apiServicesDir, { recursive: true });
  console.log(`📁 Created directory: ${apiServicesDir}`);
}

// Check if template file already exists
if (fs.existsSync(templateFilePath)) {
  console.error(`❌ Error: ${moduleName}.ts already exists in ${apiDir}`);
  process.exit(1);
}

// Capitalize first letter for type names
const capitalize = (str: string): string =>
  str.charAt(0).toUpperCase() + str.slice(1);
const TypeName = capitalize(moduleName.replace(/s$/, "")); // Remove trailing 's' for singular

// Generate the template content
const templateContent = `/* eslint-disable @typescript-eslint/no-explicit-any */
import { BASE_CLIENT } from "../config";
import { constructQueryParams, handleApiCall } from "../config/utils";

// --- Types ---

interface ${TypeName} {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
}

interface Get${TypeName}sParams {
  search?: string;
  limit?: number;
  page_size?: string;
  status?: ${TypeName}["status"];
}

interface Create${TypeName}Payload {
  email: string;
  first_name: string;
  last_name: string;
  status: ${TypeName}["status"];
}

interface Update${TypeName}Params {
  id: string;
  payload: Partial<Create${TypeName}Payload>;
}

// --- API Definition --- 

export const ${moduleName}Api = {
  get_list${TypeName}s: async (
    params: Get${TypeName}sParams
  ): Promise<any> => {
    const queryString = constructQueryParams(params);
    const url = \`/${moduleName}\${queryString}\`;

    const res = await handleApiCall(
      () => BASE_CLIENT.get(url),
      "get_list${TypeName}s"
    );
    return res.data;
  },

  get_${moduleName.slice(
  0,
  -1
)}Detail: async ({ id } : { id: string }): Promise<any> => {
    const url = \`/${moduleName}/\${id}\`;
    const res = await handleApiCall(
      () => BASE_CLIENT.get(url),
      "get_${moduleName.slice(0, -1)}Detail"
    );
    return res.data;
  },

  post_create${TypeName}: async (
    payload: Create${TypeName}Payload
  ): Promise<any> => {
    const url = "/${moduleName}";
    const res = await handleApiCall(
      () => BASE_CLIENT.post(url, payload),
      "post_create${TypeName}"
    );
    return res.data;
  },

  put_update${TypeName}: async ({
    id,
    payload,
  }: Update${TypeName}Params): Promise<any> => {
    const url = \`/${moduleName}/\${id}\`;
    const res = await handleApiCall(
      () => BASE_CLIENT.put(url, payload),
      "put_update${TypeName}"
    );
    return res.data;
  },

  delete_remove${TypeName}: async ({ id } : { id: string }): Promise<any> => {
    const url = \`/${moduleName}/\${id}\`;
    await handleApiCall(() => BASE_CLIENT.delete(url), "delete_remove${TypeName}");
  },
};
`;

// Write the template file
fs.writeFileSync(templateFilePath, templateContent);
console.log(`✅ Created ${moduleName}.ts in definitions folder!`);

// Create or update index.ts
console.log(`✅ Template created. Run 'npm run gen:types' to update index.ts`);

console.log("\n🎉 Template generation complete!");
console.log(`📝 File created: ${moduleName}.ts`);
console.log(`📝 Updated: api-services/index.ts (will be generated)`);
