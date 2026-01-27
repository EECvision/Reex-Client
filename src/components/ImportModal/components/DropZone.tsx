import React from 'react';
import styles from '../ImportModal.module.css';
import { CollectionType } from '../importTypes';

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

    const renderBadge = (type: CollectionType) => {
        let className = styles.badgeUnsupported;
        if (type === "openapi") className = styles.badgeOpenApi;
        if (type === "postman") className = styles.badgePostman;

        return (
            <span className={`${styles.badge} ${className}`}>
                {type === "unknown"
                    ? "Unsupported"
                    : type === "openapi"
                        ? "OpenAPI"
                        : "Postman"}
            </span>
        );
    };

    return (
        <div
            className={`${styles.dropZone} ${dragActive ? styles.dropZoneActive : ""
                } ${selectedFile ? styles.dropZoneSelected : ""}`}
            onDragEnter={onDragEnter}
            onDragLeave={onDragLeave}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
        >
            <input
                ref={inputRef}
                type="file"
                accept="application/json"
                className={styles.input}
                onChange={onChange}
            />

            {selectedFile ? (
                <div
                    className={styles.fileInfo}
                    onClick={(e) => {
                        e.stopPropagation();
                        onClearFile();
                    }}
                >
                    <div className={styles.fileDetails}>
                        <span className={styles.fileName}>
                            {selectedFile.name}
                        </span>
                        {renderBadge(collectionType)}
                    </div>
                    <span className={styles.fileSize}>
                        {(selectedFile.size / 1024).toFixed(2)} KB
                    </span>
                </div>
            ) : (
                <div className={styles.placeholder}>
                    <p>
                        Drag & Drop your JSON file here or <span>Browse</span>
                    </p>
                </div>
            )}
        </div>
    );
};

export default DropZone;
