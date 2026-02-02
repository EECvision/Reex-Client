"use client";

import React from "react";
import Editor, { OnMount } from "@monaco-editor/react";
import { useSettings } from "@/providers/SettingsContext";

interface MonacoJsonEditorProps {
    value: string;
    onChange?: (value: string) => void;
    readOnly?: boolean;
    height?: string | number;
    minHeight?: string | number;
    language?: string;
}

const MonacoJsonEditor: React.FC<MonacoJsonEditorProps> = ({
    value,
    onChange,
    readOnly = false,
    height = "200px",
    minHeight,
    language = "json",
}) => {
    const { theme } = useSettings();

    const handleEditorMount: OnMount = (editor) => {
        // Auto-format on mount for JSON
        if (language === "json") {
            setTimeout(() => {
                editor.getAction("editor.action.formatDocument")?.run();
            }, 100);
        }
    };

    const handleChange = (newValue: string | undefined) => {
        if (onChange && newValue !== undefined) {
            onChange(newValue);
        }
    };

    return (
        <div style={{ minHeight }}>
            <Editor
                height={height}
                defaultLanguage={language}
                value={value}
                onChange={handleChange}
                onMount={handleEditorMount}
                theme={theme === "dark" ? "vs-dark" : "light"}
                options={{
                    readOnly,
                    minimap: { enabled: false },
                    fontSize: 13,
                    lineNumbers: "on",
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    tabSize: 2,
                    wordWrap: "on",
                    folding: true,
                    formatOnPaste: true,
                    formatOnType: true,
                    renderLineHighlight: readOnly ? "none" : "line",
                    scrollbar: {
                        vertical: "auto",
                        horizontal: "auto",
                        verticalScrollbarSize: 8,
                        horizontalScrollbarSize: 8,
                    },
                    padding: { top: 8, bottom: 8 },
                    overviewRulerBorder: false,
                    hideCursorInOverviewRuler: true,
                    overviewRulerLanes: 0,
                    lineDecorationsWidth: 8,
                    cursorBlinking: readOnly ? "solid" : "blink",
                }}
                loading={
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        height: "100%",
                        color: "var(--text-muted)"
                    }}>
                        Loading editor...
                    </div>
                }
            />
        </div>
    );
};

export default MonacoJsonEditor;
