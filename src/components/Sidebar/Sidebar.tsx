import React, { SetStateAction } from "react";
import styles from "./Sidebar.module.css";
import { EndpointInfo, Methods } from "@/types";
import { Folder, Trash2, ChevronRight, ChevronDown, Lock } from "lucide-react";
import { Button } from "../ui/Button/Button";
import { Select } from "../ui/Select/Select";
import Logo from "../Logo/Logo";
import SidebarSettings from "../SidebarSettings/SidebarSettings";

const METHOD_OPTIONS = [
  { value: "ALL", label: "ALL METHODS" },
  { value: "GET", label: "GET" },
  { value: "POST", label: "POST" },
  { value: "PUT", label: "PUT" },
  { value: "DELETE", label: "DELETE" },
  { value: "PATCH", label: "PATCH" },
];

export interface CollectionGroup {
  id: string;
  name: string;
  modules: Record<string, EndpointInfo[]>;
}

interface SidebarProps {
  groupedEndpoints: Record<string, EndpointInfo[]>; // Legacy check
  collectionGroups?: CollectionGroup[];
  expandedFolders: Set<string>;
  selectedEndpoint: EndpointInfo | null;
  methodFilter: Methods;
  onToggleFolder: (apiKey: string) => void;
  onSelectEndpoint: (endpoint: EndpointInfo) => void;
  setMethodFilter: React.Dispatch<SetStateAction<Methods>>;
  onDeleteModule?: (moduleName: string) => void;
  onDeleteFunction?: (moduleName: string, functionName: string) => void;
  onDeleteCollection?: (id: string) => void;
  baseURL?: string;
  collectionName?: string;
}

