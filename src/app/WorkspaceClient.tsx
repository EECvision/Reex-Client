"use client";

import { useState, useEffect, useMemo, useRef, useSyncExternalStore } from "react";
// Static imports removed in favor of ProjectContext
import { useProject, StandaloneCollection } from "@/providers/ProjectContext";
import { useSettings } from "@/providers/SettingsContext";
import ImportModal from "@/components/ImportModal/ImportModal";
import HistoryModal from "@/components/HistoryModal/HistoryModal";
import DeleteConfirmModal from "@/components/DeleteConfirmModal/DeleteConfirmModal";
import GenerateModuleModal from "@/components/GenerateModuleModal/GenerateModuleModal";
import Navbar from "@/components/Navbar/Navbar";
import SidebarController from "@/components/Sidebar/SidebarController";
import WorkspaceView from "@/components/WorkspaceView/WorkspaceView";
import WelcomeCard from "@/components/WelcomeCard/WelcomeCard";
import BackgroundNotification from "@/components/BackgroundNotification/BackgroundNotification";
import { AuthModal } from "@/components/AuthModal/AuthModal";
import SandboxModal from "@/components/SandboxModal/SandboxModal";
import PnaErrorModal from "@/components/PnaErrorModal/PnaErrorModal";
import { Assistant } from "@/components/Assistant/Assistant";
import styles from "./page.module.css";
import { EndpointInfo } from "@/types";
import { openInCodeSandbox } from "@/utils/codesandbox/index";
import {
  TabPointer,
  normalizeTabPointers,
  selectEndpoint,
  doubleClickEndpoint,
} from "@/utils/tabManagement";
import { TourProvider, ProductTour } from "@/components/ProductTour";

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

