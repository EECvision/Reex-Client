// scripts/generate-types.ts

const ts = require("typescript");
const fs = require("fs");
const vm = require("vm");
const path = require("path");
const { API_DEFINITIONS_DIR, API_TYPES_DIR, API_MANIFEST_PATH } = require("../paths");

const manifestPath = API_MANIFEST_PATH;
const tsContent = fs.readFileSync(manifestPath, "utf8");

const transpiled = ts.transpileModule(tsContent, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;

const sandbox = { exports: {} };
vm.createContext(sandbox);
vm.runInContext(transpiled, sandbox);

const apiManifest = sandbox.exports.apiManifest;

const apiDir = API_DEFINITIONS_DIR;
const typesDir = API_TYPES_DIR;

console.log("📁 API Directory:", apiDir);
console.log("📁 Types Directory:", typesDir);

if (!fs.existsSync(typesDir)) {
  fs.mkdirSync(typesDir, { recursive: true });
  console.log("📂 Created types directory:", typesDir);
}

if (!fs.existsSync(apiDir)) {
  console.error("❌ API directory not found:", apiDir);
  process.exit(1);
}

function getExportedFunctionNames(filePath) {
  const fileContent = fs.readFileSync(filePath, "utf8");
  const sourceFile = ts.createSourceFile(
    filePath,
    fileContent,
    ts.ScriptTarget.Latest,
    true
  );
  const functionNames = new Set();

  function visit(node) {
    if (
      ts.isPropertyAssignment(node) &&
      ts.isIdentifier(node.name) &&
      ts.isFunctionLike(node.initializer)
    ) {
      functionNames.add(node.name.text);
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return [...functionNames];
}

function toInterfaceContent(name, args) {
  const isEmpty =
    !args?.length ||
    (args.length === 1 &&
      args[0].isObject &&
      (!args[0].properties || args[0].properties.length === 0));

  if (isEmpty) {
    return `export type ${name} = unknown;\n`;
  }

  const lines = [`export interface ${name} {`];
  const indent = "  ";

  if (
    args.length === 1 &&
    args[0].isObject &&
    Array.isArray(args[0].properties)
  ) {
    for (const prop of args[0].properties) {
      lines.push(
        `${indent}${prop.name}${prop.isOptional ? "?" : ""}: ${prop.type};`
      );
    }
  } else {
    for (const arg of args) {
      lines.push(
        `${indent}${arg.name}${arg.isOptional ? "?" : ""}: ${arg.type ?? "any"
        };`
      );
    }
  }

  lines.push("}");
  return lines.join("\n") + "\n";
}

function toMockContent(args) {
  const mock = {};

  if (
    args.length === 1 &&
    args[0].isObject &&
    Array.isArray(args[0].properties)
  ) {
    for (const prop of args[0].properties) {
      const value =
        prop.type === "string"
          ? `mock_${prop.name}`
          : prop.type === "number"
            ? 0
            : prop.type === "boolean"
              ? true
              : null;
      mock[prop.name] = value;
    }
  } else {
    for (const arg of args) {
      if (arg.isObject && arg.properties?.length) {
        mock[arg.name] = {};
        for (const prop of arg.properties) {
          const value =
            prop.type === "string"
              ? `mock_${prop.name}`
              : prop.type === "number"
                ? 0
                : prop.type === "boolean"
                  ? true
                  : null;
          mock[arg.name][prop.name] = value;
        }
      } else {
        mock[arg.name] = arg.type === "string" ? `mock_${arg.name}` : null;
      }
    }
  }

  return JSON.stringify(mock, null, 2) + "\n";
}

function parseInterfaceForMock(tsContent) {
  const mock = {};
  const match = tsContent.match(/interface\s+\w+\s*{([\s\S]*?)}/);
  if (!match) return mock;

  const body = match[1];
  const lines = body
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    const [rawKey, rawType] = line
      .replace(/;$/, "")
      .split(":")
      .map((s) => s.trim());
    const key = rawKey.replace(/\?$/, "");
    const type = rawType;

    const value =
      type === "string"
        ? `mock_${key}`
        : type === "number"
          ? 0
          : type === "boolean"
            ? true
            : null;

    mock[key] = value;
  }

  return mock;
}

function syncTypeFiles() {
  const allApiFiles = fs
    .readdirSync(apiDir)
    .filter((file) => file.endsWith(".ts"));

  const expectedTypeFiles = new Set();

  allApiFiles.forEach((file) => {
    const fileNameWithoutExt = path.basename(file, ".ts");
    const fullPath = path.join(apiDir, file);
    const functionNames = getExportedFunctionNames(fullPath);

    const apiTypeSubDir = path.join(typesDir, fileNameWithoutExt);
    if (!fs.existsSync(apiTypeSubDir)) {
      fs.mkdirSync(apiTypeSubDir, { recursive: true });
      console.log(`📂 Created subfolder: ${fileNameWithoutExt}`);
    }

    functionNames.forEach((name) => {
      if (name.startsWith("delete_")) return;

      const typeFileName = `${name}.ts`;
      const mockFileName = `${name}.mock.json`;
      const typeFilePath = path.join(apiTypeSubDir, typeFileName);
      const mockFilePath = path.join(apiTypeSubDir, mockFileName);

      expectedTypeFiles.add(typeFilePath);
      expectedTypeFiles.add(mockFilePath);

      const typeFileExists = fs.existsSync(typeFilePath);

      const methodManifest = apiManifest?.[fileNameWithoutExt]?.[name];

      let interfaceContent = `export type ${name} = unknown;\n`;
      let mockContent = "";

      if (methodManifest && name.match(/^(post|put|patch)_/)) {
        interfaceContent = toInterfaceContent(name, methodManifest.args);
        mockContent = toMockContent(methodManifest.args);
      }

      const hasManualFlag =
        typeFileExists &&
        fs
          .readFileSync(typeFilePath, "utf8")
          .includes("/* sync-type-disable */");

      // 🚫 Special handling for get_
      if (name.startsWith("get_")) {
        if (typeFileExists) {
          const content = fs.readFileSync(typeFilePath, "utf8").trim();
          const defaultContent = `export type ${name} = unknown;`.trim();

          if (content !== "" && content !== defaultContent) {
            console.log(
              `✋ Skipped all (custom get_): ${fileNameWithoutExt}/${typeFileName}`
            );
            return;
          }
        }

        interfaceContent = `export type ${name} = unknown;\n`;
        mockContent = "{}\n";
      }

      if (!hasManualFlag) {
        fs.writeFileSync(typeFilePath, interfaceContent, "utf8");
        console.log(`✅ Generated: ${fileNameWithoutExt}/${typeFileName}`);
      } else {
        console.log(
          `✋ Skipped (manual): ${fileNameWithoutExt}/${typeFileName}`
        );
      }

      let finalMockContent = mockContent;
      if (hasManualFlag) {
        const manualContent = fs.readFileSync(typeFilePath, "utf8");
        finalMockContent =
          JSON.stringify(parseInterfaceForMock(manualContent), null, 2) + "\n";
      }

      if (false) {
        // uncomment this line to generate mock.json files
        fs.writeFileSync(mockFilePath, finalMockContent, "utf8");
        console.log(`🧪 Synced: ${fileNameWithoutExt}/${mockFileName}`);
      }
    });
  });

  const walkAndClean = (dir) => {
    if (!fs.existsSync(dir)) return;

    const entries = fs.readdirSync(dir);
    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        walkAndClean(fullPath);
        const remaining = fs.readdirSync(fullPath);
        if (remaining.length === 0) {
          fs.rmdirSync(fullPath);
          console.log(`🗑️ Deleted empty folder: ${fullPath}`);
        }
      } else if (!expectedTypeFiles.has(fullPath)) {
        fs.unlinkSync(fullPath);
        console.log(`🗑️ Deleted: ${fullPath}`);
      }
    }
  };

  walkAndClean(typesDir);
}

syncTypeFiles();