const Sidebar: React.FC<SidebarProps> = ({
  groupedEndpoints,
  collectionGroups,
  expandedFolders,
  selectedEndpoint,
  methodFilter,
  setMethodFilter,
  onToggleFolder,
  onSelectEndpoint,
  onDeleteModule,
  onDeleteFunction,
  onDeleteCollection,
  baseURL,
  collectionName,
}) => {
  // Initialize expanded state for collections - default to ALL expanded
  const [expandedCollections, setExpandedCollections] = React.useState<Set<string>>(new Set());

  // Effect to default expand all when groups change (initial load)
  // Track previous groups to auto-expand ONLY new ones
  const prevGroupIdsRef = React.useRef<string[]>([]);

  React.useEffect(() => {
    if (!collectionGroups) return;

    const currentIds = collectionGroups.map(g => g.id);
    const prevIds = prevGroupIdsRef.current;

    const newIds = currentIds.filter(id => !prevIds.includes(id));
    const removedIds = prevIds.filter(id => !currentIds.includes(id));

    // Initial load: Expand all (if prev is empty and we have groups)
    if (prevIds.length === 0 && currentIds.length > 0) {
      setExpandedCollections(new Set(currentIds));
      prevGroupIdsRef.current = currentIds;
      return;
    }

    if (newIds.length > 0 || removedIds.length > 0) {
      setExpandedCollections(prev => {
        const next = new Set(prev);
        // Expand ONLY new collections
        newIds.forEach(id => next.add(id));
        // Cleanup removed collections
        removedIds.forEach(id => next.delete(id));
        return next;
      });
      prevGroupIdsRef.current = currentIds;
    }
  }, [collectionGroups]);

  const toggleCollection = (id: string) => {
    setExpandedCollections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  // Helper to get unique module ID (apiKey) from endpoints list
  const getModuleId = (endpoints: EndpointInfo[], fallbackName: string) => {
    if (endpoints.length > 0) return endpoints[0].apiKey;
    return fallbackName;
  };

  return (
    <aside className={styles.sidebar}>
      <div className={styles.header}>
        <div className={styles.brand}>
          <Logo />
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
        {collectionGroups ? (
          collectionGroups.map(group => {
            const isExpanded = expandedCollections.has(group.id);
            return (
              <div key={group.id} className={styles.collectionGroup}>
                {/* Root Folder (Collection) */}
                <div className={styles.folder} style={{ marginBottom: 2 }}>
                  <div
                    className={styles.folderHeader}
                    onClick={() => toggleCollection(group.id)}
                  >
                    <div className={styles.folderIconWrapper}>
                      {isExpanded ?
                        <ChevronDown size={14} color="#6b7280" /> :
                        <ChevronRight size={14} color="#6b7280" />
                      }
                    </div>
                    <div className={styles.folderContent}>
                      <Folder size={14} className={`${styles.folderIcon} ${isExpanded ? styles.folderIconExpanded : ''}`} />
                      <span className={`${styles.rootFolderName} ${isExpanded ? styles.rootFolderNameExpanded : ''}`} title={group.name}>{group.name}</span>
                    </div>

                    {/* Delete Collection Buttton */}
                    {onDeleteCollection && (
                      <Button
                        className={styles.deleteBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteCollection(group.id);
                        }}
                        title="Delete Collection"
                        variant="ghost"
                        size="sm"
                      >
                        <Trash2 size={12} color="#ef4444" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Modules List */}
                {isExpanded && (
                  <div style={{ paddingLeft: 12, marginTop: 8 }}>
                    {Object.entries(group.modules).map(([modKey, endpoints]) => {
                      // Use the actual unique apiKey from the first endpoint as the ID
                      const uniqueApiKey = getModuleId(endpoints, modKey);

                      return (
                        <div key={uniqueApiKey} className={styles.folder}>
                          <div
                            className={styles.folderHeader}
                            onClick={() => onToggleFolder(uniqueApiKey)}
                          >
                            <div className={styles.folderIconWrapper}>
                              {expandedFolders.has(uniqueApiKey) ?
                                <ChevronDown size={14} color="#6b7280" /> :
                                <ChevronRight size={14} color="#6b7280" />
                              }
                            </div>
                            <div className={styles.folderContent}>
                              <Folder size={14} className={`${styles.folderIcon} ${expandedFolders.has(uniqueApiKey) ? styles.folderIconExpanded : ''}`} />
                              <span className={`${styles.folderName} ${expandedFolders.has(uniqueApiKey) ? styles.folderNameExpanded : ''}`}>{modKey}</span>
                              <span className={styles.folderCount}>{endpoints.length}</span>
                            </div>

                            {onDeleteModule && (
                              <Button
                                className={styles.deleteBtn}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteModule(uniqueApiKey);
                                }}
                                title={`Delete module`}
                                variant="ghost"
                                size="sm"
                              >
                                <Trash2 size={12} color="#ef4444" />
                              </Button>
                            )}
                          </div>
                          {expandedFolders.has(uniqueApiKey) && (
                            <div className={styles.fileList}>
                              {endpoints.map((endpoint) => (
                                <div
                                  key={endpoint.fnName}
                                  className={`${styles.file} ${selectedEndpoint?.apiKey === endpoint.apiKey &&
                                    selectedEndpoint?.fnName === endpoint.fnName
                                    ? styles.fileActive
                                    : ""
                                    }`}
                                  onClick={() => onSelectEndpoint(endpoint)}
                                >
                                  <div
                                    className={styles.fileInfo}
                                    title={`${endpoint.fnName}${endpoint.url ? `\n${endpoint.url}` : ""}`}
                                  >
                                    <span className={`${styles.methodDot} ${styles[endpoint.fnName.split('_')[0].toLowerCase()] || styles.defaultMethod}`}></span>
                                    <span className={styles.fileName}>{endpoint.fnName}</span>
                                  </div>
                                  {onDeleteFunction && (
                                    <Button
                                      className={styles.deleteBtn}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteFunction(uniqueApiKey, endpoint.fnName);
                                      }}
                                      title={`Delete ${endpoint.fnName}`}
                                      variant="ghost"
                                      size="sm"
                                    >
                                      <Trash2 size={12} color="#ef4444" />
                                    </Button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          // FALLBACK / LEGACY
          Object.entries(groupedEndpoints).map(([apiKey, endpoints]) => (
            // ... (Existing implementation for safety)
            <div key={apiKey}> Legacy Render (Should not happen with new Controller) </div>
          ))
        )}
      </div>

      <SidebarSettings />

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

