import React, { useState } from 'react';
import {
    Folder,
    Trash2,
    ChevronRight,
    ChevronDown,
    FolderPlus,
    FilePlus
} from 'lucide-react';
import styles from './CollectionSidebar.module.css';

export interface RequestItem {
    id: string;
    name: string;
    method: string;
    url: string;
    // We'll store the full request config here in state
    config?: any;
}

export interface Collection {
    id: string;
    name: string;
    requests: RequestItem[];
    isOpen?: boolean;
    auth?: {
        type: string;
        token: string;
    };
}

interface CollectionSidebarProps {
    collections: Collection[];
    activeRequestId: string | null;
    onSelectRequest: (collectionId: string, request: RequestItem) => void;
    onAddCollection: () => void;
    onAddRequest: (collectionId: string) => void;
    onDeleteCollection: (collectionId: string) => void;
    onDeleteRequest: (collectionId: string, requestId: string) => void;
    onToggleCollection: (collectionId: string) => void;
}

const CollectionSidebar: React.FC<CollectionSidebarProps> = ({
    collections,
    activeRequestId,
    onSelectRequest,
    onAddCollection,
    onAddRequest,
    onDeleteCollection,
    onDeleteRequest,
    onToggleCollection
}) => {
    return (
        <div className={styles.sidebarContainer}>
            <div className={styles.sidebarHeader}>
                <span className={styles.sidebarTitle}>Collections</span>
                <button
                    className={styles.iconBtn}
                    onClick={onAddCollection}
                    title="New Collection"
                >
                    <FolderPlus size={18} />
                </button>
            </div>

            <div className={styles.collectionsList}>
                {collections.length === 0 && (
                    <div className={styles.emptyState}>
                        No collections yet. Click + to create one.
                    </div>
                )}

                {collections.map(col => (
                    <div key={col.id} className={styles.collectionItem}>
                        <div
                            className={styles.collectionHeader}
                            onClick={() => onToggleCollection(col.id)}
                        >
                            <div className={styles.collectionInfo}>
                                {col.isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                <Folder size={14} className={styles.collectionIcon} />
                                <span className={styles.collectionName}>{col.name}</span>
                            </div>
                            <div className={styles.collectionActions}>
                                <button
                                    className={styles.actionBtn}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onAddRequest(col.id);
                                    }}
                                    title="Add Request"
                                >
                                    <FilePlus size={14} />
                                </button>
                                <button
                                    className={`${styles.actionBtn} ${styles.deleteAction}`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteCollection(col.id);
                                    }}
                                    title="Delete Collection"
                                >
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        </div>

                        {col.isOpen && (
                            <div className={styles.requestsList}>
                                {col.requests.length === 0 && (
                                    <div className={styles.emptyRequestState}>
                                        No requests
                                    </div>
                                )}
                                {col.requests.map(req => (
                                    <div
                                        key={req.id}
                                        className={`${styles.requestItem} ${activeRequestId === req.id ? styles.requestActive : ''}`}
                                        onClick={() => onSelectRequest(col.id, req)}
                                    >
                                        <div className={styles.requestInfo}>
                                            <span className={`${styles.methodBadge} ${styles[req.method.toLowerCase()]}`}>
                                                {req.method}
                                            </span>
                                            <span className={styles.requestName}>{req.name}</span>
                                        </div>
                                        <button
                                            className={styles.deleteReqBtn}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onDeleteRequest(col.id, req.id);
                                            }}
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div className={styles.footerCredits}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    Built by <a href="https://github.com/EECvision" target="_blank" rel="noopener noreferrer" className={styles.devLink}>EECvision</a>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                    Powered by <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>ToolsHQ</span>
                </div>
            </div>
        </div>
    );
};

export default CollectionSidebar;
