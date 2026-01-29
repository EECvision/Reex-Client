
import { cloudUrl, getLocalUrl, handleOperationResponse } from "./utils";

export const CloudService = {
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

    analyzeCollection: async (file: File, fileName: string | undefined, targetDir: string, clientMappings?: Record<string, string>) => {
        const formData = new FormData();

        try {
            // Compress the file to bypass 4.5MB Vercel Body Limit
            // JSON compresses very well (90%+ reduction)
            if (typeof CompressionStream !== 'undefined') {
                const stream = file.stream().pipeThrough(new CompressionStream('gzip'));
                const compressedBlob = await new Response(stream).blob();

                // Append with .gz extension so server knows to decompress
                const safeName = fileName || file.name;
                const finalName = safeName.endsWith('.gz') ? safeName : `${safeName}.gz`;

                formData.append('file', compressedBlob, finalName);
            } else {
                // Fallback for very old browsers (unlikely in this stack)
                formData.append('file', file);
            }
        } catch (e) {
            console.warn("Compression failed, falling back to raw upload", e);
            formData.append('file', file);
        }

        if (fileName && !formData.has('file')) formData.append('fileName', fileName); // Only if not already handled
        formData.append('targetDir', targetDir);
        if (clientMappings) formData.append('clientMappings', JSON.stringify(clientMappings));

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

    previewTypes: async (data: any) => {
        const res = await fetch(`${cloudUrl}/preview-types`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        return res.json();
    },

    fetchUrl: async (url: string) => {
        const res = await fetch(`${cloudUrl}/fetch-url`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url }),
        });
        return res.json();
    },

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

    deleteItem: async (itemInfo: any, targetDir: string, bridgeUrl?: string, taskId?: string): Promise<{ success: boolean; taskId?: string; error?: string; message?: string }> => {
        try {
            let contentToAdd = itemInfo.existingContent;

            // Auto-fetch content for functions if missing
            // Circular dependency if we import BridgeService here? 
            // We can fetch directly using utils/getLocalUrl
            if (itemInfo.type === 'function' && !contentToAdd) {
                try {
                    const filePath = `src/api-services/definitions/${itemInfo.moduleName}.ts`;
                    const url = bridgeUrl || getLocalUrl();
                    const readRes = await fetch(`${url}/api/fs/read`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ filePath })
                    }).then(r => r.json());

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

    updateCollection: async (payload: any, targetDir: string, bridgeUrl?: string, taskId?: string) => {
        const formData = new FormData();
        if (payload.file) formData.append('file', payload.file);
        if (payload.modules) formData.append('modules', JSON.stringify(payload.modules));
        if (payload.deletedModules) formData.append('deletedModules', JSON.stringify(payload.deletedModules));
        if (payload.functions) formData.append('functions', typeof payload.functions === 'string' ? payload.functions : JSON.stringify(payload.functions));
        if (payload.forceOverwrite) formData.append('forceOverwrite', JSON.stringify(payload.forceOverwrite));
        if (payload.existingModules) formData.append('existingModules', JSON.stringify(payload.existingModules));
        if (payload.proposedClients) formData.append('proposedClients', JSON.stringify(payload.proposedClients));
        if (payload.baseUrl) formData.append('baseUrl', payload.baseUrl);
        if (payload.fileName) formData.append('fileName', payload.fileName);
        formData.append('targetDir', targetDir);
        if (bridgeUrl) formData.append('bridgeUrl', bridgeUrl);
        if (taskId) formData.append('taskId', taskId);
        formData.append('returnOperations', 'true');

        const res = await fetch(`${cloudUrl}/update-collection`, {
            method: 'POST',
            body: formData,
        });
        // We handle operations manually in the UI to ensure correct order (Config -> Files -> Sync)
        return res.json();
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

    getEventSource: (baseUrl: string = cloudUrl) => {
        const url = baseUrl.startsWith('http') ? `${baseUrl}/api/events` : `${baseUrl}/events`;
        return new EventSource(url);
    }
};
