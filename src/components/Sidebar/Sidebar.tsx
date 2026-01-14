import React, { SetStateAction } from "react";
import styles from "./Sidebar.module.css";
import { EndpointInfo, Methods } from "@/types";
import { Folder, Trash2, ChevronRight, ChevronDown } from "lucide-react";
import { Button } from "../ui/Button/Button";
import { Select } from "../ui/Select/Select";

const METHOD_OPTIONS = [
  { value: "ALL", label: "ALL METHODS" },
  { value: "GET", label: "GET" },
  { value: "POST", label: "POST" },
  { value: "PUT", label: "PUT" },
  { value: "DELETE", label: "DELETE" },
  { value: "PATCH", label: "PATCH" },
];

interface SidebarProps {
  groupedEndpoints: Record<string, EndpointInfo[]>;
  expandedFolders: Set<string>;
  selectedEndpoint: EndpointInfo | null;
  methodFilter: Methods;
  onToggleFolder: (apiKey: string) => void;
  onSelectEndpoint: (endpoint: EndpointInfo) => void;
  setMethodFilter: React.Dispatch<SetStateAction<Methods>>;
  onDeleteModule?: (moduleName: string) => void;
  onDeleteFunction?: (moduleName: string, functionName: string) => void;
  baseURL?: string;
}

const Sidebar: React.FC<SidebarProps> = ({
  groupedEndpoints,
  expandedFolders,
  selectedEndpoint,
  methodFilter,
  setMethodFilter,
  onToggleFolder,
  onSelectEndpoint,
  onDeleteModule,
  onDeleteFunction,
  baseURL,
}) => {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.header}>
        <div className={styles.brand}>
          <div className={styles.logoIcon}>
            <div className={styles.logoInner}></div>
          </div>
          <span className={styles.brandName}>Reex<span className={styles.brandAccent}>API</span></span>
        </div>
      </div>

      <div className={styles.filterSection}>
        <div className={styles.selectWrapper}>
          <Select
            options={METHOD_OPTIONS}
            value={methodFilter}
            onChange={(value) => setMethodFilter(value as Methods)}
            className={styles.sidebarSelect}
          />
        </div>
      </div>

      <div className={styles.folderList}>
        {Object.entries(groupedEndpoints).map(([apiKey, endpoints]) => (
          <div key={apiKey} className={styles.folder}>
            <div
              className={styles.folderHeader}
              onClick={() => onToggleFolder(apiKey)}
            >
              <div className={styles.folderIconWrapper}>
                {expandedFolders.has(apiKey) ?
                  <ChevronDown size={14} color="#6b7280" /> :
                  <ChevronRight size={14} color="#6b7280" />
                }
              </div>
              <div className={styles.folderContent}>
                <Folder size={14} className={styles.folderIcon} fill={expandedFolders.has(apiKey) ? "#EBF5FF" : "none"} color={expandedFolders.has(apiKey) ? "#3b82f6" : "#6b7280"} />
                <span className={styles.folderName} style={{ fontWeight: expandedFolders.has(apiKey) ? 600 : 500, color: expandedFolders.has(apiKey) ? "#1f2937" : "#374151" }}>{apiKey}</span>
                <span className={styles.folderCount}>{endpoints.length}</span>
              </div>

              {onDeleteModule && (
                <Button
                  className={styles.deleteBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteModule(apiKey);
                  }}
                  title={`Delete ${apiKey} module`}
                  variant="ghost"
                  size="sm"
                >
                  <Trash2 size={12} />
                </Button>
              )}
            </div>
            {expandedFolders.has(apiKey) && (
              <div className={styles.fileList}>
                {endpoints.map((endpoint) => (
                  <div
                    key={endpoint.fnName}
                    className={`${styles.file} ${selectedEndpoint?.apiKey === endpoint.apiKey &&
                      selectedEndpoint?.fnName === endpoint.fnName
                      ? styles.fileActive
                      : ""
                      }`}
                  >
                    <div
                      className={styles.fileInfo}
                      onClick={() => onSelectEndpoint(endpoint)}
                    >
                      <span className={`${styles.methodDot} ${styles[endpoint.fnName.split('_')[0].toLowerCase()] || styles.defaultMethod}`}></span>
                      <span className={styles.fileName}>{endpoint.fnName}</span>
                    </div>
                    {onDeleteFunction && (
                      <Button
                        className={styles.deleteBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteFunction(apiKey, endpoint.fnName);
                        }}
                        title={`Delete ${endpoint.fnName}`}
                        variant="ghost"
                        size="sm"
                      >
                        <Trash2 size={12} />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {baseURL && (
        <div className={styles.footer}>
          <span className={styles.footerLabel}>Base:</span>
          <span className={styles.footerUrl} title={baseURL}>{baseURL}</span>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;

