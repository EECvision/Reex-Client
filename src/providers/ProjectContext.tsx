
"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api } from '../services/api';

interface ProjectContextType {
  manifest: any;
  modules: any[];
  config: any; // New field
  projectPath: string;
  loading: boolean;
  error: string | null;
  refreshProject: (silent?: boolean) => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [manifest, setManifest] = useState<any>(null);
  const [modules, setModules] = useState<any[]>([]);
  const [config, setConfig] = useState<any>(null); // New state
  const [projectPath, setProjectPath] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjectData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      // Fetch Config from Bridge (Source of Truth for Target Dir)
      const bridgeStatus = await api.fetchBridgeStatus();
      const realTargetDir = bridgeStatus?.targetDir;

      if (!realTargetDir) {
        const errorMsg = "CRITICAL: CLI Bridge not connected. Cannot determine Target Directory. Please ensure the CLI is running.";
        setError(errorMsg);
        console.error(errorMsg);
        return; // HALT. Do not proceed to fetch manifest.
      }

      setProjectPath(realTargetDir);

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
      setError(err.message || "Failed to load project configuration");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectData();
  }, []);

  return (
    <ProjectContext.Provider value={{ manifest, modules, config, projectPath, loading, error, refreshProject: fetchProjectData }}>
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
