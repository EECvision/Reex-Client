
import { useState, useEffect, useRef, useCallback } from "react";
import { api } from "@/services/api";
import { BackgroundTask } from "@/components/BackgroundNotification/BackgroundNotification";

interface UseProjectSyncProps {
    showToast: (type: "success" | "error", message: string) => void;
    refreshProject: (force?: boolean) => void;
    onImportTaskComplete?: () => void;
    onSyncComplete?: () => void;
    isStandaloneMode?: boolean;
}

export const useProjectSync = ({ showToast, refreshProject, onImportTaskComplete, onSyncComplete, isStandaloneMode = false }: UseProjectSyncProps) => {
    const [backgroundTasks, setBackgroundTasks] = useState<BackgroundTask[]>([]);
    const [activeTaskMessage, setActiveTaskMessage] = useState<string>("");
    const [importTaskComplete, setImportTaskComplete] = useState(false);

    // We need to track the active task ID to know when a specific initiated action (like delete or import) is done
    const activeTaskIdRef = useRef<string | null>(null);

    const registerTaskId = useCallback((taskId: string) => {
        activeTaskIdRef.current = taskId;
        // Optionally save to local storage for persistence across reloads
        if (typeof window !== "undefined") {
            localStorage.setItem("active_import_task", taskId);
        }
    }, []);

    const clearActiveTask = useCallback(() => {
        activeTaskIdRef.current = null;
        if (typeof window !== "undefined") {
            localStorage.removeItem("active_import_task");
        }
    }, []);

    const resetImportTask = useCallback(() => {
        setImportTaskComplete(false);
        clearActiveTask();
    }, [clearActiveTask]);

    const dismissBackgroundTask = useCallback((id: number) => {
        setBackgroundTasks((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const formatMessage = (msg: string) => {
        return msg.length > 60 ? msg.substring(0, 60) + "..." : msg;
    };

    // Restore task state on mount
    useEffect(() => {
        if (typeof window !== "undefined") {
            const savedTaskId = localStorage.getItem("active_import_task");
            if (savedTaskId) {
                console.log("Restoring active import task:", savedTaskId);
                activeTaskIdRef.current = savedTaskId;
            }
        }
    }, []);

    // SSE Listener - Skip in standalone mode
    useEffect(() => {
        // Don't connect to SSE in standalone mode
        if (isStandaloneMode) {
            console.log("[SSE] Skipping connection - standalone mode");
            return;
        }

        const bridgeUrl = api.getBridgeUrl();
        console.log("[SSE] Connecting to:", bridgeUrl);
        const eventSource = api.getEventSource(bridgeUrl);

        eventSource.onopen = () => {
            console.log("[SSE] Connected to Bridge");
            showToast("success", "Connected to local bridge");
        };

        eventSource.onerror = async (err) => {
            // Prevent false positive reloads (e.g. from HMR network blips) by double checking if the bridge is actually dead
            try {
                const res = await fetch(`${bridgeUrl}/api/health`);
                if (!res.ok) throw new Error("Bridge down");
            } catch {
                console.warn("[SSE] Connection lost and bridge is unreachable. Reloading to switch to preview mode...");
                if (typeof window !== "undefined") {
                    window.location.reload();
                }
            }
        };

        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                if (data.type === "start") {
                    const serverId = data.id ? parseInt(data.id) : Date.now();
                    setBackgroundTasks((prev) => {
                        if (prev.find(t => t.id === serverId)) return prev;
                        return [...prev, { id: serverId, title: data.message, message: "Running..." }];
                    });

                } else if (data.type === "progress") {
                    const serverId = data.id ? parseInt(data.id) : 0;
                    const cleanMsg = formatMessage(data.message);

                    if (activeTaskIdRef.current && String(data.id) === String(activeTaskIdRef.current)) {
                        setActiveTaskMessage(data.message);
                    }

                    setBackgroundTasks(prev => {
                        if (serverId && prev.find(t => t.id === serverId)) {
                            return prev.map(t => t.id === serverId ? { ...t, message: cleanMsg } : t);
                        }
                        if (prev.length > 0) {
                            const newTasks = [...prev];
                            newTasks[newTasks.length - 1].message = cleanMsg;
                            return newTasks;
                        }
                        return prev;
                    });
                } else if (data.type === "complete") {
                    const serverId = data.id ? parseInt(data.id) : 0;
                    setBackgroundTasks(prev => {
                        if (serverId) return prev.filter(t => t.id !== serverId);
                        return prev.slice(0, prev.length - 1);
                    });

                    // Check if this completion matches our active task
                    if (activeTaskIdRef.current && String(data.id) === String(activeTaskIdRef.current)) {

                        // SPECIAL CASE: For deletions, we want to auto-clear the task so it doesn't block future Import modals
                        // or stuck in "Resuming..." state since there's no "Success Modal" for deletions that requires user dismissal.
                        const isDeletion = data.message?.toLowerCase().includes("deleted");
                        if (isDeletion) {
                            clearActiveTask();
                        } else {
                            // Only mark as complete for non-deletions (like Imports) that wait for user dismissal
                            setImportTaskComplete(true);
                        }

                        if (onImportTaskComplete) onImportTaskComplete();

                        // Suppress specific completion messages
                        if (
                            data.message &&
                            !data.message.toLowerCase().includes("collection updated") &&
                            !data.message.toLowerCase().includes("successfully deleted") &&
                            !data.message.toLowerCase().includes("type generation complete")
                        ) {
                            showToast("success", data.message);
                        }

                        refreshProject(true);
                    } else {
                        // Only show toast if it's NOT a sync completion message we want to hide
                        if (!data.message?.toLowerCase().includes("sync completed")) {
                            showToast("success", data.message);
                        }
                    }

                    if (onSyncComplete) onSyncComplete();

                } else if (data.type === "error") {
                    showToast("error", data.message);

                    // If error belongs to active task, clear it
                    if (activeTaskIdRef.current && String(data.id) === String(activeTaskIdRef.current)) {
                        clearActiveTask();
                    }
                } else if (data.type === "project:updated") {
                    setBackgroundTasks(prev => prev.filter(t => t.title !== "Syncing changes..."));
                    showToast("success", "Project synced");
                    refreshProject(true);
                } else if (data.type === "project:sync-start") {
                    const serverId = data.id ? parseInt(data.id) : Date.now();
                    setBackgroundTasks((prev) => {
                        if (prev.find(t => t.id === serverId)) return prev;
                        return [...prev, { id: serverId, title: "Syncing changes...", message: "Processing..." }];
                    });
                }
            } catch (e) {
                console.error("Error parsing event:", e);
            }
        };

        return () => {
            eventSource.close();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isStandaloneMode]); // Re-run only if standalone mode changes

    return {
        backgroundTasks,
        activeTaskMessage,
        importTaskComplete,
        registerTaskId,
        clearActiveTask,
        resetImportTask,
        dismissBackgroundTask,
        activeTaskId: activeTaskIdRef.current
    };
};
