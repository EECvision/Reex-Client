import { useState } from 'react';
import { DiffResult } from '../importTypes';

export const useDiffSelection = () => {
    // Selected modules (full module updates)
    const [selectedModules, setSelectedModules] = useState<Set<string>>(new Set());

    // Selected functions per module: Map<moduleName, Set<functionName>>
    const [selectedFunctions, setSelectedFunctions] = useState<Map<string, Set<string>>>(new Map());

    // Expanded modules in UI
    const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

    // Force Overwrite functions: Set<"moduleName.functionName">
    const [forceOverwriteFunctions, setForceOverwriteFunctions] = useState<Set<string>>(new Set());

    // Modules explicitly marked for removal from the collection
    const [removedModules, setRemovedModules] = useState<Set<string>>(new Set());

    // Individual functions explicitly marked for removal: Map<moduleName, Set<functionName>>
    const [removedFunctions, setRemovedFunctions] = useState<Map<string, Set<string>>>(new Map());

    const toggleForceOverwrite = (moduleName: string, functionName: string) => {
        const key = `${moduleName}.${functionName}`;
        setForceOverwriteFunctions((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

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

    const toggleRemoveModule = (moduleName: string, diff?: DiffResult) => {
        const isRemoved = removedModules.has(moduleName);

        setRemovedModules((prev) => {
            const next = new Set(prev);
            if (isRemoved) next.delete(moduleName);
            else next.add(moduleName);
            return next;
        });

        if (isRemoved) {
            // Un-marking: re-add to selectedModules and re-select all non-deleted functions
            setSelectedModules((prev) => {
                const next = new Set(prev);
                next.add(moduleName);
                return next;
            });
            if (diff?.functions) {
                setSelectedFunctions((prev) => {
                    const next = new Map(prev);
                    const funcs = new Set<string>();
                    diff.functions?.forEach((f) => {
                        if (f.status !== "deleted") funcs.add(f.name);
                    });
                    next.set(moduleName, funcs);
                    return next;
                });
            }
            // Clear any per-function removals for this module
            setRemovedFunctions((prev) => {
                const next = new Map(prev);
                next.delete(moduleName);
                return next;
            });
        } else {
            // Marking for removal: remove from selected
            setSelectedModules((prev) => {
                const next = new Set(prev);
                next.delete(moduleName);
                return next;
            });
            setSelectedFunctions((prev) => {
                const next = new Map(prev);
                next.delete(moduleName);
                return next;
            });
        }
    };

    const toggleRemoveFunction = (moduleName: string, functionName: string) => {
        setRemovedFunctions((prev) => {
            const next = new Map(prev);
            const currentSet = new Set(prev.get(moduleName) || []);

            if (currentSet.has(functionName)) {
                currentSet.delete(functionName);
            } else {
                currentSet.add(functionName);
            }

            if (currentSet.size === 0) {
                next.delete(moduleName);
            } else {
                next.set(moduleName, currentSet);
            }
            return next;
        });

        // Also remove from selectedFunctions if marking for removal
        const isCurrentlyRemoved = removedFunctions.get(moduleName)?.has(functionName);
        if (!isCurrentlyRemoved) {
            // Marking for removal: deselect the function
            setSelectedFunctions((prev) => {
                const next = new Map(prev);
                const currentSet = new Set(prev.get(moduleName) || []);
                currentSet.delete(functionName);
                if (currentSet.size === 0) {
                    next.delete(moduleName);
                    setSelectedModules((prevMod) => {
                        const nextMod = new Set(prevMod);
                        nextMod.delete(moduleName);
                        return nextMod;
                    });
                } else {
                    next.set(moduleName, currentSet);
                }
                return next;
            });
        } else {
            // Un-marking: re-select the function
            setSelectedFunctions((prev) => {
                const next = new Map(prev);
                const currentSet = new Set(prev.get(moduleName) || []);
                currentSet.add(functionName);
                next.set(moduleName, currentSet);
                return next;
            });
            setSelectedModules((prev) => {
                const next = new Set(prev);
                next.add(moduleName);
                return next;
            });
        }
    };

    const resetSelection = () => {
        setSelectedModules(new Set());
        setSelectedFunctions(new Map());
        setExpandedModules(new Set());
        setForceOverwriteFunctions(new Set());
        setRemovedModules(new Set());
        setRemovedFunctions(new Map());
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
        setRemovedModules(new Set());
        setRemovedFunctions(new Map());
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
        setExpandedModules,
        forceOverwriteFunctions,
        toggleForceOverwrite,
        removedModules,
        removedFunctions,
        setRemovedModules,
        setRemovedFunctions,
        toggleRemoveModule,
        toggleRemoveFunction
    };
};
