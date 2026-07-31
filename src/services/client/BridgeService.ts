
import { getLocalUrl, cloudUrl } from "./utils";
import { isLocalhostUrl } from "@/lib/urlUtils";

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
            if (e instanceof TypeError) {
                return { targetDir: null, isNetworkError: true };
            }
            return { targetDir: null, isNetworkError: false };
        }
    },

    // Execution could be viewed as separate, but often runs client-side making request
    executeRequest: async (config: { url: string; method: string; data?: any; formData?: any[]; headers?: any; useProxy?: boolean; isStandaloneMode?: boolean }) => {
        try {
            const { url, method, data, formData, headers, useProxy, isStandaloneMode } = config;
            const isLocal = isLocalhostUrl(url);
            const isNativeFormData = data instanceof FormData;
            const hasFiles = formData?.some((p: any) => p.type === 'file' && p.file) || false;

            const getProxyOptions = (): RequestInit => {
                if (hasFiles || isNativeFormData) {
                    const proxyData = new FormData();
                    proxyData.append('url', url);
                    proxyData.append('method', method);
                    if (headers) proxyData.append('headers', JSON.stringify(headers));

                    if (isNativeFormData) {
                        const metadata: any[] = [];
                        let fileIndex = 0;
                        (data as FormData).forEach((value, key) => {
                            if (value instanceof File) {
                                metadata.push({ key, value: value.name, type: 'file' });
                                proxyData.append(`file_${fileIndex}`, value);
                                fileIndex++;
                            } else {
                                metadata.push({ key, value: String(value), type: 'text' });
                            }
                        });
                        proxyData.append('formDataStr', JSON.stringify(metadata));
                    } else if (formData) {
                         const metadata = formData.map((p: any) => ({ key: p.key, value: p.value, type: p.type }));
                         proxyData.append('formDataStr', JSON.stringify(metadata));
                         formData.forEach((p: any, index: number) => {
                             if (p.type === 'file' && p.file) {
                                 proxyData.append(`file_${index}`, p.file);
                             }
                         });
                    }
                    return { method: 'POST', body: proxyData };
                }
                return {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url, method, data, formData, headers })
                };
            };

            // Use proxy for standalone mode to bypass CORS
            if (useProxy) {
                const proxyUrl = isLocal ? 'http://localhost:9876/proxy' : '/api/cors-proxy';
                try {
                    const proxyRes = await fetch(proxyUrl, getProxyOptions());
                    return await proxyRes.json();
                } catch (e: any) {
                    if (isLocal) {
                        return { success: false, error: 'Could not connect to the local proxy. Run `npx reex-proxy` in your terminal first.' };
                    }
                    throw e;
                }
            }

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

            let res;
            try {
                res = await fetch(url, options);
            } catch (fetchError: any) {
                // If direct fetch fails due to network/CORS error, try falling back to Proxy
                // Browsers throw a TypeError for CORS blocks and connection refused
                if (fetchError instanceof TypeError) {
                    const fallbackProxyUrl = isLocal ? 'http://localhost:9876/proxy' : '/api/cors-proxy';
                    

                    console.warn(`[CORS Fallback] Direct request to ${url} failed. Retrying via proxy (${fallbackProxyUrl})...`);
                    try {
                        const proxyRes = await fetch(fallbackProxyUrl, getProxyOptions());
                        return await proxyRes.json();
                    } catch (e: any) {
                        if (isLocal) {
                            return { success: false, error: 'Request blocked by CORS (or server unreachable). We tried using the local proxy but it failed. Run `npx reex-proxy` in your terminal to bypass CORS for localhost.' };
                        }
                        throw e;
                    }
                }
                throw fetchError;
            }

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
