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

// Helper to execute operations returned by Cloud
const handleOperationResponse = async (res: Response) => {
    let data;
    try {
        data = await res.json();
    } catch (e) {
        return { success: false, error: "Invalid JSON response" };
    }

    if (!data.success) return data;

    // Check for operations
    const operations = data.operations || (data.operation ? [data.operation] : []);

    if (operations.length > 0) {
        const bridgeUrl = getLocalUrl();
        for (const op of operations) {
            try {
                if (op.type === 'write') {
                    await fetch(`${bridgeUrl}/api/fs/write`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ filePath: op.filePath, content: op.content })
                    });
                } else if (op.type === 'delete') {
                    // Force delete for directories if needed, though bridge usually handles file delete.
                    // If it's a directory, bridge delete might fail if meant for file.
                    // Ideally we distinguish, but for now assuming 'delete' works for path.
                    await fetch(`${bridgeUrl}/api/fs/delete`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ filePath: op.filePath })
                    });
                }
            } catch (e) {
                console.error(`Client-side operation failed: ${op.type} ${op.filePath}`, e);
                // We could throw here or continue best effort?
                // Let's return error to UI.
                return { success: false, error: `Failed to write/delete ${op.filePath}: ${e}` };
            }
        }
    }

    return data;
};

export const api = {
    getBridgeUrl: () => getLocalUrl(),
    // ========================================================================
    // CLOUD API (Intelligence)
    // ========================================================================

    // 5. Generate Template (Cloud via Scripts)
    generateTemplate: async (data: any, targetDir: string, bridgeUrl?: string, taskId?: string): Promise<{ success: boolean; taskId?: string; error?: string; message?: string }> => {
        try {
            const payload = { ...data, targetDir, bridgeUrl, taskId };
            const res = await fetch(`${cloudUrl}/generate-template`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            return handleOperationResponse(res);
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
        return res.json(); // Analyze just returns data, no operations to write
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
        const res = await fetch(`${cloudUrl}/fetch-url`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url }),
        });
        return res.json();
    },

    // 2b. Read File (Local Bridge)
    readFile: async (filePath: string, bridgeUrl?: string) => {
        const url = bridgeUrl || getLocalUrl();
        const res = await fetch(`${url}/api/fs/read`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filePath })
        });
        return res.json();
    },

    // 3. Delete Collection (Reset)
    deleteCollection: async (targetDir: string, bridgeUrl?: string, taskId?: string): Promise<{ success: boolean; taskId?: string; error?: string; message?: string }> => {
        try {
            const res = await fetch(`${cloudUrl}/delete-collection`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetDir, bridgeUrl, taskId }),
            });
            return handleOperationResponse(res);
        } catch (error: any) {
            console.error("Delete Collection Failed:", error);
            return { success: false, error: error.message || String(error) };
        }
    },


    // 4. Delete Item (Cloud via Scripts)
    deleteItem: async (itemInfo: any, targetDir: string, bridgeUrl?: string, taskId?: string): Promise<{ success: boolean; taskId?: string; error?: string; message?: string }> => {
        try {
            let contentToAdd = itemInfo.existingContent;

            // Auto-fetch content for functions if missing
            if (itemInfo.type === 'function' && !contentToAdd) {
                try {
                    const filePath = `src/api-services/definitions/${itemInfo.moduleName}.ts`;
                    // Use api.readFile (safe runtime reference) or fetch directly
                    // We'll use the helper we just added. 
                    // Note: 'api' is the exported const, available in closure.
                    const readRes = await api.readFile(filePath, bridgeUrl);
                    if (readRes.success) {
                        contentToAdd = readRes.content;
                    }
                } catch (e) {
                    console.warn("Pre-fetch failed", e);
                }
            }

            const payload = { ...itemInfo, existingContent: contentToAdd, targetDir, bridgeUrl, taskId };
            const res = await fetch(`${cloudUrl}/delete-item`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            return handleOperationResponse(res);
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
        if (bridgeUrl) formData.append('bridgeUrl', bridgeUrl);
        if (taskId) formData.append('taskId', taskId);
        formData.append('returnOperations', 'true');

        const res = await fetch(`${cloudUrl}/update-collection`, {
            method: 'POST',
            body: formData,
        });
        // We handle response manually in ImportModal for progress? 
        // Or we can standardize it here.
        // ImportModal currently iterates manually!
        // If we standardize here, ImportModal double-writing?
        // Wait, ImportModal check 'res.operations' and writes.
        // If 'handleOperationResponse' writes, then 'res.operations' should be CLEARED or handled.

        // Let's use handleOperationResponse here.
        // But ImportModal expects 'operations' property to display progress or just writes?
        // ImportModal: "Client-side write ... if (res.operations) ..."
        // If we consume it here, ImportModal will just succeed.
        // We should Return the JSON still, so ImportModal sees success.
        // But we must NOT double write.

        // If we implement 'handleOperationResponse', it eats the operations (writes them).
        // It should probably return the data WITHOUT operations or with a flag "operationsHandled: true"?
        // Or just let it be. Writing same file twice is fine but wasteful.
        // Better: let api.ts handle it all. Removal of manual logic in ImportModal is a cleanup step.
        // For now, let's enable it here.
        return handleOperationResponse(res);
    },

    saveTypes: async (data: any) => {
        try {
            const res = await fetch(`${cloudUrl}/save-types`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            return handleOperationResponse(res);
        } catch (error: any) {
            return { success: false, error: error.message || String(error) };
        }
    },

    // 8. Execute Function (Direct Frontend)
    executeRequest: async (config: { url: string; method: string; data?: any; headers?: any }) => {
        try {
            const { url, method, data, headers } = config;

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

        const res = await fetch(`${cloudUrl}/sync-collection`, {
            method: 'POST',
            body: formData,
        });
        return handleOperationResponse(res);
    },

    // 9. Watch Project (Reactive)
    // 9. Watch Project (Reactive) - REMOVED (Relies on Bridge)
    // watchProject: async (targetDir: string) => { ... }
};
