import React from "react";
import { diffLines, Change } from "diff";
import { Button } from "../ui/Button/Button";
import styles from "./DiffModal.module.css";

export interface FunctionDiff {
    name: string;
    status: "new" | "modified" | "deleted" | "unchanged" | "disabled";
    oldContent?: string;
    newContent?: string;
}

interface DiffModalProps {
    diff: FunctionDiff | null;
    onClose: () => void;
}

const CustomDiffViewer = ({
    oldCode,
    newCode,
}: {
    oldCode: string;
    newCode: string;
}) => {
    const changes: Change[] = diffLines(oldCode, newCode);
    const rows: {
        leftLineNumber?: number;
        leftContent?: string;
        leftType: "normal" | "diffRemoved" | "diffEmpty";
        rightLineNumber?: number;
        rightContent?: string;
        rightType: "normal" | "diffAdded" | "diffEmpty";
    }[] = [];

    let leftLine = 1;
    let rightLine = 1;
    let i = 0;

    while (i < changes.length) {
        const current = changes[i];
        const next = changes[i + 1];

        if (current.removed && next?.added) {
            // Modification block - try to align
            const leftLines = current.value.replace(/\n$/, "").split("\n");
            const rightLines = next.value.replace(/\n$/, "").split("\n");
            const max = Math.max(leftLines.length, rightLines.length);

            for (let j = 0; j < max; j++) {
                rows.push({
                    leftLineNumber: j < leftLines.length ? leftLine++ : undefined,
                    leftContent: leftLines[j] || "",
                    leftType: j < leftLines.length ? "diffRemoved" : "diffEmpty",
                    rightLineNumber: j < rightLines.length ? rightLine++ : undefined,
                    rightContent: rightLines[j] || "",
                    rightType: j < rightLines.length ? "diffAdded" : "diffEmpty",
                });
            }
            i += 2; // Skip next
        } else if (current.removed) {
            const lines = current.value.replace(/\n$/, "").split("\n");
            lines.forEach((line) => {
                rows.push({
                    leftLineNumber: leftLine++,
                    leftContent: line,
                    leftType: "diffRemoved",
                    rightType: "diffEmpty",
                });
            });
            i++;
        } else if (current.added) {
            const lines = current.value.replace(/\n$/, "").split("\n");
            lines.forEach((line) => {
                rows.push({
                    leftType: "diffEmpty",
                    rightLineNumber: rightLine++,
                    rightContent: line,
                    rightType: "diffAdded",
                });
            });
            i++;
        } else {
            // Unchanged
            const lines = current.value.replace(/\n$/, "").split("\n");
            lines.forEach((line) => {
                rows.push({
                    leftLineNumber: leftLine++,
                    leftContent: line,
                    leftType: "normal",
                    rightLineNumber: rightLine++,
                    rightContent: line,
                    rightType: "normal",
                });
            });
            i++;
        }
    }

    return (
        <div className={styles.diffViewer}>
            <div className={styles.diffRow}>
                <div className={styles.diffSplit}>
                    <div className={styles.diffPaneHeader}>Original</div>
                </div>
                <div className={styles.diffSplit}>
                    <div className={styles.diffPaneHeader}>Updated</div>
                </div>
            </div>
            {rows.map((row, idx) => (
                <div key={idx} className={styles.diffRow}>
                    {/* Left Pane (New Code) */}
                    <div className={styles.diffSplit}>
                        <div className={styles.diffLineNumber}>
                            {row.rightLineNumber || ""}
                        </div>
                        <div
                            className={`${styles.diffContent} ${row.rightType !== "normal" && row.rightType !== "diffEmpty"
                                    ? styles[row.rightType]
                                    : ""
                                } ${row.rightType === "diffEmpty" ? styles.diffEmpty : ""}`}
                        >
                            {row.rightContent || (row.rightType === "diffEmpty" ? "" : " ")}
                        </div>
                    </div>
                    {/* Right Pane (Current Code) */}
                    <div className={styles.diffSplit}>
                        <div className={styles.diffLineNumber}>
                            {row.leftLineNumber || ""}
                        </div>
                        <div
                            className={`${styles.diffContent} ${row.leftType !== "normal" && row.leftType !== "diffEmpty"
                                    ? styles[row.leftType]
                                    : ""
                                } ${row.leftType === "diffEmpty" ? styles.diffEmpty : ""}`}
                        >
                            {row.leftContent || (row.leftType === "diffEmpty" ? "" : " ")}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

const DiffModal: React.FC<DiffModalProps> = ({ diff, onClose }) => {
    if (!diff) return null;

    return (
        <div className={styles.diffOverlay}>
            <div className={styles.diffModal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.diffHeader}>
                    <h3>Changes: {diff.name}</h3>
                    <Button
                        onClick={onClose}
                        className={styles.closeButton}
                        variant="ghost"
                        size="sm"
                    >
                        ✕
                    </Button>
                </div>
                <div className={styles.diffBody}>
                    <CustomDiffViewer
                        oldCode={diff.oldContent || ""}
                        newCode={diff.newContent || ""}
                    />
                </div>
            </div>
        </div>
    );
};

export default DiffModal;
