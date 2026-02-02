
"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api } from '../services/api';

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
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [manifest, setManifest] = useState<any>(null);
  const [modules, setModules] = useState<any[]>([]);
  const [config, setConfig] = useState<any>(null);
  const [projectPath, setProjectPath] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStandaloneMode, setIsStandaloneMode] = useState(false);

  const fetchProjectData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      // Fetch Config from Bridge (Source of Truth for Target Dir)
      const bridgeStatus = await api.fetchBridgeStatus();
      const realTargetDir = bridgeStatus?.targetDir;

      if (!realTargetDir) {
        // No bridge connected - enter standalone mode instead of erroring
        console.info("[ProjectContext] Bridge not connected, entering standalone mode");
        setIsStandaloneMode(true);
        setManifest({});
        setModules([]);
        setConfig({ baseURL: "" });
        setProjectPath("");
        setError(null);
        return;
      }

      // Bridge is connected - exit standalone mode
      setIsStandaloneMode(false);
      setProjectPath(realTargetDir);

      // Bridge is Active
      const bridgeUrl = api.getBridgeUrl();

      // Fetch Data from Bridge directly
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
      setManifest({});
      setModules([]);
      setConfig({ baseURL: "" });
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectData();
  }, []);

  return (
    <ProjectContext.Provider value={{
      manifest,
      modules,
      config,
      projectPath,
      loading,
      error,
      isStandaloneMode,
      refreshProject: fetchProjectData,
      setManifest,
      setConfig,
      setModules
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
