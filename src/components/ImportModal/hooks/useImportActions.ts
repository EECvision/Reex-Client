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
}

export const useImportActions = ({
    selectedFile,
    targetDir,
    onUpdateStarted,
    onSuccess,
    setDiffs,
    setSelectedModules,
    setSelectedFunctions,
    forceOverwriteFunctions
}: UseImportActionsProps) => {
    const [step, setStep] = useState<ImportStep>("upload");

    const startAnalysis = async () => {
        if (!selectedFile) return;
        setStep("analyzing");

        try {
            const res = await api.analyzeCollection(selectedFile, selectedFile.name, targetDir);
            const data = res;

            if (!res.success) throw new Error(res.error || "Analysis failed");

            setDiffs(data.data);

            // Auto-select logic
            const newModules = new Set<string>();
            const newFunctions = new Map<string, Set<string>>();

            data.data.forEach((d: DiffResult) => {
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

            data.data.forEach((d: DiffResult) => {
                if (d.status === "disabled") newModules.delete(d.module);
            });

            setSelectedModules(newModules);
            setSelectedFunctions(newFunctions);
            setStep("review");
        } catch (err) {
            console.error(err);
            alert(`Analysis failed: ${(err as Error).message}`);
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
                existingModules
            };

            const taskId = Date.now().toString();
            if (onUpdateStarted) {
                onUpdateStarted(taskId);
            }

            const res = await api.updateCollection(payload, targetDir, api.getBridgeUrl(), taskId);

            if (!res.success) {
                throw new Error(res.error || "Sync failed");
            }

            setStep("success");
            if (onSuccess) onSuccess("Collection updated successfully!");

        } catch (err) {
            console.error(err);
            alert(`Sync failed: ${(err as Error).message}`);
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
