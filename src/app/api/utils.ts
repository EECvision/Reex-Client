import { exec } from "child_process";
import path from "path";

import EventEmitter from "events";

// Direct import of generators (same as analyze)
import { gunzipSync } from "zlib";

import fs from "fs";

export const getApiServicesDir = (targetDir: string, explicitApiServicesDir?: string) => {
    // If the client (bridge) explicitly tells us the relative dir, trust it.
    // This is critical for cloud mode where the server can't access the user's local filesystem.
    if (explicitApiServicesDir) return explicitApiServicesDir;
    
    const hasSrcFolder = fs.existsSync(path.join(targetDir, 'src'));
    return hasSrcFolder ? "src/api-services" : "api-services";
};

// Use a global variable to persist the EventEmitter across module reloads in development
const globalForEvents = global as unknown as { eventEmitter: EventEmitter };

export const eventEmitter = globalForEvents.eventEmitter || new EventEmitter();

if (process.env.NODE_ENV !== 'production') globalForEvents.eventEmitter = eventEmitter;

export const runCommand = (cmd: string, options: { cwd?: string; env?: NodeJS.ProcessEnv } = {}) => {
    const cwd = options.cwd || process.cwd();
    const env = options.env || process.env;

    return new Promise<string>((resolve, reject) => {
        exec(cmd, { cwd, env, maxBuffer: 1024 * 1024 * 10 }, (err, stdout, stderr) => {
            if (err) {
                console.error('[CMD] Error:', stderr);
                return reject(stderr || err.message);
            }
            resolve(stdout);
        });
    });
};

export const getApiTargetDir = (override?: string) => {
    // 1. Explicit override from Request (Highest Priority)
    if (override) return path.join(override, getApiServicesDir(override), 'definitions');

    // 2. Env Var override (from Bridge or .env.local)
    if (process.env.API_TARGET_DIR) {
        // API_TARGET_DIR usually points to the PROJECT ROOT (e.g. d:\Dev\api-builder\api-next-server)
        // or the ${getApiServicesDir(process.env.API_TARGET_DIR)}/definitions depending on how it was passed.
        // In the CLI Bridge (bin/index.js), targetDir was passed as the --dir argument (Project Root).
        // server.js mounted it as process.env.API_TARGET_DIR.
        // But wait, server.js paths.js used API_TARGET_DIR as the PROJECT Root.
        // Then it constructed paths like API_DEFINITIONS_DIR = path.join(API_TARGET_DIR, `${getApiServicesDir(process.env.API_TARGET_DIR)}/definitions`).

        // So we should expect API_TARGET_DIR to be project root.
        return path.join(process.env.API_TARGET_DIR, getApiServicesDir(process.env.API_TARGET_DIR), 'definitions');
    }

    // 3. Default to self (Next.js Root)
    return path.join(process.cwd(), getApiServicesDir(process.cwd()), 'definitions');
};

export const getEnvWithOverride = (activeTargetDir?: string) => {
    // If we have an active target dir (e.g. from request), use it.
    // If not, getApiTargetDir falls back to env or cwd.
    // But getApiTargetDir returns the *Definitions* dir.
    // Use it to derive Services dir.

    // BUT we also need the PROJECT ROOT (targetDir) for some scripts?
    // Scripts usually take "definitions/.." relative paths OR absolute paths.
    // Let's assume passed targetDir is the PROJECT ROOT.

    const definitionsDir = getApiTargetDir(activeTargetDir);
    const servicesDir = path.dirname(definitionsDir);

    return {
        ...process.env,
        OVERRIDE_API_DEFINITIONS_DIR: definitionsDir,
        OVERRIDE_API_SERVICES_DIR: servicesDir,
        // Also set explicit API_TARGET_DIR for scripts that might check it
        API_TARGET_DIR: activeTargetDir || process.env.API_TARGET_DIR || process.cwd(),

        // Backwards compat
        API_DEFINITIONS_DIR: definitionsDir,
        API_SERVICES_DIR: servicesDir
    };
};


export const DEFAULT_BRIDGE_URL = "http://localhost:4000";

export const getBridgeUrl = (override?: string) => {
    if (override) return override;
    return process.env.BRIDGE_URL || DEFAULT_BRIDGE_URL;
};

export const sendEvent = (id: string, type: string, message: string) => {
    eventEmitter.emit('event', { id, type, message });
};

/**
 * Helper to decompress a file buffer if it is gzipped.
 * Used by update-collection, analyze-collection, and sync-collection routes.
 */
export const decompressFilePayload = (fileName: string, fileBuffer: Buffer): Buffer => {
    let contentBuffer = fileBuffer;
    const isGzip = fileName.endsWith('.gz') || (contentBuffer.length >= 2 && contentBuffer[0] === 0x1f && contentBuffer[1] === 0x8b);

    if (isGzip) {
        try {
            contentBuffer = gunzipSync(fileBuffer);
        } catch (e) {
            console.warn("Decompression failed, trying raw...", e);
        }
    }
    return contentBuffer;
};
