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
  // Prevent default browser right-click context menu globally
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    document.addEventListener("contextmenu", handleContextMenu);
    return () => document.removeEventListener("contextmenu", handleContextMenu);
  }, []);
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

  type Tab = {
    endpoint: EndpointInfo;
    isPinned: boolean;
  };
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabIndex, setActiveTabIndex] = useState<number>(-1);
  const [isTabsLoaded, setIsTabsLoaded] = useState(false);

  // Load tabs from localStorage based on mode
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const modeSuffix = isStandaloneMode ? "_standalone" : "";
        const savedTabs = localStorage.getItem(`reex_project_tabs${modeSuffix}`);
        const savedIndex = localStorage.getItem(`reex_project_active_tab${modeSuffix}`);
        if (savedTabs) {
            const parsed = JSON.parse(savedTabs);
            setTabs(parsed);
        } else {
            setTabs([]); // Ensure empty if not found on switch
        }
        if (savedIndex) {
            setActiveTabIndex(Number(savedIndex));
        } else {
            setActiveTabIndex(-1);
        }
      } catch (e) {
        console.error("Failed to load tabs", e);
      }
      setIsTabsLoaded(true);
    }
  }, [isStandaloneMode]); // Reload when mode switches

  // Save tabs to localStorage
  useEffect(() => {
    if (typeof window !== "undefined" && isTabsLoaded) {
      const modeSuffix = isStandaloneMode ? "_standalone" : "";
      localStorage.setItem(`reex_project_tabs${modeSuffix}`, JSON.stringify(tabs));
      localStorage.setItem(`reex_project_active_tab${modeSuffix}`, String(activeTabIndex));
    }
  }, [tabs, activeTabIndex, isTabsLoaded, isStandaloneMode]);

  const selectedEndpoint = activeTabIndex >= 0 && activeTabIndex < tabs.length 
    ? tabs[activeTabIndex].endpoint 
    : null;

  const handleSelectEndpoint = (endpoint: EndpointInfo) => {
    setTabs((currentTabs) => {
      const existingIndex = currentTabs.findIndex(t => t.endpoint.apiKey === endpoint.apiKey && t.endpoint.fnName === endpoint.fnName);
      if (existingIndex >= 0) {
        setActiveTabIndex(existingIndex);
        return currentTabs;
      }
      
      const unpinnedIndex = currentTabs.findIndex(t => !t.isPinned);
      if (unpinnedIndex >= 0) {
        const newTabs = [...currentTabs];
        newTabs[unpinnedIndex] = { endpoint, isPinned: false };
        setActiveTabIndex(unpinnedIndex);
        return newTabs;
      }
      
      const newTabs = [...currentTabs, { endpoint, isPinned: false }];
      setActiveTabIndex(newTabs.length - 1);
      return newTabs;
    });
  };

  const handleDoubleClickEndpoint = (endpoint: EndpointInfo) => {
    setTabs((currentTabs) => {
      const existingIndex = currentTabs.findIndex(t => t.endpoint.apiKey === endpoint.apiKey && t.endpoint.fnName === endpoint.fnName);
      if (existingIndex >= 0) {
        const newTabs = [...currentTabs];
        newTabs[existingIndex] = { ...newTabs[existingIndex], isPinned: true };
        setActiveTabIndex(existingIndex);
        return newTabs;
      }
      const newTabs = [...currentTabs, { endpoint, isPinned: true }];
      setActiveTabIndex(newTabs.length - 1);
      return newTabs;
    });
  };

  const handleCloseTab = (index: number) => {
    setTabs((currentTabs) => {
      const newTabs = currentTabs.filter((_, i) => i !== index);
      if (newTabs.length === 0) {
        setActiveTabIndex(-1);
      } else if (index === activeTabIndex) {
        setActiveTabIndex(Math.min(index, newTabs.length - 1));
      } else if (index < activeTabIndex) {
        setActiveTabIndex(activeTabIndex - 1);
      }
      return newTabs;
    });
  };

  const handleCloseAllTabs = () => {
    setTabs([]);
    setActiveTabIndex(-1);
  };

  const handleCloseOthers = (index: number) => {
    setTabs((currentTabs) => {
      if (index < 0 || index >= currentTabs.length) return currentTabs;
      return [currentTabs[index]];
    });
    setActiveTabIndex(0);
  };

  const handleCloseToRight = (index: number) => {
    setTabs((currentTabs) => {
      if (index < 0 || index >= currentTabs.length) return currentTabs;
      return currentTabs.slice(0, index + 1);
    });
    setActiveTabIndex((currentActive) => (currentActive > index ? Math.max(0, index) : currentActive));
  };

  const handlePinTab = (index: number) => {
    setTabs((currentTabs) => {
      const newTabs = [...currentTabs];
      newTabs[index] = { ...newTabs[index], isPinned: true };
      return newTabs;
    });
  };

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
  const [importModalTab, setImportModalTab] = useState<"file" | "url" | "postman">("file");
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

  // Sync tabs with manifest changes
  useEffect(() => {
    if (projectLoading || isStandaloneMode || !apiManifest) return;

    if (Object.keys(apiManifest).length === 0 && tabs.length > 0) {
      setTabs([]);
      setActiveTabIndex(-1);
      return;
    }

    if (tabs.length > 0) {
      let needsUpdate = false;
      const newTabs = tabs.map((tab) => {
        const { apiKey, fnName } = tab.endpoint;
        const endpointDef = apiManifest?.[apiKey]?.[fnName];
        
        if (endpointDef) {
          const methodPrefix = fnName.split("_")[0].toUpperCase();
          const newMethod = endpointDef.method || methodPrefix;
          
          // Check for differences
          const hasDiff = 
            JSON.stringify(tab.endpoint.args) !== JSON.stringify(endpointDef.args || []) ||
            tab.endpoint.url !== endpointDef.url ||
            tab.endpoint.method !== newMethod ||
            tab.endpoint.requiresAuth !== endpointDef.requiresAuth ||
            tab.endpoint.contentType !== endpointDef.contentType ||
            tab.endpoint.description !== endpointDef.description;
            
          if (hasDiff) {
            needsUpdate = true;
            return {
              ...tab,
              endpoint: {
                ...tab.endpoint,
                args: endpointDef.args || [],
                url: endpointDef.url,
                method: newMethod,
                requiresAuth: endpointDef.requiresAuth,
                contentType: endpointDef.contentType,
                description: endpointDef.description,
              }
            };
          }
          return tab;
        }
        
        // Endpoint no longer exists in manifest
        needsUpdate = true;
        return null;
      });

      if (needsUpdate) {
        const filteredTabs = newTabs.filter(t => t !== null) as typeof tabs;
        setTabs(filteredTabs);
        
        // Adjust active index if necessary
        if (filteredTabs.length === 0) {
          setActiveTabIndex(-1);
        } else if (activeTabIndex >= filteredTabs.length) {
          setActiveTabIndex(filteredTabs.length - 1);
        } else {
          // If the specifically active tab was deleted, we might need to adjust, 
          // but the index shifting might mean we land on a different tab. 
          // For simplicity, we just keep activeTabIndex if it's within bounds.
          // Let's accurately find the new index of the previously active tab if it survived.
          const activeTab = tabs[activeTabIndex];
          const stillExistsIndex = filteredTabs.findIndex(t => 
            t.endpoint.apiKey === activeTab?.endpoint.apiKey && 
            t.endpoint.fnName === activeTab?.endpoint.fnName
          );
          
          if (stillExistsIndex !== -1) {
             setActiveTabIndex(stillExistsIndex);
          } else {
             // The active tab was deleted, select the one next to it (which is now at activeTabIndex, or bounded)
             setActiveTabIndex(Math.min(activeTabIndex, filteredTabs.length - 1));
          }
        }
      }
    }
  }, [apiManifest, projectLoading, isStandaloneMode, tabs, activeTabIndex]);

  const hasEndpoints = apiManifest && Object.keys(apiManifest).length > 0;

  const handleDownloadCollection = (id: string) => {
    let col = collections.find((c) => c.id === id);
    let nameToMatch = col?.name;

    if (!col && id === "default" && !isStandaloneMode) {
      nameToMatch = activeConfig?.collectionName;
      col = {
        id: "default",
        name: activeConfig?.collectionName || "Collection",
        manifest: apiManifest || {},
        modules: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as any;
    }

    // Try to find the original Postman/OpenAPI content in history first
    const historyItem = recentCollections.find((h) => h.name === nameToMatch);

    if (historyItem && historyItem.content) {
      try {
        const contentStr = JSON.stringify(historyItem.content, null, 2);
        const blob = new Blob([contentStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${historyItem.name.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_reex.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return;
      } catch (err) {
        console.error("Error downloading from history:", err);
      }
    }

    // Fallback: Show error
    showToast("error", "Original collection file not found in history. Cannot download collection.");
  };

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
      onContextMenu={(e) => e.preventDefault()}
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
            handleSelectEndpoint(ep);
            if (window.innerWidth <= 980) setIsSidebarOpen(false);
          }}
          onDoubleClickEndpoint={handleDoubleClickEndpoint}
          onDeleteModule={handleDeleteModule}
          onDeleteFunction={handleDeleteFunction}
          onDeleteCollection={openDeleteModal}
          onDownloadCollection={handleDownloadCollection}
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
          onOpenPostmanModal={() => {
            resetImportTask();
            setAutoAnalyzeImport(false);
            setImportModalTab("postman");
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
          method={selectedEndpoint?.method || ""}
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
          }}
          onHistoryDelete={removeCollectionFromHistory}
          tabs={tabs}
          activeTabIndex={activeTabIndex}
          onSelectTab={setActiveTabIndex}
          onCloseTab={handleCloseTab}
          onCloseAllTabs={handleCloseAllTabs}
          onCloseOthers={handleCloseOthers}
          onCloseToRight={handleCloseToRight}
          onPinTab={handlePinTab}
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
