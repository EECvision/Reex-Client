
import { useState } from "react";
import { api } from "@/services/api";
import { EndpointInfo } from "@/types";

type InputMode = "form" | "raw";

interface UseEndpointExecutionProps {
    projectConfig: any;
    apiManifest: any;
    showToast: (type: "success" | "error", message: string) => void;
    authToken?: string;
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

export const useEndpointExecution = ({ projectConfig, apiManifest, showToast, authToken }: UseEndpointExecutionProps) => {
    const [selectedEndpoint, setSelectedEndpoint] = useState<EndpointInfo | null>(null);
    const [params, setParams] = useState<ParamsState>({});
    const [rawPayloads, setRawPayloads] = useState<RawPayloadState>({});
    const [inputModes, setInputModes] = useState<InputModeState>({});
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const [interfacePreview, setInterfacePreview] = useState<string | null>(null);
    const [savingInterface, setSavingInterface] = useState(false);
    const [copied, setCopied] = useState(false);

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
        if (!selectedEndpoint || !projectConfig || !apiManifest) return "";
        const { apiKey, fnName } = selectedEndpoint;
        const endpointDef = apiManifest[apiKey]?.[fnName];

        if (!endpointDef) return "";

        const clientName = endpointDef.client || "BASE_CLIENT";
        const clientBase = projectConfig.clients?.[clientName] || projectConfig.baseURL;
        const path = endpointDef.url || "";

        return `${clientBase}${path}`;
    };

    const handleSubmit = async () => {
        if (!selectedEndpoint) return;

        setResult(null);
        setError(null);
        setLoading(true);

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
                clientBase = projectConfig.clients?.[clientName] || projectConfig.baseURL || "http://localhost:3000/api";
            }

            let urlTemplate = endpointDef?.url || selectedEndpoint.url || "";
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

            const cleanBase = clientBase.replace(/\/$/, "");
            const cleanPath = finalUrl.startsWith("/") ? finalUrl : `/${finalUrl}`;
            const fullUrl = `${cleanBase}${cleanPath}`;

            let requestUrl = fullUrl;
            let requestData: Record<string, any> | FormData | undefined = remainingData;
            let headers: Record<string, string> | undefined = authToken ? { 'Authorization': `Bearer ${authToken}` } : undefined;

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

            const execRes: any = await api.executeRequest({
                url: requestUrl,
                method,
                data: requestData,
                headers
            });

            if (!execRes.success) {
                throw new Error(execRes.error || "Execution failed");
            }

            const res = execRes.data;
            const payload = res?.data ?? res;

            setResult(payload);

            // Get interface preview
            if (payload) {
                try {
                    const previewData = await api.previewTypes({
                        data: payload,
                        fnName: selectedEndpoint.fnName,
                    });
                    if (previewData && previewData.success) {
                        setInterfacePreview((previewData as any).interfaceString);
                    }
                } catch (e) {
                    console.error("Failed to generate preview", e);
                }
            }
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Unknown error");
        } finally {
            setLoading(false);
        }
    };

    const handleSaveInterface = async () => {
        if (!selectedEndpoint || !result) return;
        setSavingInterface(true);
        try {
            const data = await api.saveTypes({
                apiKey: selectedEndpoint.apiKey,
                fnName: selectedEndpoint.fnName,
                data: result,
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
        navigator.clipboard.writeText(JSON.stringify(result, null, 2));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const clearResult = () => {
        setResult(null);
        setError(null);
        setInterfacePreview(null);
    }

    // Reset result when endpoint changes
    const selectEndpoint = (endpoint: EndpointInfo) => {
        setSelectedEndpoint(endpoint);
        clearResult();
    };

    return {
        selectedEndpoint,
        selectEndpoint, // Replaces simple setter
        params,
        result,
        error,
        loading,
        interfacePreview,
        savingInterface,
        copied,
        handleParamChange,
        handleSubmit,
        handleSaveInterface,
        isSubmitDisabled,
        handleCopy,
        getComputedUrl,
        // Raw payload mode
        rawPayload: getCurrentRawPayload(),
        inputMode: getCurrentInputMode(),
        handleRawPayloadChange,
        handleInputModeChange,
    };
};
