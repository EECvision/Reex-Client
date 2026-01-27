import React from 'react';
import styles from './ReviewList.module.css';
import { Button } from '../../ui/Button/Button';
import { DiffResult } from '../importTypes';
import ModuleItem from './ModuleItem';
import { FunctionDiff } from '../DiffModal';

interface ReviewListProps {
    diffs: DiffResult[];
    selectedModules: Set<string>;
    selectedFunctions: Map<string, Set<string>>;
    expandedModules: Set<string>;
    onSelectAll: () => void;
    onDeselectAll: () => void;
    onToggleModule: (moduleName: string, diff?: DiffResult) => void;
    onToggleFunction: (module: string, func: string) => void;
    onToggleExpand: (module: string) => void;
    onViewChanges: (func: FunctionDiff) => void;
    forceOverwriteFunctions: Set<string>;
    onToggleForceOverwrite: (module: string, func: string) => void;
}

const ReviewList: React.FC<ReviewListProps> = ({
    diffs,
    selectedModules,
    selectedFunctions,
    expandedModules,
    onSelectAll,
    onDeselectAll,
    onToggleModule,
    onToggleFunction,
    onToggleExpand,
    onViewChanges,
    forceOverwriteFunctions,
    onToggleForceOverwrite
}) => {
    return (
        <div className={styles.reviewList}>
            <div className={styles.reviewHeader}>
                <span>
                    Select modules to update{" "}
                    <span className={styles.headerCount}>{diffs.length}</span>
                </span>
                <div className={styles.filterActions}>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onSelectAll}
                    >
                        Select All
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onDeselectAll}
                    >
                        Deselect All
                    </Button>
                </div>
            </div>
            <div className={styles.moduleGrid}>
                {diffs.map((diff) => (
                    <ModuleItem
                        key={diff.module}
                        diff={diff}
                        isSelected={selectedModules.has(diff.module)}
                        isExpanded={expandedModules.has(diff.module)}
                        selectedFunctions={selectedFunctions.get(diff.module) || new Set()}
                        onToggleModule={(d) => onToggleModule(d.module, d)}
                        onToggleFunction={onToggleFunction}
                        onToggleExpand={onToggleExpand}
                        onViewChanges={onViewChanges}
                        forceOverwriteFunctions={forceOverwriteFunctions}
                        onToggleForceOverwrite={onToggleForceOverwrite}
                    />
                ))}
            </div>
        </div>
    );
};

export default ReviewList;
