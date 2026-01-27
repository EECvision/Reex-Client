import { useState, useRef, DragEvent } from 'react';
import { CollectionType } from '../importTypes';

export const useFileHandler = (onFileSelected?: (file: File) => void) => {
    const [dragActive, setDragActive] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [collectionType, setCollectionType] = useState<CollectionType>("unknown");
    const inputRef = useRef<HTMLInputElement>(null);

    const detectCollectionType = async (file: File): Promise<CollectionType> => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const content = JSON.parse(e.target?.result as string);
                    if (content.openapi || content.swagger) {
                        resolve("openapi");
                        return;
                    }
                    if (content.info && content.item) {
                        resolve("postman");
                        return;
                    }
                    resolve("unknown");
                } catch {
                    resolve("unknown");
                }
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
            if (file.type === "application/json") {
                await processFile(file);
            } else {
                alert("Please upload a JSON file");
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
