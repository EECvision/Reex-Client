
import { useState, useEffect, useRef } from "react";
import { api } from "@/services/api";
import { EndpointInfo } from "@/types";

type InputMode = "form" | "raw";

interface UseEndpointExecutionProps {
    projectConfig: any;
    apiManifest: any;
    showToast: (type: "success" | "error", message: string) => void;
    authToken?: string;
    customHeaders?: Record<string, string>;
    isStandaloneMode?: boolean;
    selectedEndpoint: EndpointInfo | null;
}

type ParamsState = {
    [key: string]: {
        [key: string]: any;
    };
};

type RawPayloadState = {
    [key: string]: string;
};

type InputModeState = {
    [key: string]: InputMode;
};

export const useEndpointExecution = ({ projectConfig, apiManifest, showToast, authToken, customHeaders = {}, isStandaloneMode = false, selectedEndpoint }: UseEndpointExecutionProps) => {
    // Internal state for execution management
    const [params, setParams] = useState<ParamsState>({});
    const [rawPayloads, setRawPayloads] = useState<RawPayloadState>({});
    const [inputModes, setInputModes] = useState<InputModeState>({});
    const [results, setResults] = useState<Record<string, any>>({});
    const [errors, setErrors] = useState<Record<string, string | null>>({});
    const [loading, setLoading] = useState(false);

    const [interfacePreviews, setInterfacePreviews] = useState<Record<string, string | null>>({});
    const [savingInterface, setSavingInterface] = useState(false);
    const [copied, setCopied] = useState(false);
    const [executedCurls, setExecutedCurls] = useState<Record<string, string | null>>({});

    const currentKey = selectedEndpoint ? `${selectedEndpoint.apiKey}.${selectedEndpoint.fnName}` : null;

    const tryParse = (value: any) => {
        // Don't try to parse File objects or non-strings
        if (value instanceof File || typeof value !== 'string') {
            return value;
        }
        try {
            return JSON.parse(value);
        } catch {
            return value;
        }
    };

    const handleParamChange = (paramName: string, value: any) => {
        if (!selectedEndpoint) return;
        const key = `${selectedEndpoint.apiKey}.${selectedEndpoint.fnName}`;
        setParams((prev) => ({
            ...prev,
            [key]: {
                ...prev[key],
                [paramName]: tryParse(value),
            },
        }));
    };

    const handleRawPayloadChange = (value: string) => {
        if (!selectedEndpoint) return;
        const key = `${selectedEndpoint.apiKey}.${selectedEndpoint.fnName}`;
        setRawPayloads((prev) => ({ ...prev, [key]: value }));
    };

    const handleInputModeChange = (mode: InputMode) => {
        if (!selectedEndpoint) return;
        const key = `${selectedEndpoint.apiKey}.${selectedEndpoint.fnName}`;
        setInputModes((prev) => ({ ...prev, [key]: mode }));
    };

    const getCurrentInputMode = (): InputMode => {
        if (!selectedEndpoint) return "form";
        const key = `${selectedEndpoint.apiKey}.${selectedEndpoint.fnName}`;
        return inputModes[key] || "form";
    };

    const getCurrentRawPayload = (): string => {
        if (!selectedEndpoint) return "";
        const key = `${selectedEndpoint.apiKey}.${selectedEndpoint.fnName}`;
        return rawPayloads[key] || "";
    };

    const getComputedUrl = () => {
        if (!selectedEndpoint || !projectConfig) return "";
        const { apiKey, fnName } = selectedEndpoint;
        const endpointDef = apiManifest?.[apiKey]?.[fnName];

        const clientName = endpointDef?.client || "BASE_CLIENT";
        const clientBase = (projectConfig.clients?.[clientName] || projectConfig.baseURL || "").trim();
        // Fallback to selectedEndpoint.url if endpointDef doesn't have the url
        const path = (endpointDef?.url || selectedEndpoint.url || "").trim();

        // console.log("[Execution] Computed:", { clientName, clientBase, path, full: `${clientBase}${path}` });

        return `${clientBase}${path}`;
    };

    const handleSubmit = async () => {
        if (!selectedEndpoint || !currentKey) return;

        setResults(prev => ({ ...prev, [currentKey]: null }));
        setErrors(prev => ({ ...prev, [currentKey]: null }));
        setLoading(true);
        // console.log("[Execution] Config at submit:", projectConfig);

        try {
            const key = `${selectedEndpoint.apiKey}.${selectedEndpoint.fnName}`;
            const currentInputMode = inputModes[key] || "form";
            const currentRawPayload = rawPayloads[key] || "";
            const currentParams = params[key] || {};

            // 1. Prepare Arguments Map
            let argsMap: Record<string, any> = {};

            // If in raw mode, parse the raw JSON payload
            if (currentInputMode === "raw" && currentRawPayload.trim()) {
                try {
                    argsMap = JSON.parse(currentRawPayload);
                } catch (parseErr) {
                    throw new Error("Invalid JSON in raw payload. Please check your input.");
                }
            } else if (currentInputMode === "form") {

                // Flatten params logic
                if (
                    selectedEndpoint.args.length === 1 &&
                    selectedEndpoint.args[0].isObject &&
                    Array.isArray(selectedEndpoint.args[0].properties)
                ) {
                    const props = selectedEndpoint.args[0].properties;
                    for (const prop of props) {
                        const value = currentParams[prop.name];
                        if (value !== undefined && value !== "") {
                            argsMap[prop.name] = value;
                        } else if (!prop.isOptional) {
                            throw new Error(`Missing required field: ${prop.name}`);
                        }
                    }
                } else {
                    selectedEndpoint.args.forEach(arg => {
                        const value = currentParams[arg.name];
                        if (value !== undefined && value !== "") {
                            argsMap[arg.name] = value;
                        } else if (!arg.isOptional) {
                            throw new Error(`Missing required param: ${arg.name}`);
                        }
                    });
                }
            }

            // 2. Construct URL & Method
            const endpointDef = apiManifest?.[selectedEndpoint.apiKey]?.[selectedEndpoint.fnName];
            const method = endpointDef?.method || selectedEndpoint.method || "GET";

            let clientBase = "";
            if (projectConfig) {
                const clientName = endpointDef?.client || "BASE_CLIENT";
                clientBase = (projectConfig.clients?.[clientName] || projectConfig.baseURL || "http://localhost:3000/api").trim();
            }

            let urlTemplate = (endpointDef?.url || selectedEndpoint.url || "").trim();
            let finalUrl = urlTemplate;
            const consumedParams = new Set<string>();

            const pathVars = finalUrl.match(/\${([^}]+)}/g);
            if (pathVars) {
                pathVars.forEach((pv: string) => {
                    const varName = pv.replace("${", "").replace("}", "");
                    if (argsMap[varName] !== undefined) {
                        finalUrl = finalUrl.replace(pv, String(argsMap[varName]));
                        consumedParams.add(varName);
                    } else {
                        finalUrl = finalUrl.replace(pv, "");
                    }
                });
            }

            // 3. Prepare Payload / Query
            const remainingData: Record<string, any> = {};
            Object.keys(argsMap).forEach(k => {
                if (!consumedParams.has(k)) {
                    remainingData[k] = argsMap[k];
                }
            });

            const cleanBase = clientBase.replace(/\/+$/, "");
            const cleanPath = finalUrl.startsWith("/") ? finalUrl : `/${finalUrl}`;
            const fullUrl = `${cleanBase}${cleanPath}`;

            // console.log("[Execution] URL Construction:", { clientBase, cleanBase, cleanPath, fullUrl });

            let requestUrl = fullUrl;
            let requestData: Record<string, any> | FormData | undefined = remainingData;

            // Prepare Request Headers
            let headers: Record<string, string> = {};
            if (authToken) {
                headers['Authorization'] = `Bearer ${authToken}`;
            }
            if (customHeaders) {
                Object.assign(headers, customHeaders);
            }
            // If empty, make undefined to match previous logic (though api service handles generic obj fine)
            // But api.executeRequest signature expects headers? any.

            // Check if this is a multipart/form-data request
            const isMultipart = selectedEndpoint.contentType === 'multipart/form-data';

            if (method.toUpperCase() === 'GET' || method.toUpperCase() === 'DELETE') {
                const cleanParams: Record<string, string> = {};
                Object.entries(remainingData).forEach(([k, v]) => {
                    if (v !== undefined && v !== null) {
                        cleanParams[k] = String(v);
                    }
                });
                const qs = new URLSearchParams(cleanParams).toString();
                if (qs) {
                    requestUrl += `?${qs}`;
                }
                requestData = undefined;
            } else if (isMultipart) {
                // Build FormData for multipart requests
                const formData = new FormData();
                Object.entries(remainingData).forEach(([k, v]) => {
                    if (v instanceof File) {
                        formData.append(k, v);
                    } else if (v !== undefined && v !== null) {
                        formData.append(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
                    }
                });
                requestData = formData;
                // Don't set Content-Type for FormData - browser will set it with boundary
            }

            // FormData cannot be sent through the JSON proxy - show helpful error in standalone mode
            const isFormDataRequest = requestData instanceof FormData;
            if (isStandaloneMode && isFormDataRequest) {
                throw new Error("File uploads are not supported in standalone mode. Please connect to the bridge to test multipart/form-data requests.");
            }

            // --- Generate Snapshot Curl ---
            let curlCmd = `curl -X '${method.toUpperCase()}' \\\n  '${requestUrl}'`;
            const curlHeaders: string[] = [];

            if (Object.keys(headers).length > 0) {
                Object.entries(headers).forEach(([k, v]) => {
                    curlHeaders.push(`-H '${k}: ${v}'`);
                });
            }
            // Always add accept header if not present (logic implies it might not be in 'headers' var but api adds it? api service usually adds it. 
            // In getGeneratedCurl we force added it. Let's force add it here for consistency if headers doesn't have it.
            // Actually, headers var is init with Auth only. Content-Type is distinct.
            if (!curlHeaders.some(h => h.toLowerCase().includes('accept:'))) {
                curlHeaders.push("-H 'accept: application/json'");
            }

            // Handle Body
            if (requestData && Object.keys(requestData).length > 0 && !isFormDataRequest) { // Simple JSON body
                curlHeaders.push("-H 'Content-Type: application/json'");
                curlCmd += ` \\\n${curlHeaders.join(" \\\n")}`;
                const jsonData = JSON.stringify(requestData, null, 2);
                curlCmd += ` \\\n-d '${jsonData}'`;
            } else {
                if (curlHeaders.length > 0) {
                    curlCmd += ` \\\n${curlHeaders.join(" \\\n")}`;
                }
            }
            setExecutedCurls(prev => ({ ...prev, [currentKey]: curlCmd }));
            // -----------------------------

            const execRes: any = await api.executeRequest({
                url: requestUrl,
                method,
                data: requestData,
                headers: Object.keys(headers).length > 0 ? headers : undefined,
                useProxy: isStandaloneMode && !isFormDataRequest // Use proxy for non-FormData requests in standalone mode
            });

            if (!execRes.success) {
                let errorMessage = execRes.error || "Execution failed";
                if (isStandaloneMode && (errorMessage.includes("404") || errorMessage.toLowerCase().includes("not found"))) {
                    errorMessage += "\n\n💡 Hint: The server returned 404. Please check if your Base URL is missing a path prefix (e.g. '/api').";
                }
                throw new Error(errorMessage);
            }

            const res = execRes.data;
            const payload = res?.data ?? res;

            setResults(prev => ({ ...prev, [currentKey]: payload }));

            // Get interface preview
            if (payload) {
                try {
                    const previewData = await api.previewTypes({
                        data: payload,
                        fnName: selectedEndpoint.fnName,
                    });
                    if (previewData && previewData.success) {
                        setInterfacePreviews(prev => ({ ...prev, [currentKey]: (previewData as any).interfaceString }));
                    }
                } catch (e) {
                    console.error("Failed to generate preview", e);
                }
            }
        } catch (err: any) {
            console.error(err);
            setErrors(prev => ({ ...prev, [currentKey]: err.message || "Unknown error" }));
        } finally {
            setLoading(false);
        }
    };

    const handleSaveInterface = async () => {
        const currentResult = currentKey ? results[currentKey] : null;
        if (!selectedEndpoint || !currentResult) return;
        setSavingInterface(true);
        try {
            const data = await api.saveTypes({
                apiKey: selectedEndpoint.apiKey,
                fnName: selectedEndpoint.fnName,
                data: currentResult,
            });

            if (data && data.success) {
                showToast("success", "Interface updated successfully!");
            } else {
                showToast("error", data?.error || "Failed to update interface");
            }
        } catch (e: any) {
            showToast("error", e.message);
        } finally {
            setSavingInterface(false);
        }
    };

    const isSubmitDisabled = () => {
        if (!selectedEndpoint || loading) return true;

        const key = `${selectedEndpoint.apiKey}.${selectedEndpoint.fnName}`;
        const currentInputMode = inputModes[key] || "form";

        // In raw mode, just check if there's content
        if (currentInputMode === "raw") {
            const rawPayload = rawPayloads[key] || "";
            return !rawPayload.trim();
        }

        // In form mode, check required fields
        const currentParams = params[key] || {};

        const requiredFields = selectedEndpoint.args.flatMap((arg) => {
            if (arg.isObject && Array.isArray((arg as any).properties)) {
                return (arg as any).properties
                    .filter((p: any) => !p.isOptional)
                    .map((p: any) => p.name);
            } else if (!arg.isOptional) {
                return [arg.name];
            } else {
                return [];
            }
        });

        return !requiredFields.every((field) => {
            const value = currentParams[field];
            return value !== undefined && value !== "";
        });
    };

    const handleCopy = () => {
        const currentResult = currentKey ? results[currentKey] : null;
        navigator.clipboard.writeText(JSON.stringify(currentResult, null, 2));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };



    return {
        selectedEndpoint,
        // selectEndpoint removed - controlled by parent
        params,
        result: currentKey ? results[currentKey] : null,
        error: currentKey ? errors[currentKey] : null,
        loading,
        interfacePreview: currentKey ? interfacePreviews[currentKey] : null,
        savingInterface,
        copied,
        handleParamChange,
        handleSubmit,
        handleSaveInterface,
        isSubmitDisabled,
        handleCopy,
        getComputedUrl,
        // generatedCurl replaced by executedCurl
        generatedCurl: currentKey ? (executedCurls[currentKey] || "") : "",
        getGeneratedCurl: () => currentKey ? (executedCurls[currentKey] || "") : "", // Backward compat if needed or just replace usage
        // Raw payload mode
        rawPayload: getCurrentRawPayload(),
        inputMode: getCurrentInputMode(),
        handleRawPayloadChange,
        handleInputModeChange,
    };
};
