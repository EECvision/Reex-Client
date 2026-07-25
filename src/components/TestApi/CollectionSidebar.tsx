import React, { useState, useRef } from 'react';
import {
    Folder,
    Trash2,
    ChevronRight,
    ChevronDown,
    FolderPlus,
    FilePlus,
    Pencil,
    PanelLeft,
    Plus
} from 'lucide-react';
import styles from './CollectionSidebar.module.css';
import Logo from '../Logo/Logo';
import UserMenu from '../UserMenu/UserMenu';
import { Button } from '../ui/Button/Button';

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
    onAddRequest: (collectionId: string) => void;
    onDeleteCollection: (collectionId: string) => void;
    onDeleteRequest: (collectionId: string, requestId: string) => void;
    onToggleCollection: (collectionId: string) => void;
    onRenameCollection?: (collectionId: string, newName: string) => void;
    isOpen?: boolean;
    onToggleSidebar?: () => void;
    hideLogo?: boolean;
}

const CollectionSidebar: React.FC<CollectionSidebarProps> = ({
    collections,
    activeRequestId,
    onSelectRequest,
    onAddRequest,
    onDeleteCollection,
    onDeleteRequest,
    onToggleCollection,
    onRenameCollection,
    isOpen = false,
    onToggleSidebar,
    hideLogo = false,
}) => {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    const startEdit = (col: Collection, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingId(col.id);
        setEditingName(col.name);
        setTimeout(() => inputRef.current?.select(), 0);
    };

    const commitEdit = () => {
        if (editingId && editingName.trim()) {
            onRenameCollection?.(editingId, editingName.trim());
        }
        setEditingId(null);
    };

    const cancelEdit = () => setEditingId(null);

    return (
        <div className={`${styles.sidebarContainer} ${isOpen ? styles.open : ''}`}>
            <div 
                className={styles.sidebarHeader} 
                style={hideLogo ? { justifyContent: isOpen ? 'flex-end' : 'center' } : undefined}
            >
                {!hideLogo && (
                    <div className={styles.brand}>
                        <Logo />
                    </div>
                )}
                {onToggleSidebar && (
                    <button className={styles.toggleBtn} onClick={onToggleSidebar}>
                        <PanelLeft size={16} />
                    </button>
                )}
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
                                <Folder size={14} className={`${styles.collectionIcon} ${col.isOpen ? styles.collectionIconExpanded : ''}`} />
                                {editingId === col.id ? (
                                    <input
                                        ref={inputRef}
                                        className={styles.collectionNameInput}
                                        value={editingName}
                                        onChange={e => setEditingName(e.target.value)}
                                        onBlur={commitEdit}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') { e.preventDefault(); commitEdit(); }
                                            if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); }
                                        }}
                                        onClick={e => e.stopPropagation()}
                                        autoFocus
                                    />
                                ) : (
                                    <span className={`${styles.collectionName} ${col.isOpen ? styles.collectionNameExpanded : ''}`} title={col.name}>
                                        {col.name}
                                    </span>
                                )}
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
                                    className={styles.actionBtn}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        startEdit(col, e);
                                    }}
                                    title="Rename Collection"
                                >
                                    <Pencil size={12} />
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
                                        <Button 
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => onAddRequest(col.id)}
                                            leftIcon={<Plus size={14} />}
                                        >
                                            Add Request
                                        </Button>
                                    </div>
                                )}
                                {col.requests.map(req => (
                                    <div
                                        key={req.id}
                                        className={`${styles.requestItem} ${activeRequestId === req.id ? styles.requestActive : ''}`}
                                        onClick={() => onSelectRequest(col.id, req)}
                                    >
                                        <div className={styles.requestInfo}>
                                            <span className={`${styles.methodBadge} ${styles[(req.method || 'GET').toLowerCase()]}`}>
                                                {req.method || 'GET'}
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

            <div className={styles.sidebarBottom}>
                <UserMenu placement="top" expanded={isOpen} />
            </div>
        </div>
    );
};

export default CollectionSidebar;
