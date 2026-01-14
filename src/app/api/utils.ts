import { exec } from "child_process";
import path from "path";
import { promisify } from "util";
import EventEmitter from "events";

export const eventEmitter = new EventEmitter();

export const runCommand = (cmd: string, options: any = {}) => {
    const cwd = options.cwd || process.cwd();
    const env = options.env || process.env;

    // Debug Logging for Env Var Propagation
    if (cmd.includes('generate-manifest')) {
        console.log(`[CMD] Running: ${cmd}`);
        console.log(`[CMD] Env API_TARGET_DIR: ${env.API_TARGET_DIR}`);
    }

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
    if (override) return path.join(override, 'src/api-services/definitions');

    // 2. Env Var override (from Bridge or .env.local)
    if (process.env.API_TARGET_DIR) {
        // API_TARGET_DIR usually points to the PROJECT ROOT (e.g. d:\Dev\api-builder\api-next-server)
        // or the src/api-services/definitions depending on how it was passed.
        // In the CLI Bridge (bin/index.js), targetDir was passed as the --dir argument (Project Root).
        // server.js mounted it as process.env.API_TARGET_DIR.
        // But wait, server.js paths.js used API_TARGET_DIR as the PROJECT ROOT.
        // Then it constructed paths like API_DEFINITIONS_DIR = path.join(API_TARGET_DIR, 'src/api-services/definitions').

        // So we should expect API_TARGET_DIR to be project root.
        return path.join(process.env.API_TARGET_DIR, 'src/api-services/definitions');
    }

    // 3. Default to self (Next.js Root)
    return path.join(process.cwd(), 'src/api-services/definitions');
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

export const sendEvent = (id: string, type: string, message: string) => {
    eventEmitter.emit('event', { id, type, message });
};
