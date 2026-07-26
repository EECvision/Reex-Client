"use client";

import React, { useState, useMemo, useEffect } from "react";
import Sidebar from "./Sidebar";
import { EndpointInfo, Methods } from "@/types";
import { useProject } from "@/providers/ProjectContext";
import { ResizablePanel } from "@/components/ui/ResizablePanel";
import styles from "./Sidebar.module.css";

interface SidebarControllerProps {
  apiManifest: any;
  selectedEndpoint: EndpointInfo | null;
  onSelectEndpoint: (endpoint: EndpointInfo) => void;
  onDeleteModule: (moduleName: string) => void;
  onDeleteFunction: (moduleName: string, functionName: string) => void;
  onDeleteCollection: (id: string) => void;
  onRenameCollection?: (id: string, newName: string) => void;
  onDownloadCollection?: (id: string) => void;
  onUpdateCollection?: (id: string) => void;
  onOpenSandbox?: (id: string) => void;
  isOpen?: boolean;
  onToggleSidebar?: () => void;
  onDoubleClickEndpoint?: (endpoint: EndpointInfo) => void;
}

type ApiKey = string;

const SidebarController: React.FC<SidebarControllerProps> = ({
  apiManifest,
  selectedEndpoint,
  onSelectEndpoint,
  onDeleteModule,
  onDeleteFunction,
  onDeleteCollection,
  onRenameCollection,
  onDownloadCollection,
  onUpdateCollection,
  onOpenSandbox,
  isOpen = false,
  onToggleSidebar,
  onDoubleClickEndpoint,
}) => {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(),
  );
  const [methodFilter, setMethodFilter] = useState<Methods>("ALL");

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

  useEffect(() => {
    if (selectedEndpoint) {
      setExpandedFolders((prev) => {
        if (!prev.has(selectedEndpoint.apiKey)) {
          const newSet = new Set(prev);
          newSet.add(selectedEndpoint.apiKey);
          return newSet;
        }
        return prev;
      });
    }
  }, [selectedEndpoint]);

  const endpoints = useMemo(() => {
    if (!apiManifest) return [];
    const result: EndpointInfo[] = [];

    for (const apiKey in apiManifest) {
      const detailedMod = apiManifest[apiKey] || {};
      const fnNames = Object.keys(detailedMod);

      for (const fnName of fnNames) {
        const methodDef = detailedMod[fnName];
        if (!methodDef || !methodDef.args) continue;

        const methodPrefix = fnName.split("_")[0].toUpperCase();
        if (methodFilter !== "ALL" && methodPrefix !== methodFilter) continue;

        result.push({
          apiKey: apiKey as ApiKey,
          fnName: fnName,
          args: methodDef.args || [],
          url: methodDef.url,
          method: methodDef.method,
          requiresAuth: methodDef.requiresAuth,
          contentType: methodDef.contentType,
          description: methodDef.description,
        });
      }
    }
    return result;
  }, [apiManifest, methodFilter]);

  const groupedEndpoints = useMemo(() => {
    return endpoints.reduce(
      (acc, endpoint) => {
        if (!acc[endpoint.apiKey]) {
          acc[endpoint.apiKey] = [];
        }
        acc[endpoint.apiKey].push(endpoint);
        return acc;
      },
      {} as Record<string, EndpointInfo[]>,
    );
  }, [endpoints]);

  const { isStandaloneMode, config, collections } = useProject();

  const collectionGroups = useMemo(() => {
    const groups: Record<
      string,
      { id: string; name: string; modules: Record<string, EndpointInfo[]> }
    > = {};

    // Initialize collections
    if (isStandaloneMode && collections.length > 0) {
      collections.forEach((c) => {
        groups[c.id] = { id: c.id, name: c.name, modules: {} };
      });
    } else {
      // Default/Bridge mode
      groups["default"] = {
        id: "default",
        name: config?.collectionName || "Collection",
        modules: {},
      };
    }

    endpoints.forEach((ep) => {
      let colId = "default";
      let modName = ep.apiKey;

      if (ep.apiKey.startsWith("col_")) {
        const parts = ep.apiKey.split("__");
        if (parts.length > 1) {
          colId = parts[0].replace("col_", "");
          modName = parts[1];
        }
      }

      // If collection exists (it should), add module
      if (groups[colId]) {
        if (!groups[colId].modules[modName]) {
          groups[colId].modules[modName] = [];
        }
        groups[colId].modules[modName].push(ep);
      } else if (isStandaloneMode) {
        console.warn(
          `[SidebarController] Endpoint dropped! Groups missing ID: ${colId}. Keys: ${Object.keys(groups).join(", ")}`,
        );
      } else {
        // Fallback for non-standalone if something weird happens, mostly 'default'

        if (!groups["default"].modules[modName]) {
          groups["default"].modules[modName] = [];
        }
        groups["default"].modules[modName].push(ep);
      }
    });

    return Object.values(groups);
  }, [endpoints, isStandaloneMode, collections, config]);

  return (
    <ResizablePanel
      isOpen={isOpen}
      defaultWidth={320}
      minWidth={280}
      maxWidth={600}
      collapsedWidth={60}
      className={styles.sidebarWrapper}
    >
      <Sidebar
        groupedEndpoints={{}} // Deprecated/Unused if collectionGroups provided
        collectionGroups={collectionGroups}
        expandedFolders={expandedFolders}
        selectedEndpoint={selectedEndpoint}
        methodFilter={methodFilter}
        onToggleFolder={toggleFolder}
        onSelectEndpoint={onSelectEndpoint}
        setMethodFilter={setMethodFilter}
        onDeleteModule={isStandaloneMode ? undefined : onDeleteModule}
        onDeleteFunction={isStandaloneMode ? undefined : onDeleteFunction}
        onDeleteCollection={onDeleteCollection}
        onRenameCollection={isStandaloneMode ? onRenameCollection : undefined}
        onDownloadCollection={onDownloadCollection}
        onUpdateCollection={isStandaloneMode ? onUpdateCollection : undefined}
        onOpenSandbox={isStandaloneMode ? onOpenSandbox : undefined}
        baseURL={config?.baseURL}
        collectionName={config?.collectionName}
        isOpen={isOpen}
        onToggleSidebar={onToggleSidebar}
        onDoubleClickEndpoint={onDoubleClickEndpoint}
      />
    </ResizablePanel>
  );
};

export default SidebarController;
