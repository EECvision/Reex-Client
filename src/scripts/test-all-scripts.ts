
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';

// Setup Test Environment
const TEST_DIR = path.join(os.tmpdir(), 'api-builder-test-project');
const API_SERVICES_DIR = path.join(TEST_DIR, 'src', 'api-services');
const DEFINITIONS_DIR = path.join(API_SERVICES_DIR, 'definitions');
const CONFIG_DIR = path.join(TEST_DIR, 'src', 'config'); // Manifest goes here

console.log("🧪 Starting Script Tests...");
console.log(`📂 Test Directory: ${TEST_DIR}`);

// Cleanup previous run
if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
}
fs.mkdirSync(path.join(TEST_DIR, 'src'), { recursive: true });

// Dummy OpenAPI Spec
const openApiSpec = {
    openapi: "3.0.0",
    info: { title: "Test API", version: "1.0.0" },
    paths: {
        "/users": {
            get: {
                tags: ["users"],
                operationId: "getUsers",
                responses: {
                    "200": {
                        content: {
                            "application/json": {
                                schema: {
                                    type: "array",
                                    items: {
                                        type: "object",
                                        properties: {
                                            id: { type: "integer" },
                                            name: { type: "string" }
                                        },
                                        required: ["id", "name"]
                                    }
                                }
                            }
                        }
                    }
                }
            },
            post: {
                tags: ["users"],
                operationId: "createUser",
                requestBody: {
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    name: { type: "string" },
                                    email: { type: "string" }
                                },
                                required: ["name"]
                            }
                        }
                    }
                },
                responses: { "201": { description: "Created" } }
            }
        }
    }
};

const specPath = path.join(TEST_DIR, 'openapi.json');
fs.writeFileSync(specPath, JSON.stringify(openApiSpec, null, 2));

// Prepare Environment Variables
const env = {
    ...process.env,
    API_TARGET_DIR: TEST_DIR,
    // Ensure PATH includes npm binaries
};

try {
    // 1. Run Generator (generate-openapi-collection.ts)
    console.log("\n--- Step 1: Generating Definitions ---");
    // Ensure src/actions or scripts dir is resolved correctly relative to THIS script
    const scriptsDir = __dirname;
    execSync(`npx tsx "${path.join(scriptsDir, 'generate-openapi-collection.ts')}" "${specPath}"`, {
        env,
        stdio: 'inherit',
        cwd: process.cwd() // Run from project root so npx finds packages
    });

    // Check Definitions
    if (!fs.existsSync(path.join(DEFINITIONS_DIR, 'users.ts'))) {
        throw new Error("❌ Definitions not generated: users.ts is missing");
    }
    console.log("✅ Definitions generated.");

    // 2. Run Type Generation (gen:types -> generate-types.js)
    // This should AUTO-TRIGGER generate-manifest.ts because apiManifest.ts is missing!
    console.log("\n--- Step 2: Generating Types ---");
    execSync(`npx tsx "${path.join(scriptsDir, 'generate-types.ts')}"`, {
        env,
        stdio: 'inherit',
        cwd: process.cwd()
    });

    // Check Manifest
    const manifestPath = path.join(CONFIG_DIR, 'apiManifest.ts');
    if (!fs.existsSync(manifestPath)) {
        throw new Error("❌ Manifest not generated (Auto-trigger failed)");
    }
    console.log("✅ Manifest generated.");

    // Check Types
    const typesPath = path.join(API_SERVICES_DIR, 'types', 'users', 'post_createUser.ts');
    if (!fs.existsSync(typesPath)) {
        throw new Error(`❌ Type definition missing: ${typesPath}`);
    }
    console.log("✅ Types generated.");

    console.log("\n🎉 ALL TESTS PASSED!");

} catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    console.error("\n❌ TESTS FAILED:", errorMessage);
    process.exit(1);
}
