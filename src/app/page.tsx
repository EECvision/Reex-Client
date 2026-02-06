"use client";

import { useState, useEffect } from "react";
// Static imports removed in favor of ProjectContext
import { useProject } from "@/providers/ProjectContext";
import ImportModal from "@/components/ImportModal/ImportModal";
import HistoryModal from "@/components/HistoryModal/HistoryModal";
import DeleteConfirmModal from "@/components/DeleteConfirmModal/DeleteConfirmModal";
import GenerateTemplateModal from "@/components/GenerateTemplateModal/GenerateTemplateModal";
import Navbar from "@/components/Navbar/Navbar";
import SidebarController from "@/components/Sidebar/SidebarController";
import WorkspaceView from "@/components/WorkspaceView/WorkspaceView";
import Toast from "@/components/Toast/Toast";
import BackgroundNotification from "@/components/BackgroundNotification/BackgroundNotification";
import styles from "./page.module.css";
import { EndpointInfo } from "@/types";

// Hooks
import { useToast } from "@/hooks/useToast";
import { useProjectSync } from "@/hooks/useProjectSync";
import { useCollectionManagement } from "@/hooks/useCollectionManagement";
import { useEndpointExecution } from "@/hooks/useEndpointExecution";

const App = () => {
  // Project Context
  const {
    manifest: apiManifest,
    loading: projectLoading,
    error: projectError,
    refreshProject,
    projectPath,
    config: projectConfig,
    isStandaloneMode,
    setManifest,
    setConfig,
    collections,
    addCollection,
    updateCollection,
    removeCollection,
    setCollections,
    recentCollections,
    addCollectionToHistory,
    removeCollectionFromHistory
  } = useProject();

  // ...

  // Custom Hooks
  const { toasts, showToast, dismissToast } = useToast();

  const {
    backgroundTasks,
    activeTaskMessage,
    importTaskComplete,
    registerTaskId,
    resetImportTask,
    dismissBackgroundTask,
    activeTaskId
  } = useProjectSync({
    showToast,
    refreshProject,
    isStandaloneMode
  });

  // Move this call AFTER activeCollection derivation


  // Auth Token State
  const [authToken, setAuthToken] = useState<string>("");
  // Selected Endpoint State (Hoisted to fix circular dependency)
  const [selectedEndpoint, setSelectedEndpoint] = useState<EndpointInfo | null>(null);

  useEffect(() => {
    const savedToken = localStorage.getItem("auth_token");
    if (savedToken) setAuthToken(savedToken);
  }, []);

  useEffect(() => {
    if (authToken) {
      localStorage.setItem("auth_token", authToken);
    } else {
      localStorage.removeItem("auth_token");
    }
  }, [authToken]);

  // Derived Active Config for Standalone Mode
  const getActiveCollection = () => {
    if (!isStandaloneMode) return null;

    // 1. Try to get from selected endpoint
    if (selectedEndpoint) {
      const parts = selectedEndpoint.apiKey.split('__');
      if (parts.length > 1 && parts[0].startsWith('col_')) {
        const id = parts[0].replace('col_', '');
        return collections.find(c => c.id === id);
      }
    }

    // 2. Fallback to first collection
    return collections.length > 0 ? collections[0] : null;
  };

  const activeCollection = getActiveCollection();
  const activeConfig = isStandaloneMode ? (activeCollection?.config || {}) : projectConfig;
  const activeCollectionName = isStandaloneMode ? (activeCollection?.name || "Collection") : projectConfig?.collectionName;

  const {
    showImportModal, setShowImportModal,
    showDeleteModal, setShowDeleteModal,
    showGenerateModal, setShowGenerateModal,
    showDeleteItemModal, setShowDeleteItemModal,
    importFile, setImportFile,
    fetchingUrl,
    deleting,
    deletingItem,
    deleteItemInfo, setDeleteItemInfo,
    handleFetchUrl,
    handleDeleteCollection,
    openDeleteModal,
    collectionToDelete,
    handleDeleteModule,
    handleDeleteFunction,
    confirmDeleteItem
  } = useCollectionManagement({
    projectPath,
    showToast,
    refreshProject,
    registerTaskId,
    isStandaloneMode,
    setManifest,
    removeCollection,
    activeCollectionId: activeCollection?.id,
    setCollections
  });

  const [showHistoryModal, setShowHistoryModal] = useState(false);


  const {
    params,
    result,
    error: executionError,
    loading: executionLoading,
    interfacePreview,
    savingInterface,
    copied,
    handleParamChange,
    handleSubmit,
    handleSaveInterface,
    isSubmitDisabled,
    handleCopy,
    getComputedUrl,
    // Raw payload mode
    rawPayload,
    inputMode,
    handleRawPayloadChange,
    handleInputModeChange,
    getGeneratedCurl,
  } = useEndpointExecution({
    projectConfig: activeConfig, // Use Active Config
    apiManifest,
    showToast,
    authToken,
    isStandaloneMode,
    selectedEndpoint
  });

  // Reset selected endpoint if manifest becomes empty
  useEffect(() => {
    if (apiManifest && Object.keys(apiManifest).length === 0) {
      setSelectedEndpoint(null);
    }
  }, [apiManifest]);

  const hasEndpoints = apiManifest && Object.keys(apiManifest).length > 0;

  if (projectLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingContent}>
          <div className={styles.loadingSpinner}></div>
          <span className={styles.loadingText}>Loading project workspace...</span>
        </div>
      </div>
    );
  }

  // Note: projectError is no longer blocking - standalone mode handles missing bridge

  return (
    <div className={styles.container}>
      <Toast toasts={toasts} onDismiss={dismissToast} />
      <BackgroundNotification
        tasks={backgroundTasks}
        onDismiss={dismissBackgroundTask}
      />

      {hasEndpoints && (
        <SidebarController
          apiManifest={apiManifest}
          selectedEndpoint={selectedEndpoint}
          onSelectEndpoint={setSelectedEndpoint}
          onDeleteModule={handleDeleteModule}
          onDeleteFunction={handleDeleteFunction}
          onDeleteCollection={openDeleteModal}
        />
      )}

      <div className={styles.mainWrapper}>
        <Navbar
          selectedEndpoint={selectedEndpoint}
          onImportClick={() => {
            resetImportTask();
            setShowImportModal(true);
          }}
          hasCollection={hasEndpoints}
          onDeleteClick={() => openDeleteModal()} // No arg = Delete All
          onFetchUrl={(url) => {
            resetImportTask();
            handleFetchUrl(url);
          }}
          isFetching={fetchingUrl}
          onGenerateClick={() => setShowGenerateModal(true)}
          baseURL={activeConfig?.baseURL}
          projectPath={projectPath}
          collectionName={activeCollectionName}
          authToken={authToken}
          onAuthTokenChange={setAuthToken}
          isStandaloneMode={isStandaloneMode}
          onBaseUrlChange={(newUrl) => {
            const oldBase = activeConfig?.baseURL || "";
            const updatedClients = { ...(activeConfig?.clients || {}) };

            Object.keys(updatedClients).forEach(key => {
              const clientUrl = updatedClients[key];
              if (oldBase && clientUrl.startsWith(oldBase)) {
                updatedClients[key] = newUrl + clientUrl.substring(oldBase.length);
              } else {
                updatedClients[key] = newUrl;
              }
            });

            if (isStandaloneMode && activeCollection) {
              updateCollection(activeCollection.id, {
                config: {
                  ...activeCollection.config,
                  baseURL: newUrl,
                  clients: updatedClients
                }
              });
            } else {
              setConfig({
                ...projectConfig,
                baseURL: newUrl,
                clients: updatedClients
              });
            }
          }}
        />

        {showImportModal && (
          <ImportModal
            isOpen={showImportModal}
            onClose={() => {
              setShowImportModal(false);
              setImportFile(null);
              resetImportTask();
            }}
            initialFile={importFile}
            onSuccess={(msg) => showToast("success", msg || "Collection imported successfully")}
            onError={(msg) => showToast("error", msg)}
            isEmptyWorkspace={!hasEndpoints}
            onUpdateStarted={registerTaskId}
            targetDir={projectPath}
            taskComplete={importTaskComplete}
            progressMessage={activeTaskMessage}
            resumeTaskId={activeTaskId}
            clientMappings={projectConfig?.clientPrefixes}
            isStandaloneMode={isStandaloneMode}
            onManifestUpdate={setManifest}
            onConfigUpdate={setConfig}
            addCollection={addCollection}
            addCollectionToHistory={addCollectionToHistory}
            hasHistory={recentCollections && recentCollections.length > 0}
            onOpenHistory={() => {
              setShowHistoryModal(true);
            }}
          />
        )}

        {showHistoryModal && (
          <HistoryModal
            isOpen={showHistoryModal}
            onClose={() => setShowHistoryModal(false)}
            items={recentCollections}
            onItemClick={(item) => {
              const blob = new Blob([JSON.stringify(item.content, null, 2)], { type: "application/json" });
              const file = new File([blob], item.name, { type: "application/json" });
              resetImportTask();
              setImportFile(file);
              setShowHistoryModal(false);
            }}
            onDelete={removeCollectionFromHistory}
          />
        )}

        <DeleteConfirmModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteCollection}
          deleting={deleting}
          title={isStandaloneMode && !collectionToDelete ? "Clear All Collections" : "Delete Collection"}
          message={isStandaloneMode && !collectionToDelete
            ? "Are you sure you want to delete ALL imported collections? This acts as a workspace reset."
            : "Are you sure you want to delete this collection? This action cannot be undone."
          }
        />

        <DeleteConfirmModal
          isOpen={showDeleteItemModal}
          onClose={() => {
            setShowDeleteItemModal(false);
            setDeleteItemInfo(null);
          }}
          onConfirm={confirmDeleteItem}
          deleting={deletingItem}
          title={
            deleteItemInfo?.type === "module"
              ? "Delete Module"
              : "Delete Function"
          }
          message={
            deleteItemInfo?.type === "module"
              ? `Are you sure you want to delete the entire "${deleteItemInfo?.moduleName}" module? This action cannot be undone.`
              : `Are you sure you want to delete "${deleteItemInfo?.functionName}" from "${deleteItemInfo?.moduleName}"? This action cannot be undone.`
          }
        />

        {
          showGenerateModal &&
          <GenerateTemplateModal
            isOpen={showGenerateModal}
            onClose={() => {
              setShowGenerateModal(false);
              resetImportTask(); // Clears any lingering task ID
            }}
            onSuccess={(msg) => showToast("success", msg)}
            onTaskStarted={registerTaskId}
            targetDir={projectPath}
          />
        }

        <WorkspaceView
          selectedEndpoint={selectedEndpoint}
          currentParams={params[`${selectedEndpoint?.apiKey}.${selectedEndpoint?.fnName}`] || {}}
          onParamChange={handleParamChange}
          onSubmit={handleSubmit}
          loading={executionLoading}
          isSubmitDisabled={isSubmitDisabled()}
          result={result}
          error={executionError}
          interfacePreview={interfacePreview}
          updatingInterface={savingInterface}
          onUpdateInterface={handleSaveInterface}
          onCopy={handleCopy}
          copied={copied}
          hasCollection={hasEndpoints}
          onImport={() => {
            resetImportTask();
            setShowImportModal(true);
          }}
          onGenerate={() => setShowGenerateModal(true)}
          computedUrl={getComputedUrl()}
          method={selectedEndpoint ? selectedEndpoint.fnName.split('_')[0].toUpperCase() : ""}
          rawPayload={rawPayload}
          inputMode={inputMode}
          onRawPayloadChange={handleRawPayloadChange}
          onInputModeChange={handleInputModeChange}
          generatedCurl={getGeneratedCurl()}
          isStandaloneMode={isStandaloneMode}
          recentCollections={recentCollections}
          onHistoryClick={(item) => {
            const blob = new Blob([JSON.stringify(item.content, null, 2)], { type: "application/json" });
            const file = new File([blob], item.name, { type: "application/json" });
            resetImportTask();
            setImportFile(file);
            setShowImportModal(true);
          }}
          onHistoryDelete={removeCollectionFromHistory}
        />
      </div>
    </div>
  );
};

export default App;
