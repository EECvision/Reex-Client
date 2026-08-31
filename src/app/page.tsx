"use client";

import { useState, useEffect, useMemo, useRef, useSyncExternalStore } from "react";
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
import PnaErrorModal from "@/components/PnaErrorModal/PnaErrorModal";
import { Assistant } from "@/components/Assistant/Assistant";
import styles from "./page.module.css";
import { EndpointInfo } from "@/types";
import { openInCodeSandbox } from "@/utils/codesandbox/index";

// Hooks
import { useToast } from "@/hooks/useToast";
import { useProjectSync } from "@/hooks/useProjectSync";
import { useCollectionManagement } from "@/hooks/useCollectionManagement";
import { useEndpointExecution } from "@/hooks/useEndpointExecution";

// Responsive viewport media query hook utilizing useSyncExternalStore
const useMediaQuery = (query: string): boolean => {
  const subscribe = (callback: () => void) => {
    if (typeof window === "undefined") return () => {};
    const matchMedia = window.matchMedia(query);
    matchMedia.addEventListener("change", callback);
    return () => matchMedia.removeEventListener("change", callback);
  };
  return useSyncExternalStore(
    subscribe,
    () => typeof window !== "undefined" ? window.matchMedia(query).matches : false, // Client snapshot
    () => false // Server snapshot fallback
  );
};

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

    connectionError,
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
  type TabPointer = {
    apiKey: string;
    fnName: string;
    isPinned: boolean;
  };
  const [tabPointers, setTabPointers] = useState<TabPointer[]>(() => {
    if (typeof window !== "undefined") {
      const modeSuffix = isStandaloneMode ? "_standalone" : "";
      const savedPointers = localStorage.getItem(`reex_project_tabs${modeSuffix}`);
      if (savedPointers) {
        try {
          return JSON.parse(savedPointers);
        } catch (e) {
          console.error("Failed to parse tab pointers", e);
        }
      }
    }
    return [];
  });
  const [activeTabIndex, setActiveTabIndex] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const modeSuffix = isStandaloneMode ? "_standalone" : "";
      const savedIndex = localStorage.getItem(`reex_project_active_tab${modeSuffix}`);
      return savedIndex ? Number(savedIndex) : -1;
    }
    return -1;
  });

  // Derive fully hydrated tabs dynamically on the fly from pointers and apiManifest
  const tabs = useMemo(() => {
    if (!apiManifest || projectLoading) return [];
    
    return tabPointers
      .map((pointer) => {
        const endpointDef = apiManifest?.[pointer.apiKey]?.[pointer.fnName];
        if (!endpointDef) return null; // Automatically purges deleted endpoints from UI
        
        const methodPrefix = pointer.fnName.split("_")[0].toUpperCase();
        return {
          isPinned: pointer.isPinned,
          endpoint: {
            apiKey: pointer.apiKey,
            fnName: pointer.fnName,
            url: endpointDef.url,
            method: endpointDef.method || methodPrefix,
            args: endpointDef.args || [],
            requiresAuth: endpointDef.requiresAuth,
            contentType: endpointDef.contentType,
            description: endpointDef.description,
          }
        } as Tab;
      })
      .filter((t): t is Tab => t !== null);
  }, [tabPointers, apiManifest, projectLoading]);

  // Load tab pointers from localStorage when standalone mode switches after mount
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (typeof window !== "undefined") {
      queueMicrotask(() => {
        try {
          const modeSuffix = isStandaloneMode ? "_standalone" : "";
          const savedPointers = localStorage.getItem(`reex_project_tabs${modeSuffix}`);
          const savedIndex = localStorage.getItem(`reex_project_active_tab${modeSuffix}`);
          if (savedPointers) {
              const parsed = JSON.parse(savedPointers);
              setTabPointers(parsed);
          } else {
              setTabPointers([]);
          }
          if (savedIndex) {
              setActiveTabIndex(Number(savedIndex));
          } else {
              setActiveTabIndex(-1);
          }
        } catch (e) {
          console.error("Failed to load tab pointers on standalone mode switch", e);
        }
      });
    }
  }, [isStandaloneMode]);

  // Save tab pointers to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const modeSuffix = isStandaloneMode ? "_standalone" : "";
      localStorage.setItem(`reex_project_tabs${modeSuffix}`, JSON.stringify(tabPointers));
      localStorage.setItem(`reex_project_active_tab${modeSuffix}`, String(activeTabIndex));
    }
  }, [tabPointers, activeTabIndex, isStandaloneMode]);

  const selectedEndpoint = activeTabIndex >= 0 && activeTabIndex < tabs.length 
    ? tabs[activeTabIndex].endpoint 
    : null;

  const handleSelectEndpoint = (endpoint: EndpointInfo) => {
    setTabPointers((currentPointers) => {
      const existingIndex = currentPointers.findIndex(p => p.apiKey === endpoint.apiKey && p.fnName === endpoint.fnName);
      if (existingIndex >= 0) {
        setActiveTabIndex(existingIndex);
        return currentPointers;
      }
      
      const unpinnedIndex = currentPointers.findIndex(p => !p.isPinned);
      if (unpinnedIndex >= 0) {
        const newPointers = [...currentPointers];
        newPointers[unpinnedIndex] = { apiKey: endpoint.apiKey, fnName: endpoint.fnName, isPinned: false };
        setActiveTabIndex(unpinnedIndex);
        return newPointers;
      }
      
      const newPointers = [...currentPointers, { apiKey: endpoint.apiKey, fnName: endpoint.fnName, isPinned: false }];
      setActiveTabIndex(newPointers.length - 1);
      return newPointers;
    });
  };

  const handleDoubleClickEndpoint = (endpoint: EndpointInfo) => {
    setTabPointers((currentPointers) => {
      const existingIndex = currentPointers.findIndex(p => p.apiKey === endpoint.apiKey && p.fnName === endpoint.fnName);
      if (existingIndex >= 0) {
        const newPointers = [...currentPointers];
        newPointers[existingIndex] = { ...newPointers[existingIndex], isPinned: true };
        setActiveTabIndex(existingIndex);
        return newPointers;
      }
      const newPointers = [...currentPointers, { apiKey: endpoint.apiKey, fnName: endpoint.fnName, isPinned: true }];
      setActiveTabIndex(newPointers.length - 1);
      return newPointers;
    });
  };

  const handleCloseTab = (index: number) => {
    setTabPointers((currentPointers) => {
      const newPointers = currentPointers.filter((_, i) => i !== index);
      if (newPointers.length === 0) {
        setActiveTabIndex(-1);
      } else if (index === activeTabIndex) {
        setActiveTabIndex(Math.min(index, newPointers.length - 1));
      } else if (index < activeTabIndex) {
        setActiveTabIndex(activeTabIndex - 1);
      }
      return newPointers;
    });
  };

  const handleCloseAllTabs = () => {
    setTabPointers([]);
    setActiveTabIndex(-1);
  };

  const handleCloseOthers = (index: number) => {
    setTabPointers((currentPointers) => {
      if (index < 0 || index >= currentPointers.length) return currentPointers;
      return [currentPointers[index]];
    });
    setActiveTabIndex(0);
  };

  const handleCloseToRight = (index: number) => {
    setTabPointers((currentPointers) => {
      if (index < 0 || index >= currentPointers.length) return currentPointers;
      return currentPointers.slice(0, index + 1);
    });
    setActiveTabIndex((currentActive) => (currentActive > index ? Math.max(0, index) : currentActive));
  };

  const handleTabsDeletion = (filterFn: (pointer: TabPointer) => boolean) => {
    setTabPointers((prev) => {
      const newPointers = prev.filter(filterFn);
      if (newPointers.length !== prev.length) {
        const activePointer = prev[activeTabIndex];
        if (activePointer && newPointers.some(p => p.apiKey === activePointer.apiKey && p.fnName === activePointer.fnName)) {
          setActiveTabIndex(newPointers.findIndex(p => p.apiKey === activePointer.apiKey && p.fnName === activePointer.fnName));
        } else {
          setActiveTabIndex(newPointers.length > 0 ? 0 : -1);
        }
      }
      return newPointers;
    });
  };

  const handlePinTab = (index: number) => {
    setTabPointers((currentPointers) => {
      const newPointers = [...currentPointers];
      newPointers[index] = { ...newPointers[index], isPinned: true };
      return newPointers;
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
  const isDesktop = useMediaQuery("(min-width: 1141px)");
  const [userToggledSidebar, setUserToggledSidebar] = useState<boolean | null>(null);
  const isSidebarOpen = userToggledSidebar !== null ? userToggledSidebar : isDesktop;
  const setIsSidebarOpen = (val: boolean | ((prev: boolean) => boolean)) => {
    setUserToggledSidebar(typeof val === "function" ? val(isSidebarOpen) : val);
  };

  const [autoAnalyzeImport, setAutoAnalyzeImport] = useState(false);
  const [importModalTab, setImportModalTab] = useState<"file" | "url" | "postman">("file");
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [isSandboxOpen, setIsSandboxOpen] = useState(false);

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
      {connectionError === 'pna_blocked' && (
        <PnaErrorModal 
          onSwitchToPreview={() => {
            if (typeof window !== 'undefined') {
              const url = new URL(window.location.href);
              url.searchParams.delete('localPort');
              window.history.replaceState({}, '', url.toString());
            }
            refreshProject(false);
          }} 
        />
      )}
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
           key={showHistoryModal ? "history-opened" : "history-closed"}
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
              setImportModalTab("file");
              setShowImportModal(true);
              setShowHistoryModal(false);
            }}
            onDelete={removeCollectionFromHistory}
          />
        )}

        <DeleteConfirmModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={async () => {
            const isClearAll = isStandaloneMode && !collectionToDelete;
            const colId = collectionToDelete;

            await handleDeleteCollection();

            if (isClearAll || !isStandaloneMode) {
              setTabPointers([]);
              setActiveTabIndex(-1);
            } else if (colId) {
              handleTabsDeletion((p) => !p.apiKey.startsWith(`col_${colId}__`));
            }
          }}
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
          onConfirm={async () => {
            const info = deleteItemInfo;
            await confirmDeleteItem();
            
            if (info) {
              handleTabsDeletion((t) => {
                if (info.type === "module") {
                  return t.apiKey !== info.moduleName;
                } else {
                  return !(t.apiKey === info.moduleName && t.fnName === info.functionName);
                }
              });
            }
          }}
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
            setImportModalTab("file");
            setShowImportModal(true);
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
