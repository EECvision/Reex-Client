
"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api } from '../services/api';
import { useStandaloneCollections } from '../hooks/useStandaloneCollections';
import { useRecentCollections } from '../hooks/useRecentCollections';

export interface StandaloneCollection {
  id: string;
  name: string;
  manifest: any;
  modules: Record<string, string>;
  config: any;
}

export interface HistoryItem {
  id: string;
  name: string;
  updated_at: string;
  content: any;
}

interface ProjectContextType {
  manifest: any;
  modules: any[];
  config: any;
  projectPath: string;
  apiServicesDir: string;
  loading: boolean;
  error: string | null;
  isStandaloneMode: boolean;
  manualStandaloneMode: boolean;
  toggleStandaloneMode: () => Promise<void>;
  refreshProject: (silent?: boolean) => Promise<void>;
  // State setters for standalone mode
  setManifest: (manifest: any) => void;
  setConfig: (config: any) => void;
  setModules: (modules: any[]) => void;
  // Multiple Collections Support
  collections: StandaloneCollection[];
  setCollections: (collections: StandaloneCollection[]) => void;
  addCollection: (collection: StandaloneCollection) => void;
  updateCollection: (id: string, updates: Partial<StandaloneCollection>) => void;
  removeCollection: (id: string) => void;
  clearAllCollections: () => Promise<void>;
  // History Support
  recentCollections: HistoryItem[];
  addCollectionToHistory: (name: string, content: any) => Promise<void>;
  removeCollectionFromHistory: (id: string) => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);



export const ProjectProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [manifest, setManifest] = useState<any>(null);
  const [modules, setModules] = useState<any[]>([]);
  const [config, setConfig] = useState<any>(null);
  const [projectPath, setProjectPath] = useState<string>("");
  const [apiServicesDir, setApiServicesDir] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
      setProjectPath("");
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
    isLoading: isLoadingStandalone
  } = useStandaloneCollections(isStandaloneMode);

  // Recent History Management via TanStack Query
  const {
    recentCollections,
    addCollectionToHistory,
    removeCollectionFromHistory
  } = useRecentCollections();


  // Computed merged manifest
  const mergedManifest = React.useMemo(() => {
    if (!isStandaloneMode) return manifest;
    // Merge logic
    const merged: any = {};
    const sourceCollections = isStandaloneMode ? standaloneCollections : collections;

    sourceCollections.forEach(col => {
      if (!col.manifest) {
        return;
      }
      Object.keys(col.manifest).forEach(moduleName => {
        // Namespace: col_{id}__{moduleName}
        const newKey = `col_${col.id}__${moduleName}`;
        merged[newKey] = col.manifest[moduleName];
      });
    });
    return merged;
  }, [manifest, collections, standaloneCollections, isStandaloneMode]);



  // Wrappers to match Context Interface signatures
  const addHistoryWrapper = async (name: string, content: any) => {
    await addCollectionToHistory({ name, content });
  };

  const removeHistoryWrapper = async (id: string) => {
    await removeCollectionFromHistory(id);
  };

  const fetchProjectData = async (silent = false, ignoreManual = false) => {
    // If manual mode is ON and we are not ignoring it (e.g. initial load), force standalone
    if (manualStandaloneMode && !ignoreManual) {
      setIsStandaloneMode(true);
      setLoading(false);
      return;
    }
    try {
      if (!silent) setLoading(true);
      // Fetch Config from Bridge (Source of Truth for Target Dir)
      const bridgeStatus = await api.fetchBridgeStatus();
      const realTargetDir = bridgeStatus?.targetDir;
      const bridgeApiServicesDir = bridgeStatus?.apiServicesDir || "";

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
      setIsStandaloneMode(false);
      setProjectPath(realTargetDir);
      setApiServicesDir(bridgeApiServicesDir);

      // Fetch Data from Bridge directly
      const bridgeUrl = api.getBridgeUrl();
      const [manifestData, modulesData, configData] = await Promise.all([
        api.fetchProjectManifest(bridgeUrl),
        api.fetchProjectModules(bridgeUrl),
        api.fetchProjectConfig(bridgeUrl)
      ]);
      setManifest(manifestData);
      setModules(modulesData);

      // Restore persisted auth settings from localStorage (project mode only)
      let finalConfig = configData;
      if (typeof window !== 'undefined') {
        const savedAuth = localStorage.getItem('reex_project_auth');
        if (savedAuth) {
          try {
            const auth = JSON.parse(savedAuth);
            if (auth.token || (auth.customHeaders && Object.keys(auth.customHeaders).length > 0)) {
              finalConfig = { ...configData, auth };
            }
          } catch { /* ignore parse errors */ }
        }
      }
      setConfig(finalConfig);

      setError(null);
    } catch (err: any) {
      console.error("Failed to load project:", err);
      // On error, also enter standalone mode
      setIsStandaloneMode(true);
      setCollections([]);
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectData();
  }, [manualStandaloneMode]); // Re-run when manual mode changes

  // No local storage persistence

  const addCollection = async (col: StandaloneCollection) => {
    // DB Sync - Hook handles cache update via onSuccess
    try {
      await createStandaloneCollection(col);
    } catch (e) {
      console.error("DB Create Exception", e);
    }
  };

  const updateCollection = async (id: string, updates: Partial<StandaloneCollection>) => {
    if (isStandaloneMode) {
      try {
        await updateStandaloneCollection({ id, updates });
      } catch (e) {
        console.error("Failed to update collection", e);
      }
    } else {
      setCollections(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    }
  };

  const removeCollection = async (id: string) => {
    if (isStandaloneMode) {
      try {
        await deleteStandaloneCollection(id);
      } catch (e) {
        console.error("Failed to delete collection", e);
      }
    } else {
      setCollections(prev => prev.filter(c => c.id !== id));
    }
  };

  const clearAllCollections = async () => {
    if (isStandaloneMode) {
      try {
        await clearAllStandaloneCollections();
      } catch (e) {
        console.error("Failed to clear collections", e);
      }
    } else {
      setCollections([]);
    }
  };

  return (
    <ProjectContext.Provider value={{
      manifest: isStandaloneMode ? mergedManifest : manifest,
      modules,
      config,
      projectPath,
      apiServicesDir,
      loading: isStandaloneMode ? isLoadingStandalone : loading, // Use standalone loading when appropriate
      error,
      isStandaloneMode,
      manualStandaloneMode,
      toggleStandaloneMode,
      refreshProject: fetchProjectData,
      setManifest,
      setConfig,
      setModules,
      collections: isStandaloneMode ? standaloneCollections : collections,
      setCollections,
      addCollection,
      updateCollection,
      removeCollection,
      clearAllCollections, // Expose
      recentCollections,
      addCollectionToHistory: addHistoryWrapper,
      removeCollectionFromHistory: removeHistoryWrapper
    }}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};
