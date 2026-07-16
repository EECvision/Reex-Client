"use client";

import { useState, useEffect } from "react";
// Static imports removed in favor of ProjectContext
import { useProject } from "@/providers/ProjectContext";
import ImportModal from "@/components/ImportModal/ImportModal";
import HistoryModal from "@/components/HistoryModal/HistoryModal";
import DeleteConfirmModal from "@/components/DeleteConfirmModal/DeleteConfirmModal";
import GenerateModuleModal from "@/components/GenerateModuleModal/GenerateModuleModal";
import Navbar from "@/components/Navbar/Navbar";
import SidebarController from "@/components/Sidebar/SidebarController";
import WorkspaceView from "@/components/WorkspaceView/WorkspaceView";
import BackgroundNotification from "@/components/BackgroundNotification/BackgroundNotification";
import { AuthModal } from "@/components/AuthModal/AuthModal";
import SandboxModal from "@/components/SandboxModal/SandboxModal";
import { Assistant } from "@/components/Assistant/Assistant";
import styles from "./page.module.css";
import { EndpointInfo } from "@/types";
import { openInCodeSandbox } from "@/utils/codesandbox/index";

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
    toggleStandaloneMode,
    manualStandaloneMode,
    setManifest,
    setConfig,
    collections,
    addCollection,
    updateCollection,
    removeCollection,
    setCollections,
    recentCollections,
    addCollectionToHistory,
    removeCollectionFromHistory,
    clearAllCollections,
  } = useProject();

  // Custom Hooks
  const { showToast } = useToast();

  const {
    backgroundTasks,
    activeTaskMessage,
    importTaskComplete,
    registerTaskId,
    resetImportTask,
    dismissBackgroundTask,
    activeTaskId,
  } = useProjectSync({
    showToast,
    refreshProject,
    isStandaloneMode,
  });

  // Move this call AFTER activeCollection derivation

  const [selectedEndpoint, setSelectedEndpoint] = useState<EndpointInfo | null>(
    null,
  );

  // Derived Active Config for Standalone Mode
  const getActiveCollection = () => {
    if (!isStandaloneMode) return null;

    // 1. Try to get from selected endpoint
    if (selectedEndpoint) {
      const parts = selectedEndpoint.apiKey.split("__");
      if (parts.length > 1 && parts[0].startsWith("col_")) {
        const id = parts[0].replace("col_", "");
        return collections.find((c) => c.id === id);
      }
    }

    // 2. Fallback to first collection
    return collections.length > 0 ? collections[0] : null;
  };

  const activeCollection = getActiveCollection();
  const activeConfig = isStandaloneMode
    ? activeCollection?.config || {}
    : projectConfig;
  const activeCollectionName = isStandaloneMode
    ? activeCollection?.name || "Collection"
    : projectConfig?.collectionName;
  const hasAuthConfigured = !!(
    activeConfig?.auth?.token ||
    (activeConfig?.auth?.customHeaders &&
      Object.keys(activeConfig.auth.customHeaders).length > 0)
  );

  const {
    showImportModal,
    setShowImportModal,
    showDeleteModal,
    setShowDeleteModal,
    showGenerateModal,
    setShowGenerateModal,
    showDeleteItemModal,
    setShowDeleteItemModal,
    importFile,
    setImportFile,
    fetchingUrl,
    collectionToUpdate,
    setCollectionToUpdate,
    openUpdateModal,
    deleting,
    deletingItem,
    deleteItemInfo,
    setDeleteItemInfo,
    handleFetchUrl,
    handleDeleteCollection,
    openDeleteModal,
    collectionToDelete,
    handleDeleteModule,
    handleDeleteFunction,
    confirmDeleteItem,
  } = useCollectionManagement({
    projectPath,
    showToast,
    refreshProject,
    registerTaskId,
    isStandaloneMode,
    setManifest,
    removeCollection,
    activeCollectionId: activeCollection?.id,
    setCollections,
    clearAllCollections,
  });

  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [autoAnalyzeImport, setAutoAnalyzeImport] = useState(false);
  const [importModalTab, setImportModalTab] = useState<"file" | "url">("file");
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [isSandboxOpen, setIsSandboxOpen] = useState(false);

  useEffect(() => {
    // Open sidebar by default on desktop
    if (typeof window !== "undefined" && window.innerWidth > 1140) {
      setIsSidebarOpen(true);
    }
  }, []);

  const handleSaveAuth = (
    collectionId: string,
    token: string,
    customHeaders: Record<string, string>,
  ) => {
    if (isStandaloneMode) {
      const targetCol = collections.find((c) => c.id === collectionId);
      if (!targetCol) return;

      updateCollection(collectionId, {
        config: {
          ...targetCol.config,
          auth: {
            token,
            customHeaders,
          },
        },
      });
    } else {
      const authData = { token, customHeaders };
      setConfig({
        ...projectConfig,
        auth: authData,
      });

      // Persist auth to localStorage for dev mode
      if (typeof window !== "undefined") {
        if (token || Object.keys(customHeaders).length > 0) {
          localStorage.setItem("reex_project_auth", JSON.stringify(authData));
        } else {
          localStorage.removeItem("reex_project_auth");
        }
      }
    }

    // Close modal on save
    setShowAuthModal(false);
  };

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
    authToken: activeConfig?.auth?.token || "",
    customHeaders: activeConfig?.auth?.customHeaders || {},
    isStandaloneMode,

    selectedEndpoint,
  });

  // Reset selected endpoint if manifest becomes empty, else update it with new args
  useEffect(() => {
    if (apiManifest && Object.keys(apiManifest).length === 0) {
      setSelectedEndpoint(null);
    } else if (selectedEndpoint && apiManifest) {
      // Keep selectedEndpoint in sync with manifest updates
      const { apiKey, fnName } = selectedEndpoint;
      const endpointDef = apiManifest?.[apiKey]?.[fnName];
      if (endpointDef) {
        // Re-create the endpoint info with fresh data from the updated manifest
        const methodPrefix = fnName.split("_")[0].toUpperCase();
        setSelectedEndpoint({
          apiKey,
          fnName,
          args: endpointDef.args || [],
          url: endpointDef.url,
          method: endpointDef.method || methodPrefix,
          requiresAuth: endpointDef.requiresAuth,
          contentType: endpointDef.contentType,
          description: endpointDef.description,
        });
      } else {
        // Endpoint was removed from manifest
        setSelectedEndpoint(null);
      }
    }
  }, [apiManifest]);

  // Reset workspace to empty state when switching between project/standalone modes
  useEffect(() => {
    setSelectedEndpoint(null);
  }, [isStandaloneMode]);

  const hasEndpoints = apiManifest && Object.keys(apiManifest).length > 0;

  if (projectLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingContent}>
          <div className={styles.loadingSpinner}></div>
          <span className={styles.loadingText}>
            Loading project workspace...
          </span>
        </div>
      </div>
    );
  }

  // Note: projectError is no longer blocking - standalone mode handles missing bridge

  return (
    <div
      className={`${styles.container} ${isSidebarOpen ? styles.sidebarOpen : ""}`}
    >
      <BackgroundNotification
        tasks={backgroundTasks}
        onDismiss={dismissBackgroundTask}
      />

      {hasEndpoints && (
        <div
          className={`${styles.sidebarOverlay} ${isSidebarOpen ? styles.showOverlay : ""}`}
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {hasEndpoints && (
        <SidebarController
          apiManifest={apiManifest}
          selectedEndpoint={selectedEndpoint}
          onSelectEndpoint={(ep) => {
            setSelectedEndpoint(ep);
            if (window.innerWidth <= 980) setIsSidebarOpen(false);
          }}
          onDeleteModule={handleDeleteModule}
          onDeleteFunction={handleDeleteFunction}
          onDeleteCollection={openDeleteModal}
          onRenameCollection={(id, name) => updateCollection(id, { name })}
          onUpdateCollection={openUpdateModal}
          onOpenSandbox={(id) => {
            const col = collections.find((c) => c.id === id);
            if (col && activeConfig) {
              openInCodeSandbox(
                col.name,
                activeConfig.baseURL,
                col.modules || {},
                { ...activeConfig, manifest: col.manifest },
              );
            }
          }}
          isOpen={isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        />
      )}

      <div className={styles.mainWrapper}>
        <Navbar
          selectedEndpoint={selectedEndpoint}
          onImportClick={() => {
            resetImportTask();
            setAutoAnalyzeImport(false);
            setImportModalTab("file");
            setShowImportModal(true);
          }}
          hasCollection={hasEndpoints}
          onDeleteClick={() => openDeleteModal()} // No arg = Delete All
          onFetchUrl={(url) => {
            resetImportTask();
            setAutoAnalyzeImport(true);
            handleFetchUrl(url);
          }}
          onOpenFetchModal={() => {
            resetImportTask();
            setAutoAnalyzeImport(false);
            setImportModalTab("url");
            setShowImportModal(true);
          }}
          isFetching={fetchingUrl}
          onGenerateClick={() => setShowGenerateModal(true)}
          baseURL={activeConfig?.baseURL}
          projectPath={projectPath}
          collectionName={activeCollectionName}
          onAuthClick={() => setShowAuthModal(true)}
          isStandaloneMode={isStandaloneMode}
          manualStandaloneMode={manualStandaloneMode}
          onToggleStandaloneMode={toggleStandaloneMode}
          hasAuthConfigured={hasAuthConfigured}
          onBaseUrlChange={(newUrl) => {
            const oldBase = activeConfig?.baseURL || "";
            const updatedClients = { ...(activeConfig?.clients || {}) };

            Object.keys(updatedClients).forEach((key) => {
              const clientUrl = updatedClients[key];
              if (oldBase && clientUrl.startsWith(oldBase)) {
                updatedClients[key] =
                  newUrl + clientUrl.substring(oldBase.length);
              } else {
                updatedClients[key] = newUrl;
              }
            });

            if (isStandaloneMode && activeCollection) {
              updateCollection(activeCollection.id, {
                config: {
                  ...activeCollection.config,
                  baseURL: newUrl,
                  clients: updatedClients,
                },
              });
            } else {
              setConfig({
                ...projectConfig,
                baseURL: newUrl,
                clients: updatedClients,
              });
            }
          }}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          isSidebarOpen={isSidebarOpen}
          onAssistantClick={() => setIsAssistantOpen(true)}
          isAssistantOpen={isAssistantOpen}
          onSandboxClick={() => setIsSandboxOpen(true)}
        />

        {showImportModal && (
          <ImportModal
            isOpen={showImportModal}
            onClose={() => {
              setShowImportModal(false);
              setImportFile(null);
              setAutoAnalyzeImport(false);
              setCollectionToUpdate(null);
              resetImportTask();
            }}
            initialFile={importFile}
            initialTab={importModalTab}
            onSuccess={(msg) =>
              showToast("success", msg || "Collection imported successfully")
            }
            onError={(msg) => showToast("error", msg)}
            isEmptyWorkspace={!hasEndpoints}
            onUpdateStarted={registerTaskId}
            targetDir={projectPath}
            targetCollectionId={collectionToUpdate || undefined}
            taskComplete={importTaskComplete}
            progressMessage={activeTaskMessage}
            resumeTaskId={activeTaskId}
            clientMappings={projectConfig?.clientPrefixes}
            isStandaloneMode={isStandaloneMode}
            onManifestUpdate={setManifest}
            onConfigUpdate={setConfig}
            addCollection={addCollection}
            updateCollection={updateCollection}
            collections={collections}
            addCollectionToHistory={addCollectionToHistory}
            hasHistory={recentCollections && recentCollections.length > 0}
            autoAnalyze={autoAnalyzeImport}
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
              const blob = new Blob([JSON.stringify(item.content, null, 2)], {
                type: "application/json",
              });
              const file = new File([blob], item.name, {
                type: "application/json",
              });
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
          title={
            isStandaloneMode && !collectionToDelete
              ? "Clear All Collections"
              : "Delete Collection"
          }
          message={
            isStandaloneMode && !collectionToDelete
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

        {showGenerateModal && (
          <GenerateModuleModal
            isOpen={showGenerateModal}
            onClose={() => {
              setShowGenerateModal(false);
              resetImportTask(); // Clears any lingering task ID
            }}
            onSuccess={(msg) => showToast("success", msg)}
            onTaskStarted={registerTaskId}
            targetDir={projectPath}
          />
        )}

        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          collections={
            isStandaloneMode
              ? collections
              : [
                  {
                    id: "project",
                    name: activeCollectionName || "Project",
                    manifest: apiManifest,
                    modules: {} as Record<string, string>,
                    config: projectConfig,
                  },
                ]
          }
          activeCollectionId={
            isStandaloneMode ? activeCollection?.id : "project"
          }
          onSave={handleSaveAuth}
        />

        <WorkspaceView
          selectedEndpoint={selectedEndpoint}
          currentParams={
            params[`${selectedEndpoint?.apiKey}.${selectedEndpoint?.fnName}`] ||
            {}
          }
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
          method={
            selectedEndpoint
              ? selectedEndpoint.fnName.split("_")[0].toUpperCase()
              : ""
          }
          rawPayload={rawPayload}
          inputMode={inputMode}
          onRawPayloadChange={handleRawPayloadChange}
          onInputModeChange={handleInputModeChange}
          generatedCurl={getGeneratedCurl()}
          isStandaloneMode={isStandaloneMode}
          recentCollections={recentCollections}
          onHistoryClick={(item) => {
            const blob = new Blob([JSON.stringify(item.content, null, 2)], {
              type: "application/json",
            });
            const file = new File([blob], item.name, {
              type: "application/json",
            });
            resetImportTask();
            setImportFile(file);
            setShowImportModal(true);
          }}
          onHistoryDelete={removeCollectionFromHistory}
        />
      </div>

      <Assistant
        isOpen={isAssistantOpen}
        onClose={() => setIsAssistantOpen(false)}
      />
      <SandboxModal
        isOpen={isSandboxOpen}
        onClose={() => setIsSandboxOpen(false)}
      />
    </div>
  );
};

export default App;
