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

// Ensure the config directory exists (Local Tool Config)
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

// Config scaffolding moved to api-npm-client (Bridge)
// This script now only handles apiModules.ts generation if needed (Legacy?)

if (!fs.existsSync(apiServicesIndexPath)) {
  // We might still need to ensure the directory exists for apiModules
  if (!fs.existsSync(configDir)) {
    // We do NOT scaffold content here anymore.
    // fs.mkdirSync(configDir, { recursive: true });
  }
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
