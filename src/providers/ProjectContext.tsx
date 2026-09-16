"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
} from "react";
import { api } from "../services/api";
import { useStandaloneCollections } from "../hooks/useStandaloneCollections";
import { useRecentCollections } from "../hooks/useRecentCollections";
import { ProjectConfig, EndpointInfo, StandaloneCollection } from "../types";
import type { HistoryItem } from "@/services/collectionStorage";

export type { StandaloneCollection };

interface ProjectContextType {
  manifest: Record<string, Record<string, EndpointInfo>> | null;
  modules: Record<string, boolean>;
  config: ProjectConfig | null;
  projectPath: string;
  apiServicesDir: string;
  loading: boolean;
  error: string | null;
  connectionError: "pna_blocked" | null;
  isStandaloneMode: boolean;
  manualStandaloneMode: boolean;
  toggleStandaloneMode: () => Promise<void>;
  refreshProject: (silent?: boolean) => Promise<void>;
  // State setters for standalone mode
  setManifest: React.Dispatch<
    React.SetStateAction<Record<string, Record<string, EndpointInfo>> | null>
  >;
  setConfig: (config: ProjectConfig | null) => void;
  setModules: (modules: Record<string, boolean>) => void;
  // Multiple Collections Support
  collections: StandaloneCollection[];
  setCollections: (collections: StandaloneCollection[]) => void;
  addCollection: (collection: StandaloneCollection) => Promise<void>;
  updateCollection: (
    id: string,
    updates: Partial<StandaloneCollection>,
  ) => Promise<void>;
  removeCollection: (id: string) => Promise<void>;
  clearAllCollections: () => Promise<void>;
  // History Support
  recentCollections: HistoryItem[];
  addCollectionToHistory: (
    name: string,
    content: Record<string, unknown>,
  ) => Promise<void>;
  removeCollectionFromHistory: (id: string) => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [manifest, setManifest] = useState<Record<
    string,
    Record<string, EndpointInfo>
  > | null>(null);
  const [modules, setModules] = useState<Record<string, boolean>>({});
  const [config, setConfig] = useState<ProjectConfig | null>(null);
  const [projectPath, setProjectPath] = useState<string>("");
  const [apiServicesDir, setApiServicesDir] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<"pna_blocked" | null>(
    null,
  );
  const [isStandaloneMode, setIsStandaloneMode] = useState(false);
  const [manualStandaloneMode, setManualStandaloneMode] = useState(false);

  const [collections, setCollections] = useState<StandaloneCollection[]>([]);

  // Toggle Function
  const toggleStandaloneMode = async () => {
    const nextMode = !manualStandaloneMode;
    setManualStandaloneMode(nextMode);

    // If enabling manual standalone, force switch immediately
    if (nextMode) {
      setIsStandaloneMode(true);
    } else {
      // If disabling, retry fetching bridge to revert to project mode if available
      // Pass false to ignoreManual because manual mode state update might be async/batched
      // actually, we rely on the effect to trigger fetchProjectData
    }
  };

  // Standalone Collection Management via TanStack Query
  const {
    collections: standaloneCollections,
    createStandaloneCollection,
    updateStandaloneCollection,
    deleteStandaloneCollection,
    clearAllStandaloneCollections,
    isLoading: isLoadingStandalone,
  } = useStandaloneCollections(isStandaloneMode);

  // Recent History Management via TanStack Query
  const {
    recentCollections,
    addCollectionToHistory,
    removeCollectionFromHistory,
  } = useRecentCollections();

  // Computed merged manifest
  const mergedManifest = React.useMemo((): Record<
    string,
    Record<string, EndpointInfo>
  > | null => {
    if (!isStandaloneMode) return manifest;
    // Merge logic
    const merged: Record<string, Record<string, EndpointInfo>> = {};
    const sourceCollections = (
      isStandaloneMode ? standaloneCollections : collections
    ) as StandaloneCollection[];

    sourceCollections.forEach((col) => {
      if (!col.manifest) {
        return;
      }
      Object.keys(col.manifest).forEach((moduleName) => {
        // Namespace: col_{id}__{moduleName}
        const newKey = `col_${col.id}__${moduleName}`;
        merged[newKey] = col.manifest[moduleName];
      });
    });
    return merged;
  }, [manifest, collections, standaloneCollections, isStandaloneMode]);

  // Wrappers to match Context Interface signatures
  const addHistoryWrapper = async (
    name: string,
    content: Record<string, unknown>,
  ) => {
    await addCollectionToHistory({ name, content });
  };

  const removeHistoryWrapper = async (id: string) => {
    await removeCollectionFromHistory(id);
  };

