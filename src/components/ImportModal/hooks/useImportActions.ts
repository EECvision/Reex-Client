import { useState } from 'react';
import { api } from '../../../services/api';
import { DiffResult, ImportStep } from '../importTypes';

interface UseImportActionsProps {
    selectedFile: File | null;
    targetDir: string;
    onUpdateStarted?: (taskId: string) => void;
    onSuccess?: (message: string) => void;
    setDiffs: (diffs: DiffResult[]) => void;
    setSelectedModules: (modules: Set<string>) => void;
    setSelectedFunctions: (funcs: Map<string, Set<string>>) => void;
    forceOverwriteFunctions: Set<string>;
    onError: (message: string) => void;
    // Standalone mode props
    isStandaloneMode?: boolean;
    onManifestUpdate?: (manifest: any) => void;
    onConfigUpdate?: (config: any) => void;
    addCollection?: (collection: any) => void;
    addCollectionToHistory?: (name: string, content: any) => Promise<void>;
}

export const useImportActions = ({
    selectedFile,
    targetDir,
    onUpdateStarted,
    onSuccess,
    onError,
    setDiffs,
    setSelectedModules,
    setSelectedFunctions,
    forceOverwriteFunctions,
    isStandaloneMode = false,
    onManifestUpdate,
    onConfigUpdate,
    addCollection,
    addCollectionToHistory
}: UseImportActionsProps) => {
    const [step, setStep] = useState<ImportStep>("upload");
    const [proposedClients, setProposedClients] = useState<Record<string, string> | undefined>(undefined);
    const [baseUrl, setBaseUrl] = useState<string | undefined>(undefined);
    const [collectionName, setCollectionName] = useState<string | undefined>(undefined);
    // Store full analysis data for standalone mode
    const [analysisData, setAnalysisData] = useState<any>(null);
    const [fileContent, setFileContent] = useState<string | null>(null);

    const startAnalysis = async (clientMappings?: Record<string, string>) => {
        if (!selectedFile) return;
        setStep("analyzing");

        const reader = new FileReader();
        reader.onload = (e) => {
            if (e.target?.result) setFileContent(e.target.result as string);
        };
        reader.readAsText(selectedFile);

        try {
            const res = await api.analyzeCollection(selectedFile, selectedFile.name, targetDir, clientMappings);
            const data = res;

            if (!res.success) throw new Error(res.error || "Analysis failed");

            const responseData = data.data;
            // Handle both legacy (array) and new (object) response formats
            let diffs: DiffResult[];
            let proposedClients: Record<string, string> | undefined;

            if (Array.isArray(responseData)) {
                diffs = responseData;
            } else {
                diffs = responseData.diffs;
                proposedClients = responseData.proposedClients;
                setBaseUrl(responseData.baseUrl);
                setCollectionName(responseData.collectionName);
                // Store full data for standalone mode
                setAnalysisData(responseData);
            }

            setDiffs(diffs);
            setProposedClients(proposedClients);

            // Auto-select logic
            const newModules = new Set<string>();
            const newFunctions = new Map<string, Set<string>>();

            diffs.forEach((d: DiffResult) => {
                newModules.add(d.module);
                if (d.functions && d.functions.length > 0) {
                    const funcs = new Set<string>();
                    d.functions.forEach((f) => {
                        if (f.status !== "deleted") funcs.add(f.name);
                    });
                    if (funcs.size > 0 && d.status !== "disabled") {
                        newFunctions.set(d.module, funcs);
                    }
                }
            });

            diffs.forEach((d: DiffResult) => {
                if (d.status === "disabled") newModules.delete(d.module);
            });

            setSelectedModules(newModules);
            setSelectedFunctions(newFunctions);
            setStep("review");
        } catch (err) {
            console.error(err);
            onError(`Analysis failed: ${(err as Error).message}`);
            setStep("upload");
        }
    };

    // Helper to extract metadata from generated function code
    // This mirrors the extractMetadata function in ProjectService but uses regex
    // since we can't use ts-morph in the browser (it requires Node.js fs module)
    const extractMetadataFromCode = (code: string): { url: string; requiresAuth: boolean; contentType?: string; client?: string } => {
        if (!code) return { url: '', requiresAuth: false };

        // Extract URL from inline apiClient.method(`/path`) calls
        // Generated definitions use: apiClient.get(`/api/v1/path`)
        //                        or: apiClient.post(`/api/v1/path/${id}`, payload)
        let url = '';
        // Match: CLIENT.method(`/path`) or CLIENT.method(`/path/${param}/suffix`)
        const inlineTemplateMatch = code.match(/\w+\.(get|post|put|delete|patch)\(\s*`([^`]*)`/);
        if (inlineTemplateMatch) {
            url = inlineTemplateMatch[2];
        } else {
            // Match: CLIENT.method("/path") or CLIENT.method('/path')
            const inlineStringMatch = code.match(/\w+\.(get|post|put|delete|patch)\(\s*['"]([^'"]*)['"]/);
            if (inlineStringMatch) {
                url = inlineStringMatch[2];
            }
        }

        // Check for @auth in JSDoc comments: /** @auth */ or /* @auth */
        const requiresAuth = /@auth\b/.test(code) || /\*+\s*@auth/.test(code);

        // Extract @contentType from JSDoc: @contentType multipart/form-data
        let contentType: string | undefined;
        const contentTypeMatch = code.match(/@contentType\s+([^\s*]+)/);
        if (contentTypeMatch) {
            contentType = contentTypeMatch[1];
        }

        // Extract client name from inline CLIENT.method() calls
        let client: string | undefined;
        const clientMatch = code.match(/(\w+)\.(get|post|put|delete|patch)\(/);
        if (clientMatch) {
            client = clientMatch[1];
        }

        return { url, requiresAuth, contentType, client };
    };

    // Build manifest from diffs for standalone mode
    const buildManifestFromDiffs = (diffs: DiffResult[], selectedModules: Set<string>, selectedFunctions: Map<string, Set<string>>): any => {
        const manifest: any = {};

        diffs.forEach((diff) => {
            if (!selectedModules.has(diff.module)) return;

            const moduleFunctions = selectedFunctions.get(diff.module);
            if (!moduleFunctions || moduleFunctions.size === 0) return;

            manifest[diff.module] = {};

            diff.functions?.forEach((fn) => {
                if (!moduleFunctions.has(fn.name)) return;

                // Cast to any to access optional metadata fields from analysis response
                const fnData = fn as any;
                const fnCode = fnData.newContent || '';

                // Extract metadata from generated code (mirrors ProjectService.extractMetadata)
                const extractedMeta = extractMetadataFromCode(fnCode);

                // Use extracted values, falling back to any data already available
                const url = fnData.path || fnData.url || extractedMeta.url;
                const requiresAuth = fnData.requiresAuth ?? extractedMeta.requiresAuth;
                const contentType = fnData.contentType || extractedMeta.contentType;
                const client = fnData.client || extractedMeta.client || "BASE_CLIENT";

                // Build endpoint info from function data
                manifest[diff.module][fn.name] = {
                    fnName: fn.name,
                    apiKey: diff.module,
                    method: fnData.method || extractMethodFromName(fn.name),
                    url, // Use 'url' to match SidebarController and getComputedUrl expectations
                    client,
                    args: fnData.params || fnData.args || [],
                    requiresAuth,
                    contentType,
                    inputType: fnData.inputType,
                    outputType: fnData.outputType
                };
            });

            // Remove empty modules
            if (Object.keys(manifest[diff.module]).length === 0) {
                delete manifest[diff.module];
            }
        });

        return manifest;
    };

    // Helper to extract HTTP method from function name (e.g., "get_users" -> "GET")
    const extractMethodFromName = (fnName: string): string => {
        const methodPrefixes = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];
        const lowerName = fnName.toLowerCase();
        for (const prefix of methodPrefixes) {
            if (lowerName.startsWith(prefix + '_') || lowerName === prefix) {
                return prefix.toUpperCase();
            }
        }
        return 'GET';
    };

    const saveToHistory = (name: string) => {
        if (!addCollectionToHistory || !fileContent) return;
        try {
            const jsonContent = JSON.parse(fileContent);
            addCollectionToHistory(name, jsonContent).catch(e => console.error("History save failed:", e));
        } catch (e) {
            console.warn("Could not parse file content for history", e);
        }
    };

    const handleUpdate = async (diffs: DiffResult[], selectedModules: Set<string>, selectedFunctions: Map<string, Set<string>>) => {
        if (!selectedFile) return;
        setStep("updating");

        // Standalone mode: Build manifest locally and update context
        if (isStandaloneMode) {
            try {
                const manifest = buildManifestFromDiffs(diffs, selectedModules, selectedFunctions);

                const derivedClients: Record<string, string> = {};
                if (proposedClients && baseUrl) {
                    Object.entries(proposedClients).forEach(([name, prefix]) => {
                        const cleanBase = baseUrl.replace(/\/$/, "");
                        const cleanPrefix = prefix.startsWith("/") ? prefix : "/" + prefix;
                        derivedClients[name] = cleanBase + cleanPrefix;
                    });
                }

                if (addCollection) {
                    // New Multi-Collection Flow
                    const newCollection = {
                        id: crypto.randomUUID(), // Or Date.now().toString() if crypto not avail
                        name: collectionName || 'Imported Collection',
                        manifest,
                        modules: [], // Can generate modules list from manifest keys if needed by UI
                        config: {
                            baseURL: baseUrl || '',
                            collectionName: collectionName || 'Imported Collection',
                            clientPrefixes: proposedClients,
                            clients: derivedClients
                        }
                    };
                    addCollection(newCollection);
                } else {
                    // Legacy Fallback (Should not be hit if wired correctly)
                    if (onManifestUpdate) {
                        onManifestUpdate(manifest);
                    }
                    if (onConfigUpdate) {
                        onConfigUpdate({
                            baseURL: baseUrl || '',
                            collectionName: collectionName || 'Imported Collection',
                            clientPrefixes: proposedClients,
                            clients: derivedClients
                        });
                    }
                }

                if (collectionName) {
                    saveToHistory(collectionName);
                }

                setStep("success");
                if (onSuccess) {
                    onSuccess("Collection imported successfully!");
                }
            } catch (err) {
                console.error(err);
                onError(`Import failed: ${(err as Error).message}`);
                setStep("review");
            }
            return;
        }

        // Connected mode: Original bridge-based flow
        try {
            const functionMapObj: Record<string, string[]> = {};
            selectedFunctions.forEach((value, key) => {
                if (value.size > 0) {
                    functionMapObj[key] = Array.from(value);
                }
            });

            const deletedModules = diffs
                .filter(
                    (d) =>
                        d.status !== "new" &&
                        !selectedModules.has(d.module) &&
                        d.status !== "disabled"
                )
                .map((d) => d.module);

            // Fetch existing definitions for preservation
            let existingModules = {};
            try {
                existingModules = await api.fetchProjectDefinitions(api.getBridgeUrl());
            } catch (e) {
                console.warn("Failed to fetch existing definitions for merge:", e);
            }

            const payload = {
                file: selectedFile,
                fileName: selectedFile.name,
                modules: Array.from(selectedModules),
                deletedModules,
                functions: functionMapObj,
                forceOverwrite: Array.from(forceOverwriteFunctions),
                existingModules,
                proposedClients,
                baseUrl
            };

            const taskId = Date.now().toString();
            if (onUpdateStarted) {
                onUpdateStarted(taskId);
            }

            const res = await api.updateCollection(payload, targetDir, api.getBridgeUrl(), taskId);

            if (!res.success) {
                throw new Error(res.error || "Sync failed");
            }

            // 1. Update Config (Bridge-Driven)
            const { proposedBaseUrl, proposedClients: responseProposedClients, operations } = res.data || res;

            // Prefer response proposed clients if available, else fall back to state
            const finalClients = responseProposedClients || proposedClients;
            const finalBaseUrl = proposedBaseUrl || baseUrl;

            if (finalBaseUrl || (finalClients && Object.keys(finalClients).length > 0) || res.data?.collectionName) {
                try {
                    await api.updateProjectConfig({
                        baseUrl: finalBaseUrl,
                        clients: finalClients,
                        collectionName: res.data?.collectionName || collectionName
                    });
                } catch (e) {
                    console.error("Config update failed:", e);
                    // Non-fatal, proceed to write definitions if possible
                }
            }

            // 2. Execute File Operations (Definitions)
            // Manual handling to ensure definitions are written AFTER config update
            const bridgeUrl = api.getBridgeUrl();

            if (operations && Array.isArray(operations)) {
                for (const op of operations) {
                    try {
                        if (op.type === 'write') {
                            await fetch(`${bridgeUrl}/api/fs/write`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ filePath: op.filePath, content: op.content })
                            });
                        } else if (op.type === 'delete') {
                            await fetch(`${bridgeUrl}/api/fs/delete`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ filePath: op.filePath })
                            });
                        }
                    } catch (e) {
                        console.error(`Operation failed: ${op.type} ${op.filePath}`, e);
                        // Continue? Yes, partial success is better than full stop
                    }
                }
            }

            // 3. Sync/Prune Clients (Post-Update)
            try {
                await api.syncProjectClients();
            } catch (e) {
                console.warn("Client sync/prune failed:", e);
            }

            if (res.data?.collectionName || collectionName) {
                saveToHistory(res.data?.collectionName || collectionName || 'Imported Collection');
            }

            setStep("success");
            // if (onSuccess) onSuccess("Collection updated successfully!");

        } catch (err) {
            console.error(err);
            onError(`Sync failed: ${(err as Error).message}`);
            setStep("review");
        }
    };

    return {
        step,
        setStep,
        startAnalysis,
        handleUpdate
    };
};
