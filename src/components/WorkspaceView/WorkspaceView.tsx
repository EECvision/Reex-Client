import React from "react";
// dynamic removed
// Button removed
import QuerySection from "../QuerySection/QuerySection";
import ResultSection from "../ResultSection/ResultSection";
import EmptyState from "../EmptyState/EmptyState";
import styles from "./WorkspaceView.module.css";
import { EndpointInfo } from "@/types";
import { BadgeGroup } from "../ui/BadgeGroup/BadgeGroup";
import { Lock } from "lucide-react";
import CurlSection from "../CurlSection/CurlSection";
import { useAuth } from "@/providers/AuthContext";
import LoginModal from "../LoginModal/LoginModal";
import { HistoryItem } from "@/providers/ProjectContext";

// Dynamic import for Monaco
// Monaco definition removed

type InputMode = "form" | "raw";

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
    // Raw payload mode
    rawPayload?: string;
    inputMode?: InputMode;
    onRawPayloadChange?: (value: string) => void;
    onInputModeChange?: (mode: InputMode) => void;
    generatedCurl?: string;
    isStandaloneMode?: boolean;
    recentCollections?: HistoryItem[];
    onHistoryClick?: (item: HistoryItem) => void;
    onHistoryDelete?: (id: string) => void;
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
    method,
    rawPayload,
    inputMode,
    onRawPayloadChange,
    onInputModeChange,
    generatedCurl,
    isStandaloneMode,
    recentCollections,
    onHistoryClick,
    onHistoryDelete
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

    const { isAuthenticated } = useAuth();
    const [showLogin, setShowLogin] = React.useState(false);

    const handleExecute = () => {
        if (!isAuthenticated) {
            setShowLogin(true);
            return;
        }
        onSubmit();
    };

    return (
        <div className={styles.workspace}>
            {selectedEndpoint ? (
                <>
                    <div style={{ padding: '1rem', height: '100%', overflowY: 'auto' }}>
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
                                    <span style={{ marginLeft: 4 }}>Auth Required</span>
                                </div>
                            )}
                        </div>
                        <br />
                        <QuerySection
                            selectedEndpoint={selectedEndpoint}
                            currentParams={currentParams}
                            onParamChange={onParamChange}
                            onSubmit={handleExecute}
                            loading={loading}
                            isSubmitDisabled={isSubmitDisabled}
                            rawPayload={rawPayload}
                            inputMode={inputMode}
                            onRawPayloadChange={onRawPayloadChange}
                            onInputModeChange={onInputModeChange}
                        />

                        {isStandaloneMode && generatedCurl && (
                            <div>
                                <CurlSection curlCommand={generatedCurl} />
                            </div>
                        )}

                        <ResultSection
                            result={result}
                            error={error}
                            interfacePreview={interfacePreview}
                            updatingInterface={updatingInterface}
                            onUpdateInterface={onUpdateInterface}
                            onCopy={onCopy}
                            copied={copied}
                            isStandaloneMode={isStandaloneMode}
                        />
                    </div>
                </>
            ) : (
                <EmptyState
                    hasEndpoints={hasCollection}
                    onImportClick={onImport || (() => { })}
                    onGenerateClick={isStandaloneMode ? undefined : onGenerate}
                    recentCollections={recentCollections}
                    onHistoryClick={onHistoryClick}
                    onHistoryDelete={onHistoryDelete}
                />
            )}

            <LoginModal
                isOpen={showLogin}
                onClose={() => setShowLogin(false)}
                message="You must be signed in to execute requests."
            />
        </div>
    );
};

export default WorkspaceView;
