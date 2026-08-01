import React from "react";
// dynamic removed
// Button removed
import QuerySection from "../QuerySection/QuerySection";
import ResultSection from "../ResultSection/ResultSection";
import EmptyState from "../EmptyState/EmptyState";
import styles from "./WorkspaceView.module.css";
import { EndpointInfo } from "@/types";
import { BadgeGroup } from "../ui/BadgeGroup/BadgeGroup";
import { Lock, Info } from "lucide-react";
import CurlSection from "../CurlSection/CurlSection";
import { useAuth } from "@/providers/AuthContext";
import LoginModal from "../LoginModal/LoginModal";
import { HistoryItem } from "@/providers/ProjectContext";
import LocalhostBanner from "../LocalhostBanner/LocalhostBanner";
import { isLocalhostUrl } from "@/lib/urlUtils";
import WelcomeSlideIn from "../WelcomeSlideIn/WelcomeSlideIn";
import SetupGuideModal from "../SetupGuideModal/SetupGuideModal";
import TabBar from "../TabBar/TabBar";

// Dynamic import for Monaco
// Monaco definition removed

type InputMode = "form" | "raw";

interface Tab {
  endpoint: EndpointInfo;
  isPinned: boolean;
}

interface WorkspaceViewProps {
  selectedEndpoint: EndpointInfo | null;
  currentParams: Record<string, any>;
  onParamChange: (paramName: string, value: any, type?: string) => void;
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
  tabs?: Tab[];
  activeTabIndex?: number;
  onSelectTab?: (index: number) => void;
  onCloseTab?: (index: number) => void;
  onCloseAllTabs?: () => void;
  onCloseOthers?: (index: number) => void;
  onCloseToRight?: (index: number) => void;
  onPinTab?: (index: number) => void;
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
  onHistoryDelete,
  tabs = [],
  activeTabIndex = -1,
  onSelectTab,
  onCloseTab,
  onCloseAllTabs,
  onCloseOthers,
  onCloseToRight,
  onPinTab,
}) => {
  const getMethodColor = (m?: string) => {
    if (m === "BASE") return "#6b7280";
    switch (m?.toUpperCase()) {
      case "GET":
        return "#3b82f6";
      case "POST":
        return "#10b981";
      case "PUT":
        return "#f59e0b";
      case "DELETE":
        return "#ef4444";
      case "PATCH":
        return "#8b5cf6";
      default:
        return "#6b7280";
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
      {tabs.length > 0 && onSelectTab && onCloseTab && onPinTab && (
        <TabBar
          tabs={tabs}
          activeTabIndex={activeTabIndex}
          onSelectTab={onSelectTab}
          onCloseTab={onCloseTab}
          onCloseAllTabs={onCloseAllTabs}
          onCloseOthers={onCloseOthers}
          onCloseToRight={onCloseToRight}
          onPinTab={onPinTab}
        />
      )}
      {selectedEndpoint ? (
        <>
          <div
            style={{
              padding: "1rem 1.5rem 4rem 1.5rem",
              height: "100%",
              overflowY: "auto",
            }}
          >
            <div className={styles.badgeRow}>
              <BadgeGroup
                label={method || ""}
                value={computedUrl || ""}
                color={methodColor}
                style={{ height: "32px" }}
              />
              {selectedEndpoint.requiresAuth && (
                <div
                  className={styles.authRequired}
                  title="Requires Authentication"
                >
                  <Lock size={16} />
                  <span style={{ marginLeft: 4 }}>Auth Required</span>
                </div>
              )}
            </div>
            {selectedEndpoint.description && (
              <>
                <br />
                <p className={styles.endpointDescription}>
                  {selectedEndpoint.description}
                </p>
                <br />
              </>
            )}
            {/* Localhost Info Banner */}
            {isLocalhostUrl(computedUrl || "") && (
              <>
                <LocalhostBanner className={styles.localhostBannerMargin} />
                <br />
              </>
            )}
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

            {generatedCurl && (
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
          onImportClick={onImport || (() => {})}
          onGenerateClick={isStandaloneMode ? undefined : onGenerate}
          recentCollections={recentCollections}
          onHistoryClick={onHistoryClick}
          onHistoryDelete={onHistoryDelete}
        />
      )}

      {hasCollection && isStandaloneMode && <WelcomeSlideIn />}
      {!isStandaloneMode && <SetupGuideModal />}

      <LoginModal
        isOpen={showLogin}
        onClose={() => setShowLogin(false)}
        message="You must be signed in to execute requests."
      />
    </div>
  );
};

export default WorkspaceView;
