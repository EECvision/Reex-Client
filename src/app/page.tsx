"use client";

import { useState, useEffect, useRef } from "react";
// Static imports removed in favor of ProjectContext
import { useProject } from "@/providers/ProjectContext";
import { api } from "@/services/api";
import ImportModal from "@/components/ImportModal/ImportModal";
import DeleteConfirmModal from "@/components/DeleteConfirmModal/DeleteConfirmModal";
import GenerateTemplateModal from "@/components/GenerateTemplateModal/GenerateTemplateModal";
import Navbar from "@/components/Navbar/Navbar";
import Sidebar from "@/components/Sidebar/Sidebar";
import QuerySection from "@/components/QuerySection/QuerySection";
import ResultSection from "@/components/ResultSection/ResultSection";
import Toast from "@/components/Toast/Toast";
import BackgroundNotification, {
  BackgroundTask,
} from "@/components/BackgroundNotification/BackgroundNotification";
import EmptyState from "@/components/EmptyState/EmptyState";
import styles from "./page.module.css";

import { EndpointInfo, Methods, ToastItem } from "@/types";

type ApiKey = string;

type ParamsState = {
  [key: string]: {
    [key: string]: any;
  };
};

const App = () => {
  const [selectedEndpoint, setSelectedEndpoint] = useState<EndpointInfo | null>(
    null
  );
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [params, setParams] = useState<ParamsState>({});
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set()
  );
  const [interfacePreview, setInterfacePreview] = useState<string | null>(null);
  const [savingInterface, setSavingInterface] = useState(false);
  const [copied, setCopied] = useState(false);
  const [importTaskComplete, setImportTaskComplete] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [backgroundTasks, setBackgroundTasks] = useState<BackgroundTask[]>([]);
  const [methodFilter, setMethodFilter] = useState<Methods>("ALL");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [fetchingUrl, setFetchingUrl] = useState(false);

  // Project Context
  const { manifest: apiManifest, loading: projectLoading, error: projectError, refreshProject, projectPath } = useProject();

  // Delete item modal state
  const [showDeleteItemModal, setShowDeleteItemModal] = useState(false);
  const [deleteItemInfo, setDeleteItemInfo] = useState<{
    type: "module" | "function";
    moduleName: string;
    functionName?: string;
  } | null>(null);
  const [deletingItem, setDeletingItem] = useState(false);

  // Generate template modal state
  const [showGenerateModal, setShowGenerateModal] = useState(false);

  // Track background task for delete collection
  const activeTaskIdRef = useRef<string | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, message }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 5000);
  };

  // Consolidating Project State from Context
  // const { manifest: apiManifest, loading: projectLoading, error: projectError, refreshProject, projectPath } = useProject(); 
  // (already declared above at line 55)

  // Use Context config
  const { config: projectConfig, modules: projectModules } = useProject();

  // Reset selected endpoint if manifest becomes empty
  useEffect(() => {
    if (apiManifest && Object.keys(apiManifest).length === 0) {
      setSelectedEndpoint(null);
    }
  }, [apiManifest]);
  // END RESTORED LOGIC

  const handleFetchUrl = async (url: string) => {
    setFetchingUrl(true);
    setImportFile(null);
    try {
      // API Call
      const data = await api.fetchUrl(url);

      if (data.error) throw new Error(data.error);

      // Create a file from the JSON
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
    setError(null);

    try {
      // Generate taskId on client to avoid race condition
      const taskId = Date.now().toString();
      activeTaskIdRef.current = taskId;

      // API Call
      const data = await api.deleteCollection(projectPath, api.getBridgeUrl(), taskId);
      if (!data.success) {
        activeTaskIdRef.current = null;
        throw new Error(data.error || "Deletion failed");
      }

      if (data.taskId) {
        // Async task started. Keep modal open and deleting=true.
        // activeTaskIdRef.current is already set.
      } else {
        // Fallback if no taskId returned
        showToast("success", "Collection deleted!");
        setShowDeleteModal(false);
        setDeleting(false);
        refreshProject(true);
      }
    } catch (err: any) {
      setError(err.message);
      showToast("error", err.message || "Failed to delete collection");
      setDeleting(false);
    }
  };

  const handleDeleteModule = (moduleName: string) => {
    setDeleteItemInfo({ type: "module", moduleName });
    setShowDeleteItemModal(true);
  };

  const handleDeleteFunction = (moduleName: string, functionName: string) => {
    setDeleteItemInfo({ type: "function", moduleName, functionName });
    setShowDeleteItemModal(true);
  };

  const confirmDeleteItem = async () => {
    if (!deleteItemInfo) return;
    setDeletingItem(true);

    try {
      // Generate taskId on client to avoid race condition (SSE arriving before response)
      const taskId = Date.now().toString();
      activeTaskIdRef.current = taskId;

      // API Call
      const data = await api.deleteItem(deleteItemInfo, projectPath, api.getBridgeUrl(), taskId);
      if (!data.success) {
        activeTaskIdRef.current = null; // Clear if failed immediately
        throw new Error(data.error || "Deletion failed");
      }

      if (data.taskId) {
        // Async task started. Keep modal open.
        // activeTaskIdRef.current is already set.
        // SSE 'complete' event will close the modal
      } else {
        // Fallback for sync response
        showToast("success", data.message || "Item deleted");
        setShowDeleteItemModal(false);
        setDeleteItemInfo(null);
        refreshProject(true);
      }
    } catch (err: any) {
      showToast("error", err.message || "Failed to delete item");
      setDeletingItem(false);
    }
  };

  const getEndpoints = (): EndpointInfo[] => {
    if (!apiManifest) return [];
    const endpoints: EndpointInfo[] = [];

    for (const apiKey in apiManifest) {
      const detailedMod = apiManifest[apiKey] || {};
      // In manifest, keys are methods
      const fnNames = Object.keys(detailedMod);

      for (const fnName of fnNames) {
        const methodDef = detailedMod[fnName];
        // Check if it looks like a method (has args)
        if (!methodDef || !methodDef.args) continue;

        const methodPrefix = fnName.split("_")[0].toUpperCase();
        if (methodFilter !== "ALL" && methodPrefix !== methodFilter) continue;

        endpoints.push({
          apiKey: apiKey as ApiKey,
          fnName: fnName,
          args: methodDef.args || [],
        });
      }
    }

    return endpoints;
  };

  const groupedEndpoints = getEndpoints().reduce((acc, endpoint) => {
    if (!acc[endpoint.apiKey]) {
      acc[endpoint.apiKey] = [];
    }
    acc[endpoint.apiKey].push(endpoint);
    return acc;
  }, {} as Record<string, EndpointInfo[]>);

  const hasEndpoints = apiManifest && Object.keys(apiManifest).length > 0;

  const tryParse = (value: string) => {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  };

  const handleParamChange = (paramName: string, value: string) => {
    if (!selectedEndpoint) return;
    const key = `${selectedEndpoint.apiKey}.${selectedEndpoint.fnName}`;
    setParams((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [paramName]: tryParse(value),
      },
    }));
  };

  const handleSubmit = async () => {
    if (!selectedEndpoint) return;

    setResult(null);
    setError(null);
    setLoading(true);

    try {
      const key = `${selectedEndpoint.apiKey}.${selectedEndpoint.fnName}`;
      const currentParams = params[key] || {};

      // Re-introduce args calculation even if not executing, to show we processed them
      let args: any[] = [];

      if (
        selectedEndpoint.args.length === 1 &&
        selectedEndpoint.args[0].isObject &&
        Array.isArray(selectedEndpoint.args[0].properties)
      ) {
        const payload: Record<string, any> = {};
        const props = selectedEndpoint.args[0].properties;

        for (const prop of props) {
          const value = currentParams[prop.name];
          if (value !== undefined && value !== "") {
            payload[prop.name] = value;
          } else if (!prop.isOptional) {
            throw new Error(`Missing required field: ${prop.name}`);
          }
        }

        args = [payload];
      } else {
        args = selectedEndpoint.args.map((arg) => {
          const value = currentParams[arg.name];
          if (value === undefined || value === "") {
            if (!arg.isOptional)
              throw new Error(`Missing required param: ${arg.name}`);
          }
          return value;
        });
      }
      /* 
      // Execution Disabled in Dynamic Mode
      const _module = apiModules[selectedEndpoint.apiKey];
      const fn = _module[selectedEndpoint.fnName as keyof typeof _module] as (
          ...args: any[]
      ) => Promise<any>;
      const res = await fn(...args); 
      */

      // Real Execution via Server Proxy
      const execRes: any = await api.executeFunction(selectedEndpoint.apiKey, selectedEndpoint.fnName, args);

      if (!execRes.success) {
        throw new Error(execRes.error || "Execution failed");
      }

      // The result is in execRes.data
      // It might be the direct response data or axios wrapped. 
      // My ExecutionService returns `result` directly if successful.
      const res = execRes.data;
      const payload = res?.data?.data ?? res?.data ?? res;

      if (
        res.error ||
        res?.success === false ||
        res?.data?.success === false ||
        payload?.success === false
      ) {
        throw new Error(payload?.msg || payload?.message || "Request failed");
      }

      setResult(payload);

      // Get interface preview via API
      if (payload) {
        try {
          const previewData = await api.previewTypes({
            data: payload,
            fnName: selectedEndpoint.fnName,
          });
          // If not implemented, it will just fail silently or error
          if (previewData && previewData.success) {
            setInterfacePreview((previewData as any).interfaceString);
          }
        } catch (e) {
          console.error("Failed to generate preview", e);
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const toggleFolder = (apiKey: string) => {
    setExpandedFolders((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(apiKey)) {
        newSet.delete(apiKey);
      } else {
        newSet.add(apiKey);
      }
      return newSet;
    });
  };

  // Helper to compute URL
  const getComputedUrl = () => {
    if (!selectedEndpoint || !projectConfig) return "";
    const { apiKey, fnName } = selectedEndpoint;
    const endpointDef = apiManifest[apiKey]?.[fnName];

    if (!endpointDef) return "";

    const clientName = endpointDef.client || "BASE_CLIENT";
    const clientBase = projectConfig.clients?.[clientName] || projectConfig.baseURL;
    const path = endpointDef.url || "";

    return `${clientBase}${path}`;
  };


  const selectEndpoint = (endpoint: EndpointInfo) => {
    setSelectedEndpoint(endpoint);
    setResult(null);
    setError(null);
    setInterfacePreview(null);
  };

  const handleSaveInterface = async () => {
    if (!selectedEndpoint || !result) return;
    setSavingInterface(true);
    try {
      const data = await api.saveTypes({
        apiKey: selectedEndpoint.apiKey,
        fnName: selectedEndpoint.fnName,
        data: result,
      });

      if (data && data.success) {
        showToast("success", "Interface updated successfully!");
      } else {
        showToast("error", data?.error || "Failed to update interface");
      }
    } catch (e: any) {
      showToast("error", e.message);
    } finally {
      setSavingInterface(false);
    }
  };

  const getCurrentParams = () => {
    if (!selectedEndpoint) return {};
    const key = `${selectedEndpoint.apiKey}.${selectedEndpoint.fnName}`;
    return params[key] || {};
  };

  const isSubmitDisabled = () => {
    if (!selectedEndpoint || loading) return true;

    const currentParams = getCurrentParams();
    const requiredFields = selectedEndpoint.args.flatMap((arg) => {
      if (arg.isObject && Array.isArray((arg as any).properties)) {
        return (arg as any).properties
          .filter((p: any) => !p.isOptional)
          .map((p: any) => p.name);
      } else if (!arg.isOptional) {
        return [arg.name];
      } else {
        return [];
      }
    });

    return !requiredFields.every((field) => {
      const value = currentParams[field];
      return value !== undefined && value !== "";
    });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDismissToast = (id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const dismissBackgroundTask = (id: number) => {
    setBackgroundTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const formatMessage = (msg: string) => {
    return msg.length > 60 ? msg.substring(0, 60) + "..." : msg;
  };

  // Listen for background events from Server via SSE
  useEffect(() => {
    const eventSource = api.getEventSource();

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

          // remove double toast

          // data.id comes as string or number from JSON.parse
          if (activeTaskIdRef.current && String(data.id) === String(activeTaskIdRef.current)) {
            // Check if we are in Import Mode
            if (showImportModal) {
              setImportTaskComplete(true);
              activeTaskIdRef.current = null;
              // Do NOT close modal yet
            } else {
              setDeleting(false);
              setDeletingItem(false); // Reset item deleting state
              setShowDeleteModal(false);
              setShowDeleteItemModal(false); // Close item delete modal
              setShowGenerateModal(false);
              setShowImportModal(false); // Fallback
              activeTaskIdRef.current = null;
            }

            // Suppress toast for "Collection updated" (Sync), "Successfully deleted", and "Type generation complete"
            // Show for "Template generated" etc.
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
            // User request: "Don't show Sync started and the one shown when sync has completed"
            if (!data.message?.toLowerCase().includes("sync completed")) {
              showToast("success", data.message);
            }
          }

        } else if (data.type === "error") {
          showToast("error", data.message);

          if (activeTaskIdRef.current && String(data.id) === String(activeTaskIdRef.current)) {
            setDeleting(false);
            setDeletingItem(false);
            setShowDeleteModal(false);
            setShowDeleteItemModal(false);
            activeTaskIdRef.current = null;
          }
        } else if (data.type === "project:updated") {
          // Reload data without full page reload
          refreshProject(true);
        }
      } catch (e) {
        console.error("Error parsing event:", e);
      }
    };

    return () => {
      eventSource.close();
    };
  }, []);

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

  if (projectError) {
    return <div className={styles.container}><div className={styles.main}>Error loading project: {projectError}</div></div>;
  }

  return (
    <div className={styles.container}>
      <Toast toasts={toasts} onDismiss={handleDismissToast} />
      <BackgroundNotification
        tasks={backgroundTasks}
        onDismiss={dismissBackgroundTask}
      />

      <Sidebar
        groupedEndpoints={groupedEndpoints}
        expandedFolders={expandedFolders}
        selectedEndpoint={selectedEndpoint}
        methodFilter={methodFilter}
        onToggleFolder={toggleFolder}
        onSelectEndpoint={selectEndpoint}
        setMethodFilter={setMethodFilter}
        onDeleteModule={handleDeleteModule}
        onDeleteFunction={handleDeleteFunction}
      />

      <div className={styles.mainWrapper}>
        <Navbar
          selectedEndpoint={selectedEndpoint}
          onImportClick={() => setShowImportModal(true)}
          hasCollection={hasEndpoints}
          onDeleteClick={() => setShowDeleteModal(true)}
          onFetchUrl={handleFetchUrl}
          isFetching={fetchingUrl}
          onGenerateClick={() => setShowGenerateModal(true)}
          baseURL={projectConfig?.baseURL}
          computedUrl={getComputedUrl()}
          method={selectedEndpoint ? selectedEndpoint.fnName.split('_')[0].toUpperCase() : ""}
          projectPath={projectPath} // Pass project path
        />

        {showImportModal && (
          <ImportModal
            isOpen={showImportModal}
            onClose={() => {
              setShowImportModal(false);
              setImportFile(null);
              setImportTaskComplete(false); // Reset on close
            }}
            initialFile={importFile}
            // onSuccess={(msg) => showToast("success", msg)} // Handled internally now
            onSuccess={() => { }}
            isEmptyWorkspace={!hasEndpoints}
            onUpdateStarted={(taskId) => {
              activeTaskIdRef.current = taskId;
            }}
            targetDir={projectPath}
            taskComplete={importTaskComplete}
          />
        )}

        <DeleteConfirmModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteCollection}
          deleting={deleting}
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
            onClose={() => setShowGenerateModal(false)}
            onSuccess={(msg) => showToast("success", msg)}
            onTaskStarted={(taskId) => {
              activeTaskIdRef.current = taskId;
            }}
            targetDir={projectPath}
          />
        }

        <main className={styles.main}>
          {!selectedEndpoint ? (
            <EmptyState
              hasEndpoints={hasEndpoints}
              onImportClick={() => setShowImportModal(true)}
            />
          ) : (
            <>
              <QuerySection
                selectedEndpoint={selectedEndpoint}
                currentParams={getCurrentParams()}
                loading={loading}
                isSubmitDisabled={isSubmitDisabled()}
                onParamChange={handleParamChange}
                onSubmit={handleSubmit}
              />

              {/* Removed duplicate URL display since it's now in Navbar */}
              <ResultSection
                error={error}
                result={result}
                copied={copied}
                onCopy={handleCopy}
                interfacePreview={interfacePreview}
                onUpdateInterface={handleSaveInterface}
                updatingInterface={savingInterface}
              />
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