const AppContent = () => {
  const { pinTabsByDefault } = useSettings();
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
  const [tabPointers, setTabPointers] = useState<TabPointer[]>(() => {
    if (typeof window !== "undefined") {
      const savedPointers = localStorage.getItem("reex_project_tabs");
      if (savedPointers) {
        try {
          return normalizeTabPointers(JSON.parse(savedPointers));
        } catch (e) {
          console.error("Failed to parse tab pointers", e);
        }
      }
    }
    return [];
  });
  const [activeTabKey, setActiveTabKey] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const savedKey = localStorage.getItem("reex_project_active_tab_key");
      if (savedKey) return savedKey;
    }
    return "";
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

  // Track hydration status to prevent overwriting localStorage on initial render
  const isHydrated = useRef(false);
  useEffect(() => {
    isHydrated.current = true;
  }, []);

  // Derive active tab index strictly from tabs matching activeTabKey
  const activeTabIndex = useMemo(() => {
    if (tabs.length === 0) return -1;
    const index = tabs.findIndex(
      (t) => `${t.endpoint.apiKey}__${t.endpoint.fnName}` === activeTabKey
    );
    return index >= 0 ? index : 0;
  }, [tabs, activeTabKey]);

  // Save tab pointers and active tab key to localStorage
  useEffect(() => {
    if (!isHydrated.current) return;
    if (typeof window !== "undefined") {
      localStorage.setItem("reex_project_tabs", JSON.stringify(tabPointers));
      localStorage.setItem("reex_project_active_tab_key", activeTabKey);
    }
  }, [tabPointers, activeTabKey]);

  const selectedEndpoint = useMemo(() => {
    if (tabs.length === 0 || activeTabIndex < 0 || activeTabIndex >= tabs.length) {
      return null;
    }
    return tabs[activeTabIndex].endpoint;
  }, [tabs, activeTabIndex]);

  const handleSelectEndpoint = (endpoint: EndpointInfo) => {
    const { newPointers, newActiveKey } = selectEndpoint(tabPointers, endpoint, pinTabsByDefault);
    setTabPointers(newPointers);
    setActiveTabKey(newActiveKey);
  };

  const handleDoubleClickEndpoint = (endpoint: EndpointInfo) => {
    const { newPointers, newActiveKey } = doubleClickEndpoint(tabPointers, endpoint);
    setTabPointers(newPointers);
    setActiveTabKey(newActiveKey);
  };

  const handleCloseTab = (index: number) => {
    if (index < 0 || index >= tabs.length) return;
    const tabToClose = tabs[index];
    const keyToClose = `${tabToClose.endpoint.apiKey}__${tabToClose.endpoint.fnName}`;

    let nextKey = activeTabKey;
    if (keyToClose === activeTabKey) {
      if (tabs.length <= 1) {
        nextKey = "";
      } else if (index === tabs.length - 1) {
        const prev = tabs[index - 1];
        nextKey = `${prev.endpoint.apiKey}__${prev.endpoint.fnName}`;
      } else {
        const next = tabs[index + 1];
        nextKey = `${next.endpoint.apiKey}__${next.endpoint.fnName}`;
      }
    }

    setTabPointers((prev) => prev.filter((p) => `${p.apiKey}__${p.fnName}` !== keyToClose));
    setActiveTabKey(nextKey);
  };

  const handleCloseAllTabs = () => {
    setTabPointers([]);
    setActiveTabKey("");
  };

  const handleCloseOthers = (index: number) => {
    if (index < 0 || index >= tabs.length) return;
    const target = tabs[index];
    setTabPointers([{ apiKey: target.endpoint.apiKey, fnName: target.endpoint.fnName, isPinned: true }]);
    setActiveTabKey(`${target.endpoint.apiKey}__${target.endpoint.fnName}`);
  };

  const handleCloseToRight = (index: number) => {
    if (index < 0 || index >= tabs.length) return;
    const kept = tabs.slice(0, index + 1);
    const keptKeys = new Set(kept.map((t) => `${t.endpoint.apiKey}__${t.endpoint.fnName}`));
    setTabPointers((prev) => prev.filter((p) => keptKeys.has(`${p.apiKey}__${p.fnName}`)));
    if (!keptKeys.has(activeTabKey)) {
      const lastKept = kept[kept.length - 1];
      setActiveTabKey(`${lastKept.endpoint.apiKey}__${lastKept.endpoint.fnName}`);
    }
  };

  const handleTabsDeletion = (filterFn: (pointer: TabPointer) => boolean) => {
    const newPointers = normalizeTabPointers(tabPointers).filter(filterFn);
    if (newPointers.length !== tabPointers.length) {
      setTabPointers(newPointers);
      if (!newPointers.some((p) => `${p.apiKey}__${p.fnName}` === activeTabKey)) {
        setActiveTabKey(newPointers.length > 0 ? `${newPointers[0].apiKey}__${newPointers[0].fnName}` : "");
      }
    }
  };

  const handlePinTab = (index: number) => {
    if (index < 0 || index >= tabs.length) return;
    const target = tabs[index];
    const key = `${target.endpoint.apiKey}__${target.endpoint.fnName}`;
    setTabPointers((prev) =>
      prev.map((p) => (`${p.apiKey}__${p.fnName}` === key ? { ...p, isPinned: true } : p))
    );
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
    ? activeCollection?.config ?? null
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

  const handleSaveAuth = async (
    collectionId: string,
    token: string,
    customHeaders: Record<string, string>,
  ) => {
    try {
      if (isStandaloneMode) {
        const targetCol = collections.find((c) => c.id === collectionId);
        if (!targetCol) return;

        await updateCollection(collectionId, {
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
    } catch (error) {
      console.error("Could not save API authentication:", error);
    }
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



  const hasEndpoints = !!(apiManifest && Object.keys(apiManifest).length > 0);

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
        config: activeConfig ?? {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as StandaloneCollection;
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
      <main className={styles.loadingContainer}>
        <WelcomeCard />
        <p className={styles.loadingText} role="status">
          Loading project workspace...
        </p>
      </main>
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
          onRenameCollection={(id, name) => updateCollection(id, { name }).catch(() => {})}
          onUpdateCollection={openUpdateModal}
          onOpenSandbox={(id) => {
            const col = collections.find((c) => c.id === id);
            if (col && activeConfig) {
              openInCodeSandbox(
                col.name,
                activeConfig.baseURL || "",
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
              }).catch(() => {});
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
            hasHistory={!!(recentCollections && recentCollections.length > 0)}
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

            const deleted = await handleDeleteCollection();
            if (!deleted) return;

            if (isClearAll || !isStandaloneMode) {
              setTabPointers([]);
              setActiveTabKey("");
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
                    manifest: apiManifest ?? {},
                    modules: {} as Record<string, string>,
                    config: projectConfig ?? {},
                  } as StandaloneCollection,
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
          onSelectTab={(index) => {
            if (tabs[index]) {
              setActiveTabKey(`${tabs[index].endpoint.apiKey}__${tabs[index].endpoint.fnName}`);
            }
          }}
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
      <ProductTour />
    </div>
  );
};

export default function App() {
  return (
    <TourProvider>
      <AppContent />
    </TourProvider>
  );
}
