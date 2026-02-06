import React, { useState } from 'react';
import { FileCode } from 'lucide-react';
import { HistoryItem } from '../../providers/ProjectContext';
import styles from './RecentCollectionsList.module.css';
import HistoryModal from '../HistoryModal/HistoryModal';

interface RecentCollectionsListProps {
    items: HistoryItem[];
    onItemClick: (item: HistoryItem) => void;
    onDelete?: (id: string) => void;
}

const RecentCollectionsList: React.FC<RecentCollectionsListProps> = ({ items, onItemClick, onDelete }) => {
    if (!items || items.length === 0) return null;

    const [showModal, setShowModal] = useState(false);

    // Always show top 3 in the preview list
    const displayedItems = items.slice(0, 3);
    const hasMore = items.length > 3;

    const formatDate = (dateString: string) => {
        try {
            return new Date(dateString).toLocaleDateString(undefined, {
                month: 'short', day: 'numeric', year: 'numeric'
            });
        } catch {
            return dateString;
        }
    };

    return (
        <>
            <div className={styles.container}>
                <h3 className={styles.title}>Recent Collections</h3>
                <div className={styles.list}>
                    {displayedItems.map(item => (
                        <button
                            key={item.id}
                            className={styles.item}
                            onClick={() => onItemClick(item)}
                        >
                            <div className={styles.iconWrapper}>
                                <FileCode size={18} strokeWidth={2} />
                            </div>
                            <div className={styles.info}>
                                <span className={styles.name} title={item.name}>{item.name}</span>
                                <span className={styles.meta}>
                                    Last edited: {formatDate(item.updated_at)}
                                </span>
                            </div>
                        </button>
                    ))}
                </div>
                {hasMore && (
                    <button
                        className={styles.showMoreBtn}
                        onClick={() => setShowModal(true)}
                    >
                        Show More... {items.length}
                    </button>
                )}
            </div>

            <HistoryModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                items={items}
                onItemClick={(item) => {
                    onItemClick(item);
                    setShowModal(false);
                }}
                onDelete={onDelete}
            />
        </>
    );
};

export default RecentCollectionsList;
