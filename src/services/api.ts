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
    generateTemplate: async (data: any, targetDir: string, bridgeUrl?: string): Promise<{ success: boolean; taskId?: string; error?: string; message?: string }> => {
        try {
            const payload = { ...data, targetDir, bridgeUrl }; // Inject targetDir and bridgeUrl
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
    deleteCollection: async (targetDir: string, bridgeUrl?: string): Promise<{ success: boolean; taskId?: string; error?: string; message?: string }> => {
        try {
            const res = await fetch(`${cloudUrl}/delete-collection`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetDir, bridgeUrl }), // Pass bridgeUrl
            });
            return res.json();
        } catch (error: any) {
            console.error("Delete Collection Failed:", error);
            return { success: false, error: error.message || String(error) };
        }
    },


    // 4. Delete Item (Cloud via Scripts)
    deleteItem: async (itemInfo: any, targetDir: string, bridgeUrl?: string): Promise<{ success: boolean; taskId?: string; error?: string; message?: string }> => {
        try {
            const payload = { ...itemInfo, targetDir, bridgeUrl }; // Pass bridgeUrl
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
    updateCollection: async (payload: any, targetDir: string, bridgeUrl?: string) => {
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

        const res = await fetch(`${cloudUrl}/update-collection`, {
            method: 'POST',
            body: formData,
        });
        return res.json();
    },

    saveTypes: async (data: any) => {
        // Logic to save types to file.
        return { success: false, error: "Not implemented" };
    },

    // 8. Execute Function (Proxy)
    executeFunction: async (apiKey: string, fnName: string, args: any[]) => {
        // Execute on LOCAL (where the db/services allow)
        // Not supported in Dumb Bridge currently.
        return { success: false, error: "Execution not supported in Cloud Mode" };
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
