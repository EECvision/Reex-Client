
import { useState } from "react";
import { api } from "@/services/api";
import { EndpointInfo } from "@/types";
import { StandaloneCollection } from "@/providers/ProjectContext";

interface UseCollectionManagementProps {
    projectPath: string;
    showToast: (type: "success" | "error", message: string) => void;
    refreshProject: (force?: boolean) => void;
    registerTaskId: (taskId: string) => void;
    isStandaloneMode?: boolean;
    setManifest?: React.Dispatch<
        React.SetStateAction<Record<string, Record<string, EndpointInfo>> | null>
    >;
    removeCollection?: (id: string) => Promise<void>;
    activeCollectionId?: string;
    setCollections?: (cols: StandaloneCollection[]) => void;
    clearAllCollections?: () => Promise<void>;
}

export const useCollectionManagement = ({
    projectPath,
    showToast,
    refreshProject,
    registerTaskId,
    isStandaloneMode = false,
    setManifest,
    removeCollection,

    setCollections,
    clearAllCollections
}: UseCollectionManagementProps) => {
    // Modals
    const [showImportModal, setShowImportModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showGenerateModal, setShowGenerateModal] = useState(false);

    // Import State
    const [importFile, setImportFile] = useState<File | null>(null);
    const [fetchingUrl, setFetchingUrl] = useState(false);

    // Update State
    const [collectionToUpdate, setCollectionToUpdate] = useState<string | null>(null);

    const openUpdateModal = (collectionId: string) => {
        setCollectionToUpdate(collectionId);
        setShowImportModal(true);
    };

    // Delete Collection State
    const [deleting, setDeleting] = useState(false);
    const [collectionToDelete, setCollectionToDelete] = useState<string | null>(null);

    const openDeleteModal = (collectionId?: string) => {
        setCollectionToDelete(collectionId || null);
        setShowDeleteModal(true);
    };

    // Delete Item State
    const [showDeleteItemModal, setShowDeleteItemModal] = useState(false);
    const [deleteItemInfo, setDeleteItemInfo] = useState<{
        type: "module" | "function";
        moduleName: string;
        functionName?: string;
    } | null>(null);
    const [deletingItem, setDeletingItem] = useState(false);

    const handleFetchUrl = async (url: string) => {
        setFetchingUrl(true);
        setImportFile(null);
        try {
            const data = await api.fetchUrl(url);
            if (data.error) throw new Error(data.error);

            const blob = new Blob([JSON.stringify(data, null, 2)], {
                type: "application/json",
            });
            const filename = url.split("/").pop() || "imported-collection.json";
            const lowerFilename = filename.toLowerCase();
            let finalName = filename;

            if (!lowerFilename.endsWith(".json") && !lowerFilename.endsWith(".postman") && !lowerFilename.endsWith(".openapi") && !lowerFilename.endsWith(".yaml") && !lowerFilename.endsWith(".yml")) {
                finalName = `${filename}.json`;
            }

            const file = new File(
                [blob],
                finalName,
                { type: "application/json" }
            );

            setImportFile(file);
            setShowImportModal(true);
        } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
            showToast("error", errorMessage);
        } finally {
            setFetchingUrl(false);
        }
    };

    const handleDeleteCollection = async (): Promise<boolean> => {
        setDeleting(true);

        // Standalone mode: remove specific or clear all
        if (isStandaloneMode) {
            try {
                if (collectionToDelete && removeCollection) {
                    await removeCollection(collectionToDelete);
                } else if (!collectionToDelete) {
                    if (clearAllCollections) await clearAllCollections();
                    else if (setCollections) setCollections([]);
                    showToast('success', 'All collections cleared!');
                } else if (setManifest) {
                    setManifest({});
                }
                setShowDeleteModal(false);
                setCollectionToDelete(null);
                return true;
            } catch (error) {
                showToast('error', error instanceof Error ? error.message : 'Could not delete the collection.');
                return false;
            } finally {
                setDeleting(false);
            }
        }

        try {
            const taskId = Date.now().toString();
            registerTaskId(taskId);

            const data = await api.deleteCollection(projectPath, api.getBridgeUrl(), taskId);

            if (!data.success) {
                // If it fails immediately, we won't get an SSE
                throw new Error(data.error || "Deletion failed");
            }

            if (!data.taskId) {
                // Sync fallback
                setShowDeleteModal(false);
                setDeleting(false);
                refreshProject(true);
            }
            // If data.taskId exists, we wait for SSE in useProjectSync
            return true;
        } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
            showToast("error", errorMessage || "Failed to delete collection");
            setDeleting(false);
            return false;
        }
    };

    const handleDeleteModule = (moduleName: string) => {
        if (isStandaloneMode) return;
        setDeleteItemInfo({ type: "module", moduleName });
        setShowDeleteItemModal(true);
    };

    const handleDeleteFunction = (moduleName: string, functionName: string) => {
        if (isStandaloneMode) return;
        setDeleteItemInfo({ type: "function", moduleName, functionName });
        setShowDeleteItemModal(true);
    };

    const confirmDeleteItem = async () => {
        if (!deleteItemInfo) return;
        const item = { ...deleteItemInfo };

        // 1. Optimistic UI update: immediately remove from manifest
        if (setManifest) {
            setManifest((prev) => {
                if (!prev) return prev;
                const next = { ...prev };
                if (item.type === "module") {
                    delete next[item.moduleName];
                } else if (item.type === "function" && item.functionName && next[item.moduleName]) {
                    const modCopy = { ...next[item.moduleName] };
                    delete modCopy[item.functionName];
                    next[item.moduleName] = modCopy;
                }
                return next;
            });
        }

        // Close modal, reset deleting state, and show success toast immediately
        setShowDeleteItemModal(false);
        setDeleteItemInfo(null);
        setDeletingItem(false);
        showToast("success", `${item.type === "module" ? "Module" : "Function"} deleted`);

        // Standalone mode: trigger silent refresh
        if (isStandaloneMode) {
            refreshProject(true);
            return;
        }

        // Dev mode: background deletion
        try {
            const taskId = Date.now().toString();
            registerTaskId(taskId);

            const data = await api.deleteItem(item, projectPath, api.getBridgeUrl(), taskId);

            if (!data.success) {
                throw new Error(data.error || "Deletion failed");
            }

            if (!data.taskId) {
                refreshProject(true);
            }
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            showToast("error", errorMessage || "Failed to delete item");
            refreshProject(true);
        }
    };

    return {
        showImportModal, setShowImportModal,
        showDeleteModal, setShowDeleteModal,
        showGenerateModal, setShowGenerateModal,
        showDeleteItemModal, setShowDeleteItemModal,
        importFile, setImportFile,
        fetchingUrl,
        collectionToUpdate, setCollectionToUpdate, openUpdateModal,
        deleting, setDeleting,
        deletingItem, setDeletingItem,
        deleteItemInfo, setDeleteItemInfo,
        handleFetchUrl,
        handleDeleteCollection,
        openDeleteModal,
        collectionToDelete,
        handleDeleteModule,
        handleDeleteFunction,
        confirmDeleteItem
    };
};
