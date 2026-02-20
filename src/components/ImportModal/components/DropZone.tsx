import React from 'react';
import styles from './DropZone.module.css';
import { CollectionType } from '../importTypes';
import { ArrowUp, X } from 'lucide-react';

interface DropZoneProps {
    dragActive: boolean;
    selectedFile: File | null;
    collectionType: CollectionType;
    inputRef: React.RefObject<HTMLInputElement>;
    onDragEnter: (e: React.DragEvent<HTMLDivElement>) => void;
    onDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
    onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
    onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onClearFile: () => void;
}

const FORMAT_BADGES = ['JSON', 'YAML', 'OPENAPI', 'POSTMAN V2'];

const DropZone: React.FC<DropZoneProps> = ({
    dragActive,
    selectedFile,
    collectionType,
    inputRef,
    onDragEnter,
    onDragLeave,
    onDragOver,
    onDrop,
    onChange,
    onClearFile
}) => {

    const renderCollectionBadge = (type: CollectionType) => {
        let cls = styles.fileBadgeDefault;
        let label = 'Unknown';
        if (type === 'openapi') { cls = styles.fileBadgeOpenApi; label = 'OpenAPI'; }
        if (type === 'postman') { cls = styles.fileBadgePostman; label = 'Postman'; }
        return <span className={`${styles.fileBadge} ${cls}`}>{label}</span>;
    };

    return (
        <div
            className={`${styles.dropZone} ${dragActive ? styles.dropZoneActive : ''} ${selectedFile ? styles.dropZoneSelected : ''}`}
            onDragEnter={onDragEnter}
            onDragLeave={onDragLeave}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onClick={() => !selectedFile && inputRef.current?.click()}
        >
            <input
                ref={inputRef}
                type="file"
                accept="application/json,.yaml,.yml,.postman,.openapi"
                className={styles.input}
                onChange={onChange}
            />

            {selectedFile ? (
                <div className={styles.fileInfo}>
                    <div className={styles.fileDetails}>
                        <span className={styles.fileName}>{selectedFile.name}</span>
                        {renderCollectionBadge(collectionType)}
                    </div>
                    <span className={styles.fileSize}>{(selectedFile.size / 1024).toFixed(1)} KB</span>
                    <button
                        className={styles.clearBtn}
                        onClick={(e) => { e.stopPropagation(); onClearFile(); }}
                        title="Remove file"
                    >
                        <X size={14} />
                        Remove
                    </button>
                </div>
            ) : (
                <div className={styles.placeholder}>
                    <div className={styles.uploadIconBtn}>
                        <ArrowUp size={18} strokeWidth={2} />
                    </div>
                    <p className={styles.dropTitle}>
                        Drop your collection file here<span className={styles.dot}>·</span>
                    </p>
                    <p className={styles.dropSubtitle}>
                        or <span className={styles.browseLink} onClick={() => inputRef.current?.click()}>browse to upload</span>
                    </p>
                    <div className={styles.formatBadges}>
                        {FORMAT_BADGES.map(fmt => (
                            <span key={fmt} className={styles.formatBadge}>{fmt}</span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DropZone;
