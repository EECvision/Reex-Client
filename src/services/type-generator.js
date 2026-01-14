const jsonToTS = require("json-to-ts");

class TypeGenerator {
    /**
     * Generates a TypeScript interface string from a JSON object.
     * @param {string} interfaceName - Name of the interface
     * @param {object} json - The JSON object to convert
     * @returns {string} The TypeScript interface definition
     */
    generateInterface(interfaceName, data) {
        return this.generateTypedInterfaces(data, interfaceName);
    }

    generateTypedInterfaces(data, baseName) {
        // handle edge cases up front
        if (Array.isArray(data)) {
            if (data.length === 0) {
                return `export type ${baseName} = any[];`;
            }

            const firstItem = data[0];

            // Handle arrays of primitives
            if (typeof firstItem === "string") {
                return `export type ${baseName} = string[];`;
            }
            if (typeof firstItem === "number") {
                return `export type ${baseName} = number[];`;
            }
            if (typeof firstItem === "boolean") {
                return `export type ${baseName} = boolean[];`;
            }
            if (firstItem === null) {
                return `export type ${baseName} = null[];`;
            }

            // Handle arrays of objects
            const itemTypeName = `${baseName}Item`;
            const objectType = this.generateTypedInterfaces(firstItem, itemTypeName);
            // Add array type alias at the top
            return `export type ${baseName} = ${itemTypeName}[];\n\n${objectType.replace(
                "export ",
                ""
            )}`;
        }

        if (data === null || data === undefined) {
            return `export type ${baseName} = null;`;
        }

        const typeDefs = jsonToTS(data);
        const typeMap = {};

        const renamed = typeDefs.map((typeStr, i) => {
            const match = /^interface (\w+)/.exec(typeStr);
            if (!match) return typeStr;

            const originalName = match[1];
            const newName = i === 0 ? baseName : `${baseName}_Sub${i}`;
            typeMap[originalName] = newName;

            // Check for empty interface (no body properties)
            // json-to-ts outputs "interface Name {\n}" for empty objects
            if (typeStr.includes("interface") && typeStr.includes("{}")) {
                return `${i === 0 ? "export " : ""}type ${newName} = unknown;`;
            }

            // Also check if it's just whitespace inside braces
            const bodyContent = typeStr.substring(typeStr.indexOf("{") + 1, typeStr.lastIndexOf("}"));
            if (!bodyContent.trim()) {
                return `${i === 0 ? "export " : ""}type ${newName} = unknown;`;
            }

            return typeStr.replace(
                `interface ${originalName}`,
                `${i === 0 ? "export " : ""}interface ${newName}`
            );
        });

        return renamed
            .join("\n\n")
            .replace(/\b\w+\b/g, (word) => typeMap[word] || word);
    }
}

module.exports = new TypeGenerator();
