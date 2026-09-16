import { useState, useCallback, useRef } from 'react';
import { api } from '../../../services/api';
import { DiffResult, ImportStep } from '../importTypes';
import yaml from 'js-yaml';
import { EndpointInfo, ProjectConfig } from '@/types';
import { StandaloneCollection } from '@/providers/ProjectContext';

interface UseImportActionsProps {
    selectedFile: File | null;
    targetDir: string;
    onUpdateStarted?: (taskId: string) => void;
    onSuccess?: (message: string) => void;
    setDiffs: (diffs: DiffResult[]) => void;
    setSelectedModules: (modules: Set<string>) => void;
    setRemovedModules: (modules: Set<string>) => void;
    setSelectedFunctions: (funcs: Map<string, Set<string>>) => void;
    setRemovedFunctions: (funcs: Map<string, Set<string>>) => void;
    forceOverwriteFunctions: Set<string>;
    onError: (message: string) => void;
    // Standalone mode props
    isStandaloneMode?: boolean;
    onManifestUpdate?: (manifest: Record<string, Record<string, EndpointInfo>> | null) => void;
    onConfigUpdate?: (config: ProjectConfig | null) => void;
    addCollection?: (collection: StandaloneCollection) => Promise<void>;
    updateCollection?: (id: string, updates: Partial<StandaloneCollection>) => Promise<void>;
    existingCollection?: StandaloneCollection;
    addCollectionToHistory?: (name: string, content: Record<string, unknown>) => Promise<void>;
}

