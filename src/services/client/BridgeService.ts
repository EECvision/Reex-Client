
import { getLocalUrl, cloudUrl } from "./utils";

export const BridgeService = {
    readFile: async (filePath: string, bridgeUrl?: string) => {
        const url = bridgeUrl || getLocalUrl();
        const res = await fetch(`${url}/api/fs/read`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filePath })
        });
        return res.json();
    },

    updateProjectConfig: async (config: { baseUrl?: string; clients?: Record<string, string>; collectionName?: string }) => {
        const url = getLocalUrl();
        const res = await fetch(`${url}/api/project/config/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
        });
        return res.json();
    },

    syncProjectClients: async () => {
        const url = getLocalUrl();
        const res = await fetch(`${url}/api/project/config/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
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

    // Execution could be viewed as separate, but often runs client-side making request
    executeRequest: async (config: { url: string; method: string; data?: any; headers?: any }) => {
        try {
            const { url, method, data, headers } = config;

            const isFormData = data instanceof FormData;

            const options: RequestInit = {
                method: method.toUpperCase(),
                headers: {
                    // Don't set Content-Type for FormData - browser sets it with boundary
                    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
                    ...headers
                },
            };

            if (data && method.toUpperCase() !== 'GET' && method.toUpperCase() !== 'HEAD') {
                // Pass FormData directly, stringify other data
                options.body = isFormData ? data : JSON.stringify(data);
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

    // Hybrid Project Fetchers (Cloud or Bridge)
    fetchProjectManifest: async (baseUrl?: string) => {
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

    fetchProjectDefinitions: async (baseUrl?: string) => {
        const root = baseUrl || cloudUrl;
        const apiPath = baseUrl ? `${baseUrl}/api/project/definitions` : `${root}/project/definitions`;

        const res = await fetch(apiPath);
        if (!res.ok) throw new Error("Failed to fetch definitions");
        return res.json();
    },
};
