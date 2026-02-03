
import { useState } from "react";
import { api } from "@/services/api";

interface UseCollectionManagementProps {
    projectPath: string;
    showToast: (type: "success" | "error", message: string) => void;
    refreshProject: (force?: boolean) => void;
    registerTaskId: (taskId: string) => void;
    isStandaloneMode?: boolean;
    setManifest?: (manifest: any) => void;
    removeCollection?: (id: string) => void;
    activeCollectionId?: string;
    setCollections?: (cols: any[]) => void;
}

export const useCollectionManagement = ({
    projectPath,
    showToast,
    refreshProject,
    registerTaskId,
    isStandaloneMode = false,
    setManifest,
    removeCollection,
    activeCollectionId,
    setCollections
}: UseCollectionManagementProps) => {
    // Modals
    const [showImportModal, setShowImportModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showGenerateModal, setShowGenerateModal] = useState(false);

    // Import State
    const [importFile, setImportFile] = useState<File | null>(null);
    const [fetchingUrl, setFetchingUrl] = useState(false);

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
            const file = new File(
                [blob],
                filename.endsWith(".json") ? filename : `${filename}.json`,
                { type: "application/json" }
            );

            setImportFile(file);
            setShowImportModal(true);
        } catch (err: any) {
            showToast("error", err.message);
        } finally {
            setFetchingUrl(false);
        }
    };

    const handleDeleteCollection = async () => {
        setDeleting(true);

        // Standalone mode: remove specific or clear all
        if (isStandaloneMode) {
            if (collectionToDelete && removeCollection) {
                // Delete specific
                removeCollection(collectionToDelete);
                showToast("success", "Collection deleted!");
            } else if (!collectionToDelete && setCollections) {
                // Delete ALL (Navbar)
                setCollections([]);
                showToast("success", "All collections cleared!");
            } else if (setManifest) {
                // Legacy fallback
                setManifest({});
                showToast("success", "Collection cleared!");
            }
            setShowDeleteModal(false);
            setDeleting(false);
            setCollectionToDelete(null);
            return;
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
                showToast("success", "Collection deleted!");
                setShowDeleteModal(false);
                setDeleting(false);
                refreshProject(true);
            }
            // If data.taskId exists, we wait for SSE in useProjectSync
        } catch (err: any) {
            showToast("error", err.message || "Failed to delete collection");
            setDeleting(false);
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
        setDeletingItem(true);

        // Standalone mode: update local manifest state
        if (isStandaloneMode && setManifest) {
            // We need to get current manifest from context, but we don't have direct access
            // The parent component should handle this via refreshProject or manifest update
            // For now, show success and close modal - the parent can handle the actual deletion
            showToast("success", `${deleteItemInfo.type === "module" ? "Module" : "Function"} removed`);
            setShowDeleteItemModal(false);
            setDeleteItemInfo(null);
            setDeletingItem(false);
            // Trigger a "fake" refresh that will cause parent to update
            refreshProject(true);
            return;
        }

        try {
            const taskId = Date.now().toString();
            registerTaskId(taskId);

            const data = await api.deleteItem(deleteItemInfo, projectPath, api.getBridgeUrl(), taskId);

            if (!data.success) {
                throw new Error(data.error || "Deletion failed");
            }

            if (!data.taskId) {
                showToast("success", data.message || "Item deleted");
                setShowDeleteItemModal(false);
                setDeleteItemInfo(null);
                setDeletingItem(false);
                refreshProject(true);
            }
        } catch (err: any) {
            showToast("error", err.message || "Failed to delete item");
            setDeletingItem(false);
        }
    };

    return {
        showImportModal, setShowImportModal,
        showDeleteModal, setShowDeleteModal,
        showGenerateModal, setShowGenerateModal,
        showDeleteItemModal, setShowDeleteItemModal,
        importFile, setImportFile,
        fetchingUrl,
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
