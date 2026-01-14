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

  const files = fs.readdirSync(apiDir).filter((f: string) => f.endsWith(".ts"));
  const apiManifest: Record<string, any> = {};

  const expandTypeRecursively = (typeNode: any, sourceFile: any): any => {
    if (!typeNode) return null;

    const kind = typeNode.getKind();

    if (kind === SyntaxKind.TypeLiteral) {
      return {
        isObject: true,
        properties: typeNode.getProperties().map((prop: any) => {
          const name = prop.getName();
          const optional = prop.hasQuestionToken?.() || false;
          const propTypeNode = prop.getTypeNode();

          const nested = expandTypeRecursively(propTypeNode, sourceFile);
          if (nested) {
            return { name, isOptional: optional, ...nested };
          }

          return {
            name,
            isOptional: optional,
            type: prop.getType().getText(),
          };
        }),
      };
    }

    if (kind === SyntaxKind.TypeReference) {
      const typeName = typeNode.getTypeName().getText();

      const declaration =
        sourceFile.getInterfaces().find((i: any) => i.getName() === typeName) ||
        sourceFile.getTypeAliases().find((t: any) => t.getName() === typeName);

      if (!declaration) return { type: typeName };

      let props: any[] = [];

      if (declaration.getKind() === SyntaxKind.InterfaceDeclaration) {
        props = declaration.getProperties();
      } else if (declaration.getKind() === SyntaxKind.TypeAliasDeclaration) {
        const tn = declaration.getTypeNode();
        if (tn && tn.getProperties) props = tn.getProperties();
      }

      return {
        isObject: true,
        properties: props.map((prop: any) => {
          const name = prop.getName();
          const optional =
            prop.hasQuestionToken?.() || prop.isOptional?.() || false;
          const propTypeNode = prop.getTypeNode();

          const nested = expandTypeRecursively(propTypeNode, sourceFile);
          if (nested) {
            return { name, isOptional: optional, ...nested };
          }

          return {
            name,
            isOptional: optional,
            type: prop.getType().getText(),
          };
        }),
      };
    }

    return null;
  };

  const getParameterDetails = (param: any, sourceFile: any) => {
    const name = param.getName();
    const isOptional = param.isOptional();
    const typeNode = param.getTypeNode();

    const expanded = expandTypeRecursively(typeNode, sourceFile);
    if (expanded) return { name, isOptional, ...expanded };

    return { name, isOptional };
  };

  for (const file of files) {
    const moduleName = file.replace(".ts", "");
    const filePath = path.join(apiDir, file);

    const existingFile = project.getSourceFile(filePath);
    if (existingFile) project.removeSourceFile(existingFile);

    const sourceFile = project.addSourceFileAtPath(filePath);
    const exports = sourceFile.getExportedDeclarations();
    const moduleExports: Record<string, any> = {};
    let count = 0;

    for (const [exportName, declarations] of exports) {
      for (const declaration of declarations) {
        const kind = declaration.getKind();

        if (kind === SyntaxKind.VariableDeclaration) {
          const initializer = declaration.getInitializer();

          if (
            initializer &&
            initializer.getKind() === SyntaxKind.ObjectLiteralExpression
          ) {
            const properties = initializer.getProperties();

            for (const property of properties) {
              if (property.getKind() === SyntaxKind.PropertyAssignment) {
                const methodName = property.getName();
                const init = property.getInitializer();

                if (
                  init &&
                  (init.getKind() === SyntaxKind.ArrowFunction ||
                    init.getKind() === SyntaxKind.FunctionExpression)
                ) {
                  const params = init
                    .getParameters()
                    .map((p: any) => getParameterDetails(p, sourceFile));

                  moduleExports[methodName] = { args: params };
                  count++;
                }
              }
            }
          } else if (
            initializer &&
            (initializer.getKind() === SyntaxKind.ArrowFunction ||
              initializer.getKind() === SyntaxKind.FunctionExpression)
          ) {
            const params = initializer
              .getParameters()
              .map((p: any) => getParameterDetails(p, sourceFile));
            moduleExports[exportName] = { args: params };
            count++;
          }
        }

        if (kind === SyntaxKind.FunctionDeclaration) {
          const params = declaration
            .getParameters()
            .map((p: any) => getParameterDetails(p, sourceFile));

          moduleExports[exportName] = { args: params };
          count++;
        }
      }
    }

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

  fs.writeFileSync(manifestPath, output.trim() + "\n");
})();
