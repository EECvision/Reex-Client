
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

            // Fetch Data from Cloud, passing the REQUIRED targetDir
            const [manifestData, modulesData, configData] = await Promise.all([
                api.fetchProjectManifest(realTargetDir),
                api.fetchProjectModules(realTargetDir),
                api.fetchProjectConfig(realTargetDir)
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

        // Setup SSE for real-time updates
        const eventSource = api.getEventSource();
        let debounceTimer: NodeJS.Timeout;

        eventSource.onopen = () => {
            console.log("SSE Connected");
        };

        const handleUpdate = (event: MessageEvent) => {
            const data = JSON.parse(event.data);
            if (data.type === 'project:updated') {
                console.log("Project updated, scheduling refresh...");
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    console.log("Debounce complete, refreshing project...");
                    fetchProjectData(true); // Silent refresh
                }, 500);
            }
        };

        eventSource.addEventListener('message', handleUpdate);

        return () => {
            eventSource.removeEventListener('message', handleUpdate);
            eventSource.close();
            clearTimeout(debounceTimer);
        };
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
