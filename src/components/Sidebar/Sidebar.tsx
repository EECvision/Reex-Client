import React, { SetStateAction, useState, useRef, useEffect } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import styles from "./Sidebar.module.css";
import { EndpointInfo, Methods } from "@/types";
import { Folder, Trash2, ChevronRight, ChevronDown, Lock, TestTube, Pencil, RefreshCw, MoreVertical, Code } from "lucide-react";
import Link from "next/link";
import { Button } from "../ui/Button/Button";
import { Select } from "../ui/Select/Select";
import Logo from "../Logo/Logo";

// ... existing code ...

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
  onRenameCollection?: (id: string, newName: string) => void;
  onUpdateCollection?: (id: string) => void;
  onOpenSandbox?: (id: string) => void;
  baseURL?: string;
  collectionName?: string;
  isOpen?: boolean;
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
  onRenameCollection,
  onUpdateCollection,
  onOpenSandbox,
  baseURL,
  collectionName,
  isOpen = false,
}) => {
  // Initialize expanded state for collections - default to ALL expanded
  const [expandedCollections, setExpandedCollections] = React.useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  
  const nameInputRef = useRef<HTMLInputElement>(null);
  const originalNameRef = useRef<string>('');

  const startRename = (id: string, currentName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    originalNameRef.current = currentName;
    setEditingId(id);
    setEditingName(currentName);
    setTimeout(() => nameInputRef.current?.select(), 0);
  };

  const commitRename = () => {
    const trimmed = editingName.trim();
    if (editingId && trimmed && trimmed !== originalNameRef.current) {
      onRenameCollection?.(editingId, trimmed);
    }
    setEditingId(null);
  };

  const cancelRename = () => setEditingId(null);

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
    <aside className={`${styles.sidebar} ${isOpen ? styles.open : ""}`}>
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
                      {editingId === group.id ? (
                        <input
                          ref={nameInputRef}
                          className={styles.collectionNameInput}
                          value={editingName}
                          onChange={e => setEditingName(e.target.value)}
                          onBlur={commitRename}
                          onKeyDown={e => {
                            if (e.key === 'Enter') { e.preventDefault(); commitRename(); }
                            if (e.key === 'Escape') { e.preventDefault(); cancelRename(); }
                          }}
                          onClick={e => e.stopPropagation()}
                          autoFocus
                        />
                      ) : (
                        <span className={`${styles.rootFolderName} ${isExpanded ? styles.rootFolderNameExpanded : ''}`} title={group.name}>{group.name}</span>
                      )}
                    </div>

                    <div className={styles.collectionHeaderActions}>
                      <DropdownMenu.Root>
                        <DropdownMenu.Trigger asChild>
                          <Button
                            className={styles.moreBtn}
                            onClick={(e) => e.stopPropagation()}
                            variant="ghost"
                            size="sm"
                            title="Options"
                          >
                            <MoreVertical size={14} />
                          </Button>
                        </DropdownMenu.Trigger>

                        <DropdownMenu.Portal>
                          <DropdownMenu.Content 
                            className={styles.dropdownMenu} 
                            sideOffset={5} 
                            align="end"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {onUpdateCollection && (
                              <DropdownMenu.Item className={styles.dropdownItem} onClick={(e) => { e.stopPropagation(); onUpdateCollection(group.id); }}>
                                <RefreshCw size={14} />
                                Update Collection
                              </DropdownMenu.Item>
                            )}
                            {onOpenSandbox && (
                              <DropdownMenu.Item className={styles.dropdownItem} onClick={(e) => { e.stopPropagation(); onOpenSandbox(group.id); }}>
                                <Code size={14} />
                                Open in Sandbox
                              </DropdownMenu.Item>
                            )}
                            {onRenameCollection && (
                              <DropdownMenu.Item className={styles.dropdownItem} onClick={(e) => { e.stopPropagation(); startRename(group.id, group.name, e); }}>
                                <Pencil size={14} />
                                Rename Collection
                              </DropdownMenu.Item>
                            )}
                            {onDeleteCollection && (
                              <DropdownMenu.Item className={`${styles.dropdownItem} ${styles.dropdownItemDanger}`} onClick={(e) => { e.stopPropagation(); onDeleteCollection(group.id); }}>
                                <Trash2 size={14} />
                                Delete Collection
                              </DropdownMenu.Item>
                            )}
                          </DropdownMenu.Content>
                        </DropdownMenu.Portal>
                      </DropdownMenu.Root>
                    </div>
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
                                <Trash2 size={12} />
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
                                      <Trash2 size={12} />
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

      <div className={styles.footerCredits}>
        {/* <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          Built by <a href="https://github.com/EECvision" target="_blank" rel="noopener noreferrer" className={styles.devLink}>EECvision</a>
        </div> */}
        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
          Powered by <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>ToolsHQ</span>
        </div>
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

