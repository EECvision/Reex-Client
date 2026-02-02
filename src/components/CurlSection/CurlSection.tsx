import React, { useState } from "react";
import dynamic from "next/dynamic";
import { Button } from "../ui/Button/Button";
import { Terminal } from "lucide-react";
import styles from "./CurlSection.module.css";

const MonacoJsonEditor = dynamic(
    () => import("../MonacoJsonEditor/MonacoJsonEditor"),
    { ssr: false, loading: () => <div style={{ padding: 20, color: '#94a3b8' }}>Loading editor...</div> }
);

interface CurlSectionProps {
    curlCommand: string | undefined;
}

const CurlSection: React.FC<CurlSectionProps> = ({ curlCommand }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        if (!curlCommand) return;
        navigator.clipboard.writeText(curlCommand);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!curlCommand) return null;

    // Calculate dynamic height based on lines (approx 19px per line + 20px padding)
    const lineCount = curlCommand.split('\n').length;
    // Cap at 300px to ensure scrollability for long commands
    const editorHeight = Math.min(Math.max(lineCount * 19 + 24, 100), 300);

    return (
        <div className={styles.curlSection}>
            <div className={styles.curlHeader}>
                <h3 className={styles.curlTitle}>
                    <Terminal size={16} className={styles.curlIcon} />
                    Curl Command
                </h3>
                <Button
                    onClick={handleCopy}
                    variant="secondary"
                    size="sm"
                >
                    {copied ? "✓ Copied" : "Copy"}
                </Button>
            </div>
            <div className={styles.editorWrapper}>
                <MonacoJsonEditor
                    value={curlCommand}
                    readOnly={true}
                    height={`${editorHeight}px`}
                    language="shell"
                />
            </div>
        </div>
    );
};

export default CurlSection;
