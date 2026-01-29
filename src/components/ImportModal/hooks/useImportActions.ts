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
    forceOverwriteFunctions
}: UseImportActionsProps) => {
    const [step, setStep] = useState<ImportStep>("upload");
    const [proposedClients, setProposedClients] = useState<Record<string, string> | undefined>(undefined);
    const [baseUrl, setBaseUrl] = useState<string | undefined>(undefined);

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


    const handleUpdate = async (diffs: DiffResult[], selectedModules: Set<string>, selectedFunctions: Map<string, Set<string>>) => {
        if (!selectedFile) return;
        setStep("updating");

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

            if (finalBaseUrl || (finalClients && Object.keys(finalClients).length > 0)) {
                try {
                    await api.updateProjectConfig({
                        baseUrl: finalBaseUrl,
                        clients: finalClients
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
