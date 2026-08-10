import { cloudUrl, getLocalUrl, handleOperationResponse, compressFilePayload, getApiServicesDir } from "./utils";

export const CloudService = {
    generateTemplate: async (data: any, targetDir: string, bridgeUrl?: string, taskId?: string): Promise<{ success: boolean; taskId?: string; error?: string; message?: string }> => {
        try {
            const apiServicesDir = await getApiServicesDir();
            const payload = { ...data, targetDir, bridgeUrl, taskId, apiServicesDir };
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

    analyzeCollection: async (file: File, fileName: string | undefined, targetDir: string, clientMappings?: Record<string, string>, isStandaloneMode?: boolean, existingModules?: Record<string, string>, existingManifest?: any) => {
        const formData = new FormData();

        const { blob, fileName: finalName } = await compressFilePayload(file, fileName);
        formData.append('file', blob, finalName);

        if (fileName && !formData.has('fileName')) formData.append('fileName', fileName); // Only if not already handled
        formData.append('targetDir', targetDir);
        const apiServicesDir = await getApiServicesDir();
        if (apiServicesDir) formData.append('apiServicesDir', apiServicesDir);
        if (clientMappings) formData.append('clientMappings', JSON.stringify(clientMappings));

        // In Standalone Mode with existingModules, append them directly
        if (isStandaloneMode && existingModules) {
            formData.append('existingModules', JSON.stringify(existingModules));
            if (existingManifest) {
                formData.append('existingManifest', JSON.stringify(existingManifest));
            }
        }
        // Only fetch existing definitions from bridge in Project Mode
        else if (!isStandaloneMode) {
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
        }

        // Ensure filename has correct extension if possible
        const cleanFileName = fileName || file.name;
        if (!formData.has('fileName')) formData.append('fileName', cleanFileName);

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
            const apiServicesDir = await getApiServicesDir();
            const res = await fetch(`${cloudUrl}/delete-collection`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetDir, bridgeUrl, taskId, apiServicesDir }),
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
                    // Ask Bridge where the definitions are
                    const url = bridgeUrl || getLocalUrl();
                    const cachedApiServicesDir = await getApiServicesDir();
                    const definitionsDir = cachedApiServicesDir ? `${cachedApiServicesDir}/definitions` : "api-services/definitions";
                    const filePath = `${definitionsDir}/${itemInfo.moduleName}.ts`;
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

            const apiServicesDir = await getApiServicesDir();
            const payload = { ...itemInfo, existingContent: contentToAdd, targetDir, bridgeUrl, taskId, apiServicesDir };
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

        const file = payload.file;
        let fileName = payload.fileName || (file ? file.name : undefined);

        if (file) {
            const { blob, fileName: finalName } = await compressFilePayload(file, fileName);
            formData.append('file', blob, finalName);
        }
        if (payload.modules) formData.append('modules', JSON.stringify(payload.modules));
        if (payload.deletedModules) formData.append('deletedModules', JSON.stringify(payload.deletedModules));
        if (payload.functions) formData.append('functions', typeof payload.functions === 'string' ? payload.functions : JSON.stringify(payload.functions));
        if (payload.deletedFunctions) formData.append('deletedFunctions', typeof payload.deletedFunctions === 'string' ? payload.deletedFunctions : JSON.stringify(payload.deletedFunctions));
        if (payload.forceOverwrite) formData.append('forceOverwrite', JSON.stringify(payload.forceOverwrite));
        if (payload.existingModules) formData.append('existingModules', JSON.stringify(payload.existingModules));
        if (payload.proposedClients) formData.append('proposedClients', JSON.stringify(payload.proposedClients));
        if (payload.baseUrl) formData.append('baseUrl', payload.baseUrl);
        if (fileName) formData.append('fileName', fileName);
        formData.append('targetDir', targetDir);
        const apiServicesDir = await getApiServicesDir();
        if (apiServicesDir) formData.append('apiServicesDir', apiServicesDir);
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
            const apiServicesDir = await getApiServicesDir();
            const res = await fetch(`${cloudUrl}/save-types`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...data, apiServicesDir }),
            });
            return handleOperationResponse(res);
        } catch (error: any) {
            return { success: false, error: error.message || String(error) };
        }
    },

    syncCollection: async (payload: any, targetDir: string) => {
        const formData = new FormData();

        const file = payload.file;
        let fileName = payload.fileName || (file ? file.name : undefined);

        if (file) {
            const { blob, fileName: finalName } = await compressFilePayload(file, fileName);
            formData.append('file', blob, finalName);
        }
        if (payload.modules) formData.append('modules', JSON.stringify(payload.modules));
        if (payload.deletedModules) formData.append('deletedModules', JSON.stringify(payload.deletedModules));
        if (payload.functions) formData.append('functions', typeof payload.functions === 'string' ? payload.functions : JSON.stringify(payload.functions));
        if (fileName) formData.append('fileName', fileName);
        formData.append('targetDir', targetDir);
        const apiServicesDir = await getApiServicesDir();
        if (apiServicesDir) formData.append('apiServicesDir', apiServicesDir);

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
