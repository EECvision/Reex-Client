import fs from 'fs';
import path from 'path';

const BASE_URL = "http://localhost:3000/api";
const MANIFEST_PATH = path.join(process.cwd(), 'src', 'config', 'apiManifest.json');

async function test() {
    console.log("🧪 Testing API Endpoints vs Local Manifest...");

    if (!fs.existsSync(MANIFEST_PATH)) {
        console.error("❌ Local Manifest file not found:", MANIFEST_PATH);
        process.exit(1);
    }

    const localManifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
    console.log("✅ Loaded Local Manifest content.");

    // 1. Test /project/manifest
    try {
        console.log(`\nfetching ${BASE_URL}/project/manifest...`);
        const res = await fetch(`${BASE_URL}/project/manifest`);
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const apiManifest = await res.json();

        // Compare keys (Modules)
        const localKeys = Object.keys(localManifest).sort();
        const apiKeys = Object.keys(apiManifest).sort();

        if (JSON.stringify(localKeys) === JSON.stringify(apiKeys)) {
            console.log("✅ /project/manifest keys MATCH local manifest.");
        } else {
            console.error("❌ /project/manifest keys MISMATCH.");
            console.error("Local:", localKeys);
            console.error("API:", apiKeys);
            process.exit(1);
        }
    } catch (e: any) {
        console.error("❌ Failed to fetch /project/manifest:", e.message);
        process.exit(1);
    }

    // 2. Test /project/modules
    try {
        console.log(`\nfetching ${BASE_URL}/project/modules...`);
        const res = await fetch(`${BASE_URL}/project/modules`);
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const modules = await res.json();

        // Verify structure { [key]: true }
        const moduleKeys = Object.keys(modules).sort();
        const localKeys = Object.keys(localManifest).sort();

        if (JSON.stringify(moduleKeys) === JSON.stringify(localKeys)) {
            console.log("✅ /project/modules keys MATCH local manifest.");
        } else {
            console.error("❌ /project/modules keys MISMATCH.");
            console.error("Local:", localKeys);
            console.error("API:", moduleKeys);
            process.exit(1);
        }
    } catch (e: any) {
        console.error("❌ Failed to fetch /project/modules:", e.message);
        process.exit(1);
    }

    console.log("\n🎉 API endpoints are correctly serving the Local Manifest!");
}

test();
