// scripts/generate-manifest.ts

(() => {
  const fs = require("fs");
  const path = require("path");
  // @ts-ignore
  const { API_DEFINITIONS_DIR, API_MANIFEST_PATH } = require("../paths");
  const { Project, SyntaxKind } = require("ts-morph");

  const apiDir = API_DEFINITIONS_DIR;
  const manifestPath = API_MANIFEST_PATH;

  const project = new Project({
    tsConfigFilePath: path.resolve(__dirname, "../../tsconfig.json"),
  });

  console.log(`[DEBUG] API_DEFINITIONS_DIR: ${apiDir}`);
  const files = fs.readdirSync(apiDir).filter((f: string) => f.endsWith(".ts"));
  console.log(`[DEBUG] Found ${files.length} files:`, files);

  const apiManifest: Record<string, any> = {};

  // ... (Code omitted for brevity) ...

  for (const file of files) {
    const moduleName = file.replace(".ts", "");
    const filePath = path.join(apiDir, file);
    console.log(`[DEBUG] Processing ${file} at ${filePath}`);

    const existingFile = project.getSourceFile(filePath);
    if (existingFile) project.removeSourceFile(existingFile);

    const sourceFile = project.addSourceFileAtPath(filePath);
    const exports = sourceFile.getExportedDeclarations();
    console.log(`[DEBUG] Found ${exports.size} exports in ${file}`);

    const moduleExports: Record<string, any> = {};
    let count = 0;

    for (const [exportName, declarations] of exports) {
      console.log(`  [DEBUG] Inspecting export: ${exportName}`);
      for (const declaration of declarations) {
        const kind = declaration.getKind();
        console.log(`    [DEBUG] Kind: ${kind}`);

        if (kind === SyntaxKind.VariableDeclaration) {
          const initializer = declaration.getInitializer();

          if (initializer) {
            console.log(`    [DEBUG] Initializer Kind: ${initializer.getKind()}`);
          }

          if (
            initializer &&
            initializer.getKind() === SyntaxKind.ObjectLiteralExpression
          ) {
            const properties = initializer.getProperties();
            console.log(`    [DEBUG] Found ObjectLiteral with ${properties.length} properties`);

            for (const property of properties) {
              if (property.getKind() === SyntaxKind.PropertyAssignment) {
                const methodName = property.getName();
                const init = property.getInitializer();

                if (init) console.log(`      [DEBUG] Property ${methodName} init kind: ${init.getKind()}`);

                if (
                  init &&
                  (init.getKind() === SyntaxKind.ArrowFunction ||
                    init.getKind() === SyntaxKind.FunctionExpression)
                ) {
                  // ... logic ...
                  count++;
                  console.log(`      [DEBUG] valid function found: ${methodName}`);
                }
              }
            }
          }
          // ... 
        }
      }
    }

    console.log(`[DEBUG] Module ${moduleName} count: ${count}`);
    if (count) apiManifest[moduleName] = moduleExports;
  }

  const output = `/* eslint-disable @typescript-eslint/no-explicit-any */
// This file is auto-generated.

export interface ApiParameter {
  name: string;
  isOptional: boolean;
  type?: string;
  isObject?: boolean;
  properties?: Array<{
    name: string;
    isOptional: boolean;
    type?: string;
    isObject?: boolean;
    properties?: any[];
  }>;
}

export interface ApiMethod {
  args: ApiParameter[];
}

export interface ApiManifest {
  [module: string]: {
    [method: string]: ApiMethod;
  };
}

export const apiManifest: ApiManifest = ${JSON.stringify(apiManifest, null, 2)};
`;

  const dir = path.dirname(manifestPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(manifestPath, output.trim() + "\n");

  // Also write JSON for easy consumption by API / Frontend without compilation
  const jsonPath = manifestPath.replace('.ts', '.json');
  fs.writeFileSync(jsonPath, JSON.stringify(apiManifest, null, 2));
})();
