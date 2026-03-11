import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
const { API_SERVICES_DIR } = require('../paths');

const definitionsDir = path.join(API_SERVICES_DIR, 'definitions');
const debounceTime = 1000; // 1 second debounce
let timeout: NodeJS.Timeout | null = null;
let isRunning = false;

if (!fs.existsSync(definitionsDir)) {
    console.error(`Error: Definitions directory not found at ${definitionsDir}`);
    process.exit(1);
}

console.log(`\n👀 Watching for changes in: ${definitionsDir}`);
console.log('   (Will run "npm run gen:types" automatically)\n');

const runGenTypes = () => {
    if (isRunning) {
        console.log('⚠️  Generation already in progress, skipping...');
        return;
    }

    isRunning = true;
    console.log('🔄 Change detected. Running "npm run gen:types"...');

    exec('npm run gen:types', (error, stdout, stderr) => {
        isRunning = false;

        if (error) {
            console.error(`❌ Error running gen:types: ${error.message}`);
            return;
        }

        if (stderr) {
            // Some tools output to stderr even on success, so we just log it
            // console.warn(stderr); 
        }

        console.log(stdout);
        console.log('✅ Types generated successfully.');
        console.log(`\n👀 Watching for changes...`);
    });
};

fs.watch(definitionsDir, { recursive: true }, (eventType, filename) => {
    if (!filename) return;

    // Ignore non-ts files or temporary files if needed
    if (!filename.endsWith('.ts')) return;

    if (timeout) clearTimeout(timeout);

    timeout = setTimeout(() => {
        runGenTypes();
    }, debounceTime);
});
