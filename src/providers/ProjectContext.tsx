
"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api } from '../services/api';

export interface StandaloneCollection {
  id: string;
  name: string;
  manifest: any;
  modules: any[];
  config: any;
}

interface ProjectContextType {
  manifest: any;
  modules: any[];
  config: any;
  projectPath: string;
  loading: boolean;
  error: string | null;
  isStandaloneMode: boolean;
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
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

const STANDALONE_STORAGE_KEY = "api_builder_standalone_data";

export const ProjectProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [manifest, setManifest] = useState<any>(null);
  const [modules, setModules] = useState<any[]>([]);
  const [config, setConfig] = useState<any>(null);
  const [projectPath, setProjectPath] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStandaloneMode, setIsStandaloneMode] = useState(false);

  const [collections, setCollections] = useState<StandaloneCollection[]>([]);

  // Computed merged manifest
  const mergedManifest = React.useMemo(() => {
    if (!isStandaloneMode) return manifest;
    // Merge logic
    const merged: any = {};
    collections.forEach(col => {
      if (!col.manifest) return;
      Object.keys(col.manifest).forEach(moduleName => {
        // Namespace: col_{id}__{moduleName}
        const newKey = `col_${col.id}__${moduleName}`;
        merged[newKey] = col.manifest[moduleName];
      });
    });
    return merged;
  }, [manifest, collections, isStandaloneMode]);

  const fetchProjectData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      // Fetch Config from Bridge (Source of Truth for Target Dir)
      const bridgeStatus = await api.fetchBridgeStatus();
      const realTargetDir = bridgeStatus?.targetDir;

      if (!realTargetDir) {
        // No bridge connected - enter standalone mode
        console.info("[ProjectContext] Bridge not connected, entering standalone mode");
        setIsStandaloneMode(true);

        // Try to load from local storage
        try {
          const stored = localStorage.getItem(STANDALONE_STORAGE_KEY);
          if (stored) {
            const parsed = JSON.parse(stored);

            // Check if it's new list format or old single object format
            if (Array.isArray(parsed.collections)) {
              setCollections(parsed.collections);
            } else if (parsed.manifest) {
              // Migration: Wrap old data
              const defaultCol: StandaloneCollection = {
                id: "default",
                name: parsed.config?.collectionName || "Default Collection",
                manifest: parsed.manifest,
                modules: parsed.modules || [],
                config: parsed.config || { baseURL: "" }
              };
              setCollections([defaultCol]);
            } else {
              setCollections([]);
            }
            console.log("[ProjectContext] Loaded standalone data");
          } else {
            setCollections([]);
          }
        } catch (e) {
          console.error("Failed to load standalone data", e);
          setCollections([]);
        }

        setProjectPath("");
        setError(null);
        return;
      }

      // Bridge is connected
      setIsStandaloneMode(false);
      setProjectPath(realTargetDir);

      // Fetch Data from Bridge directly
      const bridgeUrl = api.getBridgeUrl();
      const [manifestData, modulesData, configData] = await Promise.all([
        api.fetchProjectManifest(bridgeUrl),
        api.fetchProjectModules(bridgeUrl),
        api.fetchProjectConfig(bridgeUrl)
      ]);
      setManifest(manifestData);
      setModules(modulesData);
      setConfig(configData);

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
  }, []);

  // Persist standalone data
  useEffect(() => {
    if (isStandaloneMode) {
      try {
        const data = {
          collections
        };
        localStorage.setItem(STANDALONE_STORAGE_KEY, JSON.stringify(data));
      } catch (e) {
        console.error("Failed to save standalone data", e);
      }
    }
  }, [collections, isStandaloneMode]);

  const addCollection = (col: StandaloneCollection) => {
    setCollections(prev => [...prev, col]);
  };

  const updateCollection = (id: string, updates: Partial<StandaloneCollection>) => {
    setCollections(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const removeCollection = (id: string) => {
    setCollections(prev => prev.filter(c => c.id !== id));
  };

  return (
    <ProjectContext.Provider value={{
      manifest: isStandaloneMode ? mergedManifest : manifest,
      modules,
      config,
      projectPath,
      loading,
      error,
      isStandaloneMode,
      refreshProject: fetchProjectData,
      setManifest,
      setConfig,
      setModules,
      collections,
      setCollections,
      addCollection,
      updateCollection,
      removeCollection
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
