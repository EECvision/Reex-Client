
const generateTypesFromBody = (body, entityName) => {
    if (!body || !body.raw) return "";

    try {
        // Remove comments from JSON before parsing
        let cleanJson = body.raw
            .replace(/\/\/.*$/gm, "") // Remove single-line comments
            .replace(/\/\*[\s\S]*?\*\//g, ""); // Remove multi-line comments

        // Remove trailing commas before closing braces/brackets
        cleanJson = cleanJson.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]");

        console.log("Clean JSON:", cleanJson);

        const parsed = JSON.parse(cleanJson);
        console.log("Parsed:", parsed);
        const fields = [];

        Object.entries(parsed).forEach(([key, value]) => {
            const type = inferTypeFromExample(value);
            const optional = value === null || value === undefined ? "?" : "";
            fields.push(`  ${key}${optional}: ${type};`);
        });

        if (fields.length === 0) return "";

        return `
interface ${entityName}Payload {
${fields.join("\n")}
}
`;
    } catch (e) {
        console.warn(
            `⚠️  Failed to parse JSON body for ${entityName}:`,
            e instanceof Error ? e.message : e
        );
        return "";
    }
};

const inferTypeFromExample = (value) => {
    if (value === null || value === undefined) return "any";
    if (typeof value === "string") return "string";
    if (typeof value === "number") return "number";
    if (typeof value === "boolean") return "boolean";
    if (Array.isArray(value)) {
        if (value.length > 0) {
            return `${inferTypeFromExample(value[0])}[]`;
        }
        return "any[]";
    }
    if (typeof value === "object") return "Record<string, any>";
    return "any";
};

const body = {
    "mode": "raw",
    "raw": "{\n    \"trading_name\": \"Test Provider & Consumer\",\n    \"incorporation_date\": \"01-01-2025\",\n    \"about\": \"string\",\n    \"country\": \"NG\",\n    \"state\": \"Lagos\",\n    \"address\": \"Sample Address\",\n    \"webhook_url\": \"https://www.localhost:3333/webhooks/liquidramp\",\n    \"base_fiat_currency\": \"NGN\",\n    \"website\": \"https://test.business.xyz\",\n    \"contact\": {\n        \"name\": \"John Doe\",\n        \"email\": \"john.doe@yopmail.com\",\n        \"phone\": \"+2349000000000\"\n    }\n}"
};

const result = generateTypesFromBody(body, "BusinessDetails");
console.log("Result:", result);
