// scripts/delete-collection.ts

import * as fs from "fs";
import * as path from "path";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { API_DEFINITIONS_DIR, API_TYPES_DIR, API_SERVICES_DIR, API_MODULES_PATH } = require("../paths");



const apiDir = API_DEFINITIONS_DIR;
const typesDir = API_TYPES_DIR;
const apiServicesDir = API_SERVICES_DIR;
const indexPath = path.join(apiServicesDir, "index.ts");
const apiModulesPath = API_MODULES_PATH;

function deletePathRecursive(targetPath: string): void {
  if (fs.existsSync(targetPath)) {
    if (fs.lstatSync(targetPath).isDirectory()) {
      fs.readdirSync(targetPath).forEach((file: string) => {
        const curPath = path.join(targetPath, file);
        deletePathRecursive(curPath);
      });
      fs.rmdirSync(targetPath);
      console.log(`✓ Deleted directory: ${targetPath}`);
    } else {
      fs.unlinkSync(targetPath);
      console.log(`✓ Deleted file: ${targetPath}`);
    }
  } else {
    console.log(`✗ Path does not exist: ${targetPath}`);
  }
}

function resetApiModules(): void {
  const emptyContent = `// This file is auto-generated. Do not edit manually.

export const apiModules = {};
`;

  if (fs.existsSync(apiModulesPath)) {
    fs.writeFileSync(apiModulesPath, emptyContent);
    console.log(`✓ Reset apiModules.ts`);
  }
}

console.log("Starting cleanup...\n");

deletePathRecursive(apiDir);
deletePathRecursive(typesDir);
deletePathRecursive(indexPath);
resetApiModules();

console.log("\nCleanup complete!");

