
"use client";

import React, { useState, useMemo } from "react";
import Sidebar from "./Sidebar";
import { EndpointInfo, Methods } from "@/types";

interface SidebarControllerProps {
    apiManifest: any;
    selectedEndpoint: EndpointInfo | null;
    onSelectEndpoint: (endpoint: EndpointInfo) => void;
    onDeleteModule: (moduleName: string) => void;
    onDeleteFunction: (moduleName: string, functionName: string) => void;
}

type ApiKey = string;

const SidebarController: React.FC<SidebarControllerProps> = ({
    apiManifest,
    selectedEndpoint,
    onSelectEndpoint,
    onDeleteModule,
    onDeleteFunction
}) => {
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
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
                });
            }
        }
        return result;
    }, [apiManifest, methodFilter]);

    const groupedEndpoints = useMemo(() => {
        return endpoints.reduce((acc, endpoint) => {
            if (!acc[endpoint.apiKey]) {
                acc[endpoint.apiKey] = [];
            }
            acc[endpoint.apiKey].push(endpoint);
            return acc;
        }, {} as Record<string, EndpointInfo[]>);
    }, [endpoints]);

    return (
        <Sidebar
            groupedEndpoints={groupedEndpoints}
            expandedFolders={expandedFolders}
            selectedEndpoint={selectedEndpoint}
            methodFilter={methodFilter}
            onToggleFolder={toggleFolder}
            onSelectEndpoint={onSelectEndpoint}
            setMethodFilter={setMethodFilter}
            onDeleteModule={onDeleteModule}
            onDeleteFunction={onDeleteFunction}
        />
    );
};

export default SidebarController;
