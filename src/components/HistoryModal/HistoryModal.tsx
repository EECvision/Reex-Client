import React, { useState, useEffect, useRef } from 'react';
import { HistoryItem } from '../../providers/ProjectContext';
import styles from './HistoryModal.module.css';
import { Search, Folder, X, Trash2 } from 'lucide-react';
import { Modal } from '../ui/Modal/Modal';

interface HistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    items: HistoryItem[];
    onItemClick: (item: HistoryItem) => void;
    onDelete?: (id: string) => void;
}

const HistoryModal: React.FC<HistoryModalProps> = ({ isOpen, onClose, items, onItemClick, onDelete }) => {
    const [search, setSearch] = useState("");
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    // Reset state when opening
    useEffect(() => {
        if (isOpen) {
            setSearch("");
            setSelectedIndex(0);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    const filteredItems = items.filter(item =>
        item.name.toLowerCase().includes(search.toLowerCase())
    );

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => Math.min(prev + 1, filteredItems.length - 1));
            // Scroll into view logic could be added here
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (filteredItems[selectedIndex]) {
                onItemClick(filteredItems[selectedIndex]);
                onClose();
            }
        }
    };

    const formatDate = (dateString: string) => {
        try {
            return new Date(dateString).toLocaleDateString(undefined, {
                year: 'numeric', month: 'short', day: 'numeric'
            });
        } catch { return ""; }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="lg" // Use app's large size
            showCloseButton={false} // We have our own in search bar
            closeOnOverlayClick={true}
        >
            <div
                className={styles.container}
                onKeyDown={handleKeyDown}
            >
                {/* Search Header */}
                <div className={styles.searchHeader}>
                    <Search size={16} className={styles.icon} />
                    <input
                        ref={inputRef}
                        type="text"
                        className={styles.searchInput}
                        placeholder="Search collections..."
                        value={search}
                        onChange={e => {
                            setSearch(e.target.value);
                            setSelectedIndex(0);
                        }}
                    />
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                        <X size={16} />
                    </button>
                </div>

                {/* List */}
                <div className={styles.list} ref={listRef}>
                    {filteredItems.length > 0 ? (
                        filteredItems.map((item, index) => (
                            <button
                                key={item.id}
                                className={styles.item}
                                style={index === selectedIndex ? { background: 'var(--hover-bg)', color: 'var(--text-primary)' } : {}}
                                onClick={() => {
                                    onItemClick(item);
                                    onClose();
                                }}
                                onMouseEnter={() => setSelectedIndex(index)}
                            >
                                <Folder size={18} className={styles.icon} style={index === selectedIndex ? { color: 'var(--primary-color)' } : {}} />
                                <div className={styles.info}>
                                    <span className={styles.name}>{item.name}</span>
                                    <span className={styles.path}>
                                        Last edited: {formatDate(item.updated_at)}
                                    </span>
                                </div>
                                {onDelete && (
                                    <div
                                        className={styles.actions}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDelete(item.id);
                                        }}
                                        title="Delete from history"
                                    >
                                        <X size={14} />
                                    </div>
                                )}
                            </button>
                        ))
                    ) : (
                        <div className={styles.empty}>No collections found</div>
                    )}
                </div>
            </div>
        </Modal>
    );
};

export default HistoryModal;