  const fetchProjectData = useCallback(
    async (silent = false, ignoreManual = false) => {
      try {
        if (!silent) setLoading(true);

        let bridgeStatus;
        try {
          bridgeStatus = await api.fetchBridgeStatus();
        } catch {
          // Fallback handled below
        }

        const realTargetDir = bridgeStatus?.targetDir;
        const isNetworkError = bridgeStatus?.isNetworkError;
        const bridgeApiServicesDir = bridgeStatus?.apiServicesDir || "";

        // Check if user explicitly requested a local port but network failed (PNA block)
        if (
          isNetworkError &&
          typeof window !== "undefined" &&
          new URLSearchParams(window.location.search).has("localPort")
        ) {
          setConnectionError("pna_blocked");
          setLoading(false);
          return;
        } else {
          setConnectionError(null);
        }

        if (!realTargetDir) {
          // No bridge connected - enter standalone mode
          setIsStandaloneMode(true);
          // Hook handles fetching now

          setProjectPath("");
          setApiServicesDir("");
          setError(null);
          return;
        }

        // Bridge is connected
        setProjectPath(realTargetDir);
        setApiServicesDir(bridgeApiServicesDir);

        // If manual mode is ON and we are not ignoring it (e.g. initial load), force standalone
        if (manualStandaloneMode && !ignoreManual) {
          setIsStandaloneMode(true);
          setLoading(false);
          return;
        }

        setIsStandaloneMode(false);

        // Fetch Data from Bridge directly
        const bridgeUrl = api.getBridgeUrl();
        const [manifestData, modulesData, configData] = await Promise.all([
          api.fetchProjectManifest(bridgeUrl),
          api.fetchProjectModules(bridgeUrl),
          api.fetchProjectConfig(bridgeUrl),
        ]);
        setManifest(manifestData);
        setModules(modulesData);

        // Restore persisted auth settings from localStorage (project mode only)
        let finalConfig = configData;
        if (typeof window !== "undefined") {
          const savedAuth = localStorage.getItem("reex_project_auth");
          if (savedAuth) {
            try {
              const auth = JSON.parse(savedAuth);
              if (
                auth.token ||
                (auth.customHeaders &&
                  Object.keys(auth.customHeaders).length > 0)
              ) {
                finalConfig = { ...configData, auth };
              }
            } catch {
              /* ignore parse errors */
            }
          }
        }
        setConfig(finalConfig);

        setError(null);
      } catch (err: unknown) {
        console.error("Failed to load project:", err);
        // On error, also enter standalone mode
        setIsStandaloneMode(true);
        setCollections([]);
        setError(null);
      } finally {
        setLoading(false);
      }
    },
    [manualStandaloneMode],
  );

  const hasLoadedRef = React.useRef(false);

  useEffect(() => {
    // Perform initial load with visual loading state; subsequent mode toggles refresh silently in the background
    const silent = hasLoadedRef.current;
    fetchProjectData(silent).then(() => {
      hasLoadedRef.current = true;
    });
  }, [fetchProjectData]); // Re-run when manual mode changes

  const addCollection = async (col: StandaloneCollection) => {
    await createStandaloneCollection(col);
  };

  const updateCollection = async (
    id: string,
    updates: Partial<StandaloneCollection>,
  ) => {
    if (isStandaloneMode) {
      await updateStandaloneCollection({ id, updates });
    } else {
      setCollections((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...updates } : c)),
      );
    }
  };

  const removeCollection = async (id: string) => {
    if (isStandaloneMode) {
      await deleteStandaloneCollection(id);
    } else {
      setCollections((prev) => prev.filter((c) => c.id !== id));
    }
  };

  const clearAllCollections = async () => {
    if (isStandaloneMode) {
      await clearAllStandaloneCollections();
    } else {
      setCollections([]);
    }
  };

  return (
    <ProjectContext.Provider
      value={{
        manifest: isStandaloneMode ? mergedManifest : manifest,
        modules,
        config,
        projectPath,
        apiServicesDir,
        loading: isStandaloneMode ? isLoadingStandalone : loading, // Use standalone loading when appropriate
        error,
        connectionError,
        isStandaloneMode,
        manualStandaloneMode,
        toggleStandaloneMode,
        refreshProject: fetchProjectData,
        setManifest,
        setConfig,
        setModules,
        collections: (isStandaloneMode
          ? standaloneCollections
          : collections) as StandaloneCollection[],
        setCollections,
        addCollection,
        updateCollection,
        removeCollection,
        clearAllCollections, // Expose
        recentCollections: (recentCollections ?? []) as HistoryItem[],
        addCollectionToHistory: addHistoryWrapper,
        removeCollectionFromHistory: removeHistoryWrapper,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error("useProject must be used within a ProjectProvider");
  }
  return context;
};

export type { HistoryItem } from "@/services/collectionStorage";
