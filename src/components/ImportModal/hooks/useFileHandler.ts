import { useState, useRef, DragEvent } from 'react';
import { CollectionType } from '../importTypes';

export const useFileHandler = (onFileSelected?: (file: File) => void, onError?: (msg: string) => void) => {
    const [dragActive, setDragActive] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [collectionType, setCollectionType] = useState<CollectionType>("unknown");
    const inputRef = useRef<HTMLInputElement>(null);



    const detectCollectionType = async (file: File): Promise<CollectionType> => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const result = e.target?.result as string;

                // 1. Try parsing as JSON
                try {
                    const content = JSON.parse(result);

                    // Case A: Valid JSON Object (Standard JSON import)
                    if (typeof content === 'object' && content !== null) {
                        if (content.openapi || content.swagger) {
                            resolve("openapi");
                            return;
                        }
                        if (content.info && content.item) {
                            resolve("postman");
                            return;
                        }
                    }

                    // Case B: JSON String (Fetched YAML wrapped in JSON)
                    if (typeof content === 'string') {
                        if (
                            (content.includes("openapi:") || content.includes("swagger:")) &&
                            (content.includes("info:") || content.includes("paths:"))
                        ) {
                            resolve("openapi");
                            return;
                        }
                    }
                } catch {
                    // Ignore parse errors, proceed to raw check
                }

                // Case C: Raw Text/YAML (Drag & Drop or Parse Failed)
                if (
                    (result.includes("openapi:") || result.includes("swagger:")) &&
                    (result.includes("info:") || result.includes("paths:"))
                ) {
                    resolve("openapi");
                    return;
                }

                resolve("unknown");
            };
            reader.readAsText(file);
        });
    };

    const handleDrag = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const file = e.dataTransfer.files[0];
            const lowerName = file.name.toLowerCase();
            if (file.type === "application/json" || lowerName.endsWith(".postman") || lowerName.endsWith(".openapi") || lowerName.endsWith(".yaml") || lowerName.endsWith(".yml")) {
                await processFile(file);
            } else {
                if (onError) onError("Please upload a .json, .yaml, .yml, .postman or .openapi file");
            }
        }
    };

    const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            await processFile(e.target.files[0]);
        }
    };

    const processFile = async (file: File) => {
        setSelectedFile(file);
        const type = await detectCollectionType(file);
        setCollectionType(type);
        if (onFileSelected) onFileSelected(file);
    };

    const resetFile = () => {
        setSelectedFile(null);
        setCollectionType("unknown");
        if (inputRef.current) inputRef.current.value = "";
    };

    return {
        dragActive,
        selectedFile,
        collectionType,
        inputRef,
        handleDrag,
        handleDrop,
        handleChange,
        resetFile,
        setFile: processFile,
        setCollectionType,
        setSelectedFile
    };
};
