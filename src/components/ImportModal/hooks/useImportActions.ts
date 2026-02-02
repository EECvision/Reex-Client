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
    onConfigUpdate
}: UseImportActionsProps) => {
    const [step, setStep] = useState<ImportStep>("upload");
    const [proposedClients, setProposedClients] = useState<Record<string, string> | undefined>(undefined);
    const [baseUrl, setBaseUrl] = useState<string | undefined>(undefined);
    const [collectionName, setCollectionName] = useState<string | undefined>(undefined);
    // Store full analysis data for standalone mode
    const [analysisData, setAnalysisData] = useState<any>(null);

    const startAnalysis = async (clientMappings?: Record<string, string>) => {
        if (!selectedFile) return;
        setStep("analyzing");

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

        // Extract URL from: const url = `/path/${param}`;  or  const url = '/path';
        let url = '';
        // Handle template literal: const url = `...`;
        const templateMatch = code.match(/const\s+url\s*=\s*`([^`]*)`/);
        if (templateMatch) {
            url = templateMatch[1];
        } else {
            // Handle string literal: const url = '...' or "..."
            const stringMatch = code.match(/const\s+url\s*=\s*['"]([^'"]*)['"]/);
            if (stringMatch) {
                url = stringMatch[1];
            }
        }

        // Check for @auth in JSDoc comments: /** @auth */ or /* @auth */
        const requiresAuth = /@auth\b/.test(code);

        // Extract @contentType from JSDoc: @contentType multipart/form-data
        let contentType: string | undefined;
        const contentTypeMatch = code.match(/@contentType\s+([^\s*]+)/);
        if (contentTypeMatch) {
            contentType = contentTypeMatch[1];
        }

        // Extract client name from handleApiCall
        // e.g. handleApiCall(() => AUTH_CLIENT.post(...))
        // Use \s* to handle potential newlines from Prettier formatting
        let client: string | undefined;
        const clientMatch = code.match(/handleApiCall\s*\(\s*\(\)\s*=>\s*([a-zA-Z0-9_]+)\./);
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

    const handleUpdate = async (diffs: DiffResult[], selectedModules: Set<string>, selectedFunctions: Map<string, Set<string>>) => {
        if (!selectedFile) return;
        setStep("updating");

        // Standalone mode: Build manifest locally and update context
        if (isStandaloneMode) {
            try {
                const manifest = buildManifestFromDiffs(diffs, selectedModules, selectedFunctions);

                if (onManifestUpdate) {
                    onManifestUpdate(manifest);
                }

                const derivedClients: Record<string, string> = {};
                if (proposedClients && baseUrl) {
                    Object.entries(proposedClients).forEach(([name, prefix]) => {
                        const cleanBase = baseUrl.replace(/\/$/, "");
                        const cleanPrefix = prefix.startsWith("/") ? prefix : "/" + prefix;
                        derivedClients[name] = cleanBase + cleanPrefix;
                    });
                }
                console.log("[Standalone Import] BaseUrl:", baseUrl);
                console.log("[Standalone Import] Proposed:", proposedClients);
                console.log("[Standalone Import] Derived Clients:", derivedClients);

                if (onConfigUpdate) {
                    onConfigUpdate({
                        baseURL: baseUrl || '',
                        collectionName: collectionName || 'Imported Collection',
                        clientPrefixes: proposedClients,
                        clients: derivedClients
                    });
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
