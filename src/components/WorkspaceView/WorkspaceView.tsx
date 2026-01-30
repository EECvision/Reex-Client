import React from "react";
import QuerySection from "../QuerySection/QuerySection";
import ResultSection from "../ResultSection/ResultSection";
import EmptyState from "../EmptyState/EmptyState";
import styles from "./WorkspaceView.module.css";
import { EndpointInfo } from "@/types";
import { BadgeGroup } from "../ui/BadgeGroup/BadgeGroup";
import { Lock } from "lucide-react";

interface WorkspaceViewProps {
    selectedEndpoint: EndpointInfo | null;
    currentParams: Record<string, any>;
    onParamChange: (paramName: string, value: string) => void;
    onSubmit: () => void;
    loading: boolean;
    isSubmitDisabled: boolean;
    result: any;
    error: string | null;
    interfacePreview: string | null;
    updatingInterface: boolean;
    onUpdateInterface: () => void;
    onCopy: () => void;
    copied: boolean;
    hasCollection?: boolean;
    onImport?: () => void;
    onGenerate?: () => void;
    computedUrl?: string;
    method?: string;
}

const WorkspaceView: React.FC<WorkspaceViewProps> = ({
    selectedEndpoint,
    currentParams,
    onParamChange,
    onSubmit,
    loading,
    isSubmitDisabled,
    result,
    error,
    interfacePreview,
    updatingInterface,
    onUpdateInterface,
    onCopy,
    copied,
    hasCollection = true,
    onImport,
    onGenerate,
    computedUrl,
    method
}) => {

    const getMethodColor = (m?: string) => {
        if (m === "BASE") return "#6b7280";
        switch (m?.toUpperCase()) {
            case "GET": return "#3b82f6";
            case "POST": return "#10b981";
            case "PUT": return "#f59e0b";
            case "DELETE": return "#ef4444";
            case "PATCH": return "#8b5cf6";
            default: return "#6b7280";
        }
    };

    const methodColor = getMethodColor(method);

    return (
        <div className={styles.workspace}>
            {selectedEndpoint ? (
                <>
                    <div className={styles.badgeRow}>
                        <BadgeGroup
                            label={method || ""}
                            value={computedUrl || ""}
                            color={methodColor}
                            style={{ height: '32px' }}
                        />
                        {selectedEndpoint.requiresAuth && (
                            <div className={styles.authRequired} title="Requires Authentication">
                                <Lock size={16} />
                                <span>Auth Required</span>
                            </div>
                        )}
                    </div>
                    <QuerySection
                        selectedEndpoint={selectedEndpoint}
                        currentParams={currentParams}
                        onParamChange={onParamChange}
                        onSubmit={onSubmit}
                        loading={loading}
                        isSubmitDisabled={isSubmitDisabled}
                    />
                    <ResultSection
                        result={result}
                        error={error}
                        interfacePreview={interfacePreview}
                        updatingInterface={updatingInterface}
                        onUpdateInterface={onUpdateInterface}
                        onCopy={onCopy}
                        copied={copied}
                    />
                </>
            ) : (
                <EmptyState
                    hasEndpoints={hasCollection}
                    onImportClick={onImport || (() => { })}
                    onGenerateClick={onGenerate}
                />
            )}
        </div>
    );
};

export default WorkspaceView;
