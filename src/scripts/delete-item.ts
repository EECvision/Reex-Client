/* eslint-disable @typescript-eslint/no-explicit-any */
// scripts/delete-item.ts - Delete a module or function from the collection

import * as fs from "fs";
import * as path from "path";
import { Project, SyntaxKind, } from "ts-morph";
import { exec } from "child_process";
// @ts-ignore
const { API_DEFINITIONS_DIR, API_TYPES_DIR } = require("../paths");

interface DeleteRequest {
    type: "module" | "function";
    moduleName: string;
    functionName?: string;
}



function runCommand(cmd: string): Promise<void> {
    return new Promise((resolve, reject) => {
        exec(cmd, { cwd: process.cwd() }, (err, stdout, stderr) => {
            if (err) {
                console.error(`Command failed: ${cmd}`, stderr);
                return reject(stderr);
            }
            console.log(stdout);
            resolve();
        });
    });
}

async function deleteItem(request: DeleteRequest) {
    const { type, moduleName, functionName } = request;

    const apiDir = API_DEFINITIONS_DIR;
    const typesDir = API_TYPES_DIR;
    const modulePath = path.join(apiDir, `${moduleName}.ts`);
    const typesDirPath = path.join(typesDir, moduleName);

    if (!fs.existsSync(modulePath)) {
        throw new Error(`Module '${moduleName}' not found`);
    }

    if (type === "module") {
        // Delete entire module file
        fs.unlinkSync(modulePath);
        console.log(`✓ Deleted module file: ${modulePath}`);

        // Delete types directory for this module if exists
        if (fs.existsSync(typesDirPath)) {
            fs.rmSync(typesDirPath, { recursive: true });
            console.log(`✓ Deleted types directory: ${typesDirPath}`);
        }



    } else if (type === "function") {
        if (!functionName) {
            throw new Error("Function name is required for function deletion");
        }

        // Use ts-morph to remove specific function from module
        const project = new Project();
        const sourceFile = project.addSourceFileAtPath(modulePath);

        const variableDecl = sourceFile.getVariableDeclaration(`${moduleName}Api`);
        if (!variableDecl) {
            throw new Error(`API object not found in module '${moduleName}'`);
        }

        const initializer = variableDecl.getInitializerIfKind(SyntaxKind.ObjectLiteralExpression);
        if (!initializer) {
            throw new Error(`Invalid API object structure in module '${moduleName}'`);
        }

        // Find and remove the function property
        const propToRemove = initializer.getProperty(functionName);
        if (!propToRemove) {
            throw new Error(`Function '${functionName}' not found in module '${moduleName}'`);
        }

        propToRemove.remove();

        // Also remove the interface for this function if exists
        const interfaces = sourceFile.getInterfaces();
        interfaces.forEach(iface => {
            const ifaceName = iface.getName().toLowerCase();
            if (ifaceName.includes(functionName.toLowerCase())) {
                iface.remove();
            }
        });

        // Check if module is now empty
        const remainingProps = initializer.getProperties();
        if (remainingProps.length === 0) {
            // Delete the entire module if empty
            fs.unlinkSync(modulePath);
            console.log(`✓ Deleted empty module file: ${modulePath}`);

            if (fs.existsSync(typesDirPath)) {
                fs.rmSync(typesDirPath, { recursive: true });
            }


        } else {
            // Save the updated file
            sourceFile.saveSync();
            console.log(`✓ Removed function '${functionName}' from ${moduleName}`);
        }

        // Delete specific type file if exists
        const typePath = path.join(typesDirPath, `${functionName}.ts`);
        if (fs.existsSync(typePath)) {
            fs.unlinkSync(typePath);
            console.log(`✓ Deleted type file: ${typePath}`);
        }
    }

    // Regenerate everything (manifest, types, queries) to ensure consistency


    const message = type === "module"
        ? `Module '${moduleName}' deleted successfully`
        : `Function '${functionName}' deleted from '${moduleName}' successfully`;

    console.log(`✓ ${message}`);
}



// CLI Entry
if (require.main === module) {
    const args = process.argv.slice(2);
    if (args.length < 2) {
        console.error("Usage: ts-node delete-item.ts <type> <moduleName> [functionName]");
        console.error("  type: 'module' or 'function'");
        process.exit(1);
    }

    const type = args[0] as "module" | "function";
    const moduleName = args[1];
    const functionName = args[2];

    deleteItem({ type, moduleName, functionName })
        .then(() => process.exit(0))
        .catch((err) => {
            console.error("Delete failed:", err.message || err);
            process.exit(1);
        });
}