export const useImportActions = ({
    selectedFile,
    targetDir,
    onUpdateStarted,
    onSuccess,
    onError,
    setDiffs,
    setSelectedModules,
    setRemovedModules,
    setSelectedFunctions,
    setRemovedFunctions,
    forceOverwriteFunctions,
    isStandaloneMode = false,
    onManifestUpdate,
    onConfigUpdate,
    addCollection,
    updateCollection,
    existingCollection,
    addCollectionToHistory
}: UseImportActionsProps) => {
    const [step, setStep] = useState<ImportStep>("upload");
    const [proposedClients, setProposedClients] = useState<Record<string, string> | undefined>(undefined);
    const [baseUrl, setBaseUrl] = useState<string | undefined>(undefined);
    const [collectionName, setCollectionName] = useState<string | undefined>(undefined);
    // Store full analysis data for standalone mode

    const [fileContent, setFileContent] = useState<string | null>(null);
    const isAnalyzingRef = useRef(false);

    const startAnalysis = useCallback(async (clientMappings?: Record<string, string>) => {
        if (!selectedFile || isAnalyzingRef.current) return;
        isAnalyzingRef.current = true;
        setStep("analyzing");

        let fileToAnalyze = selectedFile;
        // Check for YAML and convert to JSON
        const lowerName = selectedFile.name.toLowerCase();
        const isYaml = lowerName.endsWith('.yaml') || lowerName.endsWith('.yml') || lowerName.endsWith('.openapi') || lowerName.endsWith('.postman');

        if (isYaml) {
            try {
                const text = await selectedFile.text();
                // If it looks like YAML (not starting with {), try to parse it
                if (!text.trim().startsWith('{')) {
                    const parsed = yaml.load(text);
                    const jsonString = JSON.stringify(parsed, null, 2);
                    const newFileName = selectedFile.name.replace(/\.(yaml|yml|openapi|postman)$/i, '') + '.json';
                    fileToAnalyze = new File([jsonString], newFileName, { type: 'application/json' });
                }
            } catch (e) {
                console.warn("Failed to parse/convert YAML to JSON", e);
            }
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            if (e.target?.result) setFileContent(e.target.result as string);
        };
        reader.readAsText(fileToAnalyze);

        try {
            // Pass the exact saved existing modules directly to the diff engine
            const existingModules = existingCollection?.modules;
            const existingManifest = existingCollection?.manifest;
            const res = await api.analyzeCollection(fileToAnalyze, fileToAnalyze.name, targetDir, clientMappings, isStandaloneMode, existingModules, existingManifest);
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
            }

            setDiffs(diffs);
            setProposedClients(proposedClients);

            // Auto-select logic
            const newModules = new Set<string>();
            const newFunctions = new Map<string, Set<string>>();

            diffs.forEach((d: DiffResult) => {
                if (d.status !== "deleted") {
                    newModules.add(d.module);
                }
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
            setRemovedModules(new Set());
            setSelectedFunctions(newFunctions);
            setRemovedFunctions(new Map());
            setStep("review");
        } catch (err) {
            console.error(err);
            onError(`Analysis failed: ${(err as Error).message}`);
            setStep("upload");
        } finally {
            isAnalyzingRef.current = false;
        }
    }, [
        selectedFile,
        existingCollection?.modules,
        existingCollection?.manifest,
        targetDir,
        isStandaloneMode,
        setDiffs,
        setProposedClients,
        setSelectedModules,
        setRemovedModules,
        setSelectedFunctions,
        setRemovedFunctions,
        onError
    ]);

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
    const buildManifestFromDiffs = (diffs: DiffResult[], selectedModules: Set<string>, selectedFunctions: Map<string, Set<string>>, removedModules: Set<string>, removedFunctions: Map<string, Set<string>>): Record<string, Record<string, EndpointInfo>> => {
        const manifest: Record<string, Record<string, EndpointInfo>> = {};

        // 1. Process all selected diffs (new, modified, unchanged present in new analysis)
        diffs.forEach((diff) => {
            if (!selectedModules.has(diff.module)) return;
            if (removedModules.has(diff.module)) return;

            const moduleFunctions = selectedFunctions.get(diff.module);
            if (!moduleFunctions || moduleFunctions.size === 0) return;

            const removedModFuncs = removedFunctions.get(diff.module);

            if (!manifest[diff.module]) manifest[diff.module] = {};

            diff.functions?.forEach((fn) => {
                if (!moduleFunctions.has(fn.name)) return;
                if (removedModFuncs?.has(fn.name)) return;

                // Cast to access optional metadata fields from analysis response
                const fnData = fn as unknown as EndpointInfo & { newContent?: string; path?: string; params?: EndpointInfo['args'] };
                const fnCode = fnData.newContent || '';
                const existingFnMeta = existingCollection?.manifest?.[diff.module]?.[fn.name];

                // Extract metadata from generated code (mirrors ProjectService.extractMetadata)
                const extractedMeta = extractMetadataFromCode(fnCode);

                // Use extracted values, falling back to analyzer data, then to existing manifest
                const url = fnData.path || fnData.url || extractedMeta.url || existingFnMeta?.url || '';
                const requiresAuth = fnData.requiresAuth ?? extractedMeta.requiresAuth ?? existingFnMeta?.requiresAuth ?? false;
                const contentType = fnData.contentType || extractedMeta.contentType || existingFnMeta?.contentType;
                const client = fnData.client || extractedMeta.client || existingFnMeta?.client || "BASE_CLIENT";
                const method = fnData.method || extractedMeta.url ? extractMethodFromName(fn.name) : (existingFnMeta?.method || extractMethodFromName(fn.name));

                // Build endpoint info from function data
                manifest[diff.module][fn.name] = {
                    fnName: fn.name,
                    apiKey: diff.module,
                    method,
                    url, // Use 'url' to match SidebarController and getComputedUrl expectations
                    client,
                    args: fnData.params || fnData.args || existingFnMeta?.args || [],
                    requiresAuth,
                    contentType,
                    description: fnData.description || existingFnMeta?.description,
                    inputType: fnData.inputType || existingFnMeta?.inputType,
                    outputType: fnData.outputType || existingFnMeta?.outputType
                };
            });
        });

        // 2. Persist existing modules and functions not in the diffs
        // Skip modules/functions explicitly marked for removal
        if (existingCollection?.manifest) {
            Object.entries(existingCollection.manifest).forEach(([modName, endpoints]: [string, Record<string, EndpointInfo>]) => {
                if (removedModules.has(modName)) return; // Exclude if explicitly removed

                if (!manifest[modName]) manifest[modName] = {};

                const removedModFuncs = removedFunctions.get(modName);

                Object.entries(endpoints).forEach(([fnName, meta]) => {
                    if (removedModFuncs?.has(fnName)) return; // Exclude if explicitly removed
                    
                    // Only copy if it wasn't already processed by the diff engine
                    if (!manifest[modName][fnName]) {
                         manifest[modName][fnName] = meta;
                    }
                });
            });
        }

        // 3. Remove empty modules
        Object.keys(manifest).forEach(modName => {
             if (Object.keys(manifest[modName]).length === 0) {
                 delete manifest[modName];
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

    const handleUpdate = async (diffs: DiffResult[], selectedModules: Set<string>, selectedFunctions: Map<string, Set<string>>, removedModules: Set<string>, removedFunctions: Map<string, Set<string>>) => {
        if (!selectedFile) return;
        setStep("updating");

        // Standalone mode: Build manifest locally and update context
        if (isStandaloneMode) {
            try {
                const manifest = buildManifestFromDiffs(diffs, selectedModules, selectedFunctions, removedModules, removedFunctions);

                // Build the new modules record from the selected diffs
                const newModulesRecord: Record<string, string> = existingCollection?.modules ? { ...existingCollection.modules } : {};
                
                // 1. Delete modules that the user explicitly marked for removal
                if (existingCollection?.modules) {
                    removedModules.forEach(modName => {
                        delete newModulesRecord[modName];
                    });
                }

                // 2. Process diffs for additions and updates
                diffs.forEach(diff => {
                    if (removedModules.has(diff.module)) {
                        delete newModulesRecord[diff.module];
                    } else if (selectedModules.has(diff.module) && diff.newContent) {
                        newModulesRecord[diff.module] = diff.newContent;
                    }
                });

                const derivedClients: Record<string, string> = {};
                if (proposedClients && baseUrl) {
                    Object.entries(proposedClients).forEach(([name, prefix]) => {
                        const cleanBase = baseUrl.replace(/\/$/, "");
                        const cleanPrefix = prefix.startsWith("/") ? prefix : "/" + prefix;
                        derivedClients[name] = cleanBase + cleanPrefix;
                    });
                }

                if (existingCollection && updateCollection) {
                    // Update Flow
                    await updateCollection(existingCollection.id, {
                        manifest, // Use the rebuilt manifest exactly as is; do NOT shallow merge
                        modules: newModulesRecord,
                        config: {
                            ...existingCollection.config,
                            baseURL: baseUrl || existingCollection.config.baseURL,
                            clientPrefixes: { ...existingCollection.config.clientPrefixes, ...proposedClients },
                            clients: { ...existingCollection.config.clients, ...derivedClients }
                        }
                    });
                } else if (addCollection) {
                    // New Multi-Collection Flow
                    const newCollection: StandaloneCollection = {
                        id: crypto.randomUUID(), // Or Date.now().toString() if crypto not avail
                        name: collectionName || 'Imported Collection',
                        manifest,
                        modules: newModulesRecord,
                        config: {
                            baseURL: baseUrl || '',
                            collectionName: collectionName || 'Imported Collection',
                            clientPrefixes: proposedClients,
                            clients: derivedClients
                        }
                    };
                    await addCollection(newCollection);
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

            const removedFunctionMapObj: Record<string, string[]> = {};
            removedFunctions.forEach((value, key) => {
                if (value.size > 0) {
                    removedFunctionMapObj[key] = Array.from(value);
                }
            });

            // Only delete modules explicitly marked for removal
            const deletedModules = Array.from(removedModules);

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
                deletedFunctions: removedFunctionMapObj,
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
            const bridgeUrl = api.getBridgeUrl();

            let changedModules: string[] = [];
            if (operations && Array.isArray(operations)) {
                changedModules = operations
                    .map((op: { filePath: string }) => {
                        const match = op.filePath.match(/definitions[\\/](.+?)\.ts$/);
                        return match ? match[1] : null;
                    })
                    .filter((m: string | null): m is string => Boolean(m && m !== 'index'));

                await api.batchOperations(operations, bridgeUrl);
            }

            if (res.data?.collectionName || collectionName) {
                saveToHistory(res.data?.collectionName || collectionName || 'Imported Collection');
            }

            setStep("success");

            // 3. Sync/Regenerate in background with known changed modules (non-blocking)
            api.syncProjectClients(changedModules.length > 0 ? changedModules : undefined).catch((e) => {
                console.warn("Incremental sync failed:", e);
            });
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
