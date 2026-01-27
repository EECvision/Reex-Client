import { useState } from 'react';
import { DiffResult } from '../importTypes';

export const useDiffSelection = () => {
    // Selected modules (full module updates)
    const [selectedModules, setSelectedModules] = useState<Set<string>>(new Set());

    // Selected functions per module: Map<moduleName, Set<functionName>>
    const [selectedFunctions, setSelectedFunctions] = useState<Map<string, Set<string>>>(new Map());

    // Expanded modules in UI
    const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

    const toggleModule = (moduleName: string, diff?: DiffResult) => {
        const isSelected = selectedModules.has(moduleName);

        // Prevent selecting disabled modules
        if (diff?.status === "disabled") return;

        setSelectedModules((prev) => {
            const next = new Set(prev);
            if (isSelected) next.delete(moduleName);
            else next.add(moduleName);
            return next;
        });

        // Also toggle all functions if they exist
        if (diff?.functions) {
            setSelectedFunctions((prev) => {
                const next = new Map(prev);
                if (isSelected) {
                    // Deselecting module -> deselect all functions
                    next.delete(moduleName);
                } else {
                    // Selecting module -> select all non-deleted functions (including unchanged/disabled)
                    const funcs = new Set<string>();
                    diff.functions?.forEach((f) => {
                        if (f.status !== "deleted") funcs.add(f.name);
                    });
                    next.set(moduleName, funcs);
                }
                return next;
            });
        }
    };

    const toggleFunction = (moduleName: string, functionName: string) => {
        setSelectedFunctions((prev) => {
            const next = new Map(prev);
            // Create a NEW Set from the existing one (or empty)
            const currentSet = new Set(prev.get(moduleName) || []);

            if (currentSet.has(functionName)) {
                currentSet.delete(functionName);
            } else {
                currentSet.add(functionName);
            }

            if (currentSet.size === 0) {
                next.delete(moduleName);
                // Deselect module if no functions selected to prevent full update
                setSelectedModules((prevMod) => {
                    const nextMod = new Set(prevMod);
                    nextMod.delete(moduleName);
                    return nextMod;
                });
            } else {
                next.set(moduleName, currentSet);
                // Ensure module is selected if we select a function
                setSelectedModules((prevMod) => {
                    const nextMod = new Set(prevMod);
                    nextMod.add(moduleName);
                    return nextMod;
                });
            }
            return next;
        });
    };

    const toggleExpand = (moduleName: string) => {
        setExpandedModules((prev) => {
            const next = new Set(prev);
            if (next.has(moduleName)) next.delete(moduleName);
            else next.add(moduleName);
            return next;
        });
    };

    const resetSelection = () => {
        setSelectedModules(new Set());
        setSelectedFunctions(new Map());
        setExpandedModules(new Set());
    };

    const selectAll = (diffs: DiffResult[]) => {
        const newSet = new Set<string>();
        const newFuncs = new Map<string, Set<string>>();
        diffs.forEach((d) => {
            if (d.status !== "disabled") {
                newSet.add(d.module);
                if (d.functions) {
                    const fSet = new Set<string>();
                    // Include all non-deleted functions (including disabled)
                    d.functions.forEach(
                        (f) =>
                            f.status !== "deleted" && fSet.add(f.name)
                    );
                    newFuncs.set(d.module, fSet);
                }
            }
        });
        setSelectedModules(newSet);
        setSelectedFunctions(newFuncs);
    };

    const deselectAll = () => {
        setSelectedModules(new Set());
        setSelectedFunctions(new Map());
    };

    return {
        selectedModules,
        selectedFunctions,
        expandedModules,
        toggleModule,
        toggleFunction,
        toggleExpand,
        resetSelection,
        selectAll,
        deselectAll,
        setSelectedModules,
        setSelectedFunctions,
        setExpandedModules
    };
};
