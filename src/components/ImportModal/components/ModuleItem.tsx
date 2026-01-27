import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import styles from './ModuleItem.module.css';
import { DiffResult } from '../importTypes';
import StatusBadge from './StatusBadge';
import { Button } from '../../ui/Button/Button';
import { FunctionDiff } from '../DiffModal';

interface ModuleItemProps {
    diff: DiffResult;
    isSelected: boolean;
    isExpanded: boolean;
    selectedFunctions: Set<string>;
    onToggleModule: (diff: DiffResult) => void;
    onToggleFunction: (module: string, func: string) => void;
    onToggleExpand: (module: string) => void;
    onViewChanges: (func: FunctionDiff) => void;
    forceOverwriteFunctions: Set<string>;
    onToggleForceOverwrite: (module: string, func: string) => void;
}

const ModuleItem: React.FC<ModuleItemProps> = ({
    diff,
    isSelected,
    isExpanded,
    selectedFunctions,
    onToggleModule,
    onToggleFunction,
    onToggleExpand,
    onViewChanges,
    forceOverwriteFunctions,
    onToggleForceOverwrite
}) => {
    return (
        <div className={styles.moduleWrapper}>
            <div
                className={`${isSelected ? styles.selected : ""}`}
            >
                <div
                    className={styles.moduleMainRow}
                    onClick={() => onToggleExpand(diff.module)}
                >
                    <div className={styles.moduleCheckboxWrapper} onClick={(e) => e.stopPropagation()}>
                        <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => onToggleModule(diff)}
                            disabled={diff.status === "disabled"}
                            className={styles.checkbox}
                        />
                    </div>

                    <div className={styles.chevronWrapper}>
                        {isExpanded ? (
                            <ChevronDown size={18} className={styles.chevronIcon} />
                        ) : (
                            <ChevronRight size={18} className={styles.chevronIcon} />
                        )}
                    </div>

                    <div className={styles.moduleName} title={diff.module}>
                        <span className={styles.truncateText}>{diff.module}</span>
                        {diff.functions && diff.functions.length > 0 && (
                            <span className={styles.functionCountBadge}>
                                {diff.functions.length}
                            </span>
                        )}
                    </div>

                    <StatusBadge status={diff.status} />
                </div>
            </div>

            {isExpanded && diff.functions && (
                <div className={styles.functionList}>
                    {diff.functions.map((f) => (
                        <label key={f.name} className={styles.functionItem}>
                            <input
                                type="checkbox"
                                checked={selectedFunctions.has(f.name)}
                                onChange={() => onToggleFunction(diff.module, f.name)}
                                disabled={f.status === "disabled"}
                            />
                            <span className={styles.functionName} title={f.name}>
                                {f.name}
                            </span>
                            <StatusBadge status={f.status} />
                            {f.status === "modified" && (
                                <div className={styles.overwriteAction}>
                                    <label className={styles.overwriteLabel} onClick={(e) => e.stopPropagation()}>
                                        <input
                                            type="checkbox"
                                            checked={forceOverwriteFunctions.has(`${diff.module}.${f.name}`)}
                                            onChange={() => onToggleForceOverwrite(diff.module, f.name)}
                                        />
                                        <span className={styles.overwriteText}>Overwrite</span>
                                    </label>
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onViewChanges(f);
                                        }}
                                        className={styles.viewChangesBtn}
                                    >
                                        View Changes
                                    </Button>
                                </div>
                            )}
                        </label>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ModuleItem;
