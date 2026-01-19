"use client";

// Helper to get the base URL dynamically for Local Bridge
const getLocalUrl = () => {
    if (typeof window === 'undefined') return "http://localhost:4000"; // SSR fallback
    const params = new URLSearchParams(window.location.search);
    const port = params.get("localPort") || "4000";
    return `http://localhost:${port}`;
};

// The Cloud API is relative to the Next.js app
const cloudUrl = "/api";

export const api = {
    getBridgeUrl: () => getLocalUrl(),
    // ========================================================================
    // CLOUD API (Intelligence)
    // ========================================================================

    // 5. Generate Template (Cloud via Scripts)
    generateTemplate: async (data: any, targetDir: string, bridgeUrl?: string, taskId?: string): Promise<{ success: boolean; taskId?: string; error?: string; message?: string }> => {
        try {
            const payload = { ...data, targetDir, bridgeUrl, taskId }; // Inject targetDir, bridgeUrl, taskId
            const res = await fetch(`${cloudUrl}/generate-template`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            return res.json();
        } catch (error: any) {
            return { success: false, error: error.message || String(error) };
        }
    },

    // 1. Analyze Collection (Cloud via Scripts)
    analyzeCollection: async (file: File, fileName: string | undefined, targetDir: string) => {
        const formData = new FormData();
        formData.append('file', file);
        if (fileName) formData.append('fileName', fileName);
        formData.append('targetDir', targetDir);

        // Fetch existing definitions from Bridge (if connected)
        try {
            const bridgeUrl = getLocalUrl();
            const res = await fetch(`${bridgeUrl}/api/project/definitions`);
            if (res.ok) {
                const definitions = await res.json();
                formData.append('existingModules', JSON.stringify(definitions));
            }
        } catch (e) {
            console.warn("Could not fetch existing definitions from Bridge:", e);
        }

        const res = await fetch(`${cloudUrl}/analyze-collection`, {
            method: 'POST',
            body: formData,
        });
        return res.json();
    },

    // 7. Preview/Save Types (Logic in Cloud)
    previewTypes: async (data: any) => {
        const res = await fetch(`${cloudUrl}/preview-types`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        return res.json();
    },

    // ========================================================================
    // LOCAL BRIDGE (Filesystem)
    // ========================================================================

    // 2. Fetch URL (Could be Cloud, but saving is Local)
    fetchUrl: async (url: string) => {
        // This fetches content FROM the web. Cloud can do this.
        const res = await fetch(`${cloudUrl}/fetch-url`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url }),
        });
        return res.json();
    },

    // 3. Delete Collection (Reset)
    deleteCollection: async (targetDir: string, bridgeUrl?: string, taskId?: string): Promise<{ success: boolean; taskId?: string; error?: string; message?: string }> => {
        try {
            const res = await fetch(`${cloudUrl}/delete-collection`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetDir, bridgeUrl, taskId }), // Pass bridgeUrl, taskId
            });
            return res.json();
        } catch (error: any) {
            console.error("Delete Collection Failed:", error);
            return { success: false, error: error.message || String(error) };
        }
    },


    // 4. Delete Item (Cloud via Scripts)
    deleteItem: async (itemInfo: any, targetDir: string, bridgeUrl?: string, taskId?: string): Promise<{ success: boolean; taskId?: string; error?: string; message?: string }> => {
        try {
            const payload = { ...itemInfo, targetDir, bridgeUrl, taskId }; // Pass bridgeUrl and taskId
            const res = await fetch(`${cloudUrl}/delete-item`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            return res.json();
        } catch (error: any) {
            return { success: false, error: error.message || String(error) };
        }
    },

    // 6. Update Collection (Cloud via Scripts)
    updateCollection: async (payload: any, targetDir: string, bridgeUrl?: string, taskId?: string) => {
        // Prepare FormData
        const formData = new FormData();
        if (payload.file) formData.append('file', payload.file);
        // Serialization for other fields
        if (payload.modules) formData.append('modules', JSON.stringify(payload.modules));
        if (payload.deletedModules) formData.append('deletedModules', JSON.stringify(payload.deletedModules));
        if (payload.functions) formData.append('functions', typeof payload.functions === 'string' ? payload.functions : JSON.stringify(payload.functions));
        if (payload.fileName) formData.append('fileName', payload.fileName);
        formData.append('targetDir', targetDir);
        if (bridgeUrl) formData.append('bridgeUrl', bridgeUrl); // Pass bridgeUrl
        if (taskId) formData.append('taskId', taskId);

        const res = await fetch(`${cloudUrl}/update-collection`, {
            method: 'POST',
            body: formData,
        });
        return res.json();
    },

    saveTypes: async (data: any) => {
        try {
            const res = await fetch(`${cloudUrl}/save-types`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            return res.json();
        } catch (error: any) {
            return { success: false, error: error.message || String(error) };
        }
    },

    // 8. Execute Function (Direct Frontend)
    executeRequest: async (config: { url: string; method: string; data?: any; headers?: any }) => {
        try {
            const { url, method, data, headers } = config;
            // Use axios or fetch. We'll use fetch for simplicity/native support or axios if installed.
            // Based on index.ts scaffolds, axios is used. But here we can use fetch or axios.
            // Let's use fetch for fewer deps here, or check if axios is imported?
            // "api.ts" doesn't import axios. Let's use fetch.

            const options: RequestInit = {
                method: method.toUpperCase(),
                headers: {
                    'Content-Type': 'application/json',
                    ...headers
                },
            };

            if (data && method.toUpperCase() !== 'GET' && method.toUpperCase() !== 'HEAD') {
                options.body = JSON.stringify(data);
            }

            const res = await fetch(url, options);

            // Try to parse JSON
            let responseData;
            const contentType = res.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
                responseData = await res.json();
            } else {
                responseData = await res.text();
            }

            if (!res.ok) {
                const errorMessage = responseData?.message || responseData?.msg || (typeof responseData === 'object' ? JSON.stringify(responseData) : responseData) || `Error ${res.status}`;
                return { success: false, error: errorMessage };
            }

            return { success: true, data: responseData };
        } catch (e: any) {
            console.error("Execution Failed:", e);
            return { success: false, error: e.message || String(e) };
        }
    },

    // Event Source for Background Tasks (Cloud/Bridge)
    getEventSource: (baseUrl: string = cloudUrl) => {
        const url = baseUrl.startsWith('http') ? `${baseUrl}/api/events` : `${baseUrl}/events`;
        return new EventSource(url);
    },

    // Sync Endpoints (Read Cloud State or Bridge State)
    fetchProjectManifest: async (baseUrl?: string) => {
        // If baseUrl provided (Bridge), use it. Else use Cloud (Next Proxy)
        const root = baseUrl || cloudUrl;
        const apiPath = baseUrl ? `${baseUrl}/api/project/manifest` : `${root}/project/manifest`;

        const res = await fetch(apiPath);
        if (!res.ok) throw new Error("Failed to fetch manifest");
        return res.json();
    },

    fetchProjectModules: async (baseUrl?: string) => {
        const root = baseUrl || cloudUrl;
        const apiPath = baseUrl ? `${baseUrl}/api/project/modules` : `${root}/project/modules`;

        const res = await fetch(apiPath);
        if (!res.ok) throw new Error("Failed to fetch modules");
        return res.json();
    },

    fetchProjectConfig: async (baseUrl?: string) => {
        const root = baseUrl || cloudUrl;
        const apiPath = baseUrl ? `${baseUrl}/api/project/config` : `${root}/project/config`;

        const res = await fetch(apiPath);
        return res.json();
    },

    fetchBridgeStatus: async () => {
        try {
            // Local Bridge is always at getLocalUrl() (Port 4000 usually)
            // Server mounts routes at /api
            const res = await fetch(`${getLocalUrl()}/api/health`);
            if (!res.ok) throw new Error(`Status ${res.status}`);
            return await res.json();
        } catch (e) {
            console.warn("Bridge not reachable", e);
            return { targetDir: null };
        }
    },

    syncCollection: async (payload: any, targetDir: string) => {
        const formData = new FormData();
        if (payload.file) formData.append('file', payload.file);
        if (payload.modules) formData.append('modules', JSON.stringify(payload.modules));
        if (payload.deletedModules) formData.append('deletedModules', JSON.stringify(payload.deletedModules));
        if (payload.functions) formData.append('functions', typeof payload.functions === 'string' ? payload.functions : JSON.stringify(payload.functions));
        if (payload.fileName) formData.append('fileName', payload.fileName);
        formData.append('targetDir', targetDir);

        // We don't need existingModules if we trust the cloud script to handle it?
        // analyze-collection script usually takes the file and returns new modules.
        // sync-collection script (if from server.js) takes file and updates.
        // But wait, server.js sync-collection implementation I wrote accepts file + modules + deletedModules.
        // And it calls generated scripts.
        // It does NOT need local existing definitions if we are replacing?
        // Actually, sync usually implies "merge".
        // server.js implementation handles "Process Deletions" and "Generator".
        // It doesn't seemingly read existing definitions from disk unless the generator script does.
        // The generator script (generate-openapi-collection.ts) reads from the temp file.
        // So we just pass what we have.

        const res = await fetch(`${cloudUrl}/sync-collection`, {
            method: 'POST',
            body: formData,
        });
        return res.json();
    },

    // 9. Watch Project (Reactive)
    // 9. Watch Project (Reactive) - REMOVED (Relies on Bridge)
    // watchProject: async (targetDir: string) => { ... }
};
