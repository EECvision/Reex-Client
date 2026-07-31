import React, { useRef, useEffect } from "react";
import { ChevronDown, ChevronRight, Lock, Trash2 } from "lucide-react";
import styles from "./ModuleItem.module.css";
import { DiffResult } from "../importTypes";
import StatusBadge from "./StatusBadge";
import { Button } from "../../ui/Button/Button";
import { Checkbox } from "../../ui/Checkbox/Checkbox";
import { FunctionDiff } from "../DiffModal";

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
  isMarkedForRemoval: boolean;
  onToggleRemoveModule: () => void;
  removedFunctions: Set<string>;
  onToggleRemoveFunction: (func: string) => void;
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
  onToggleForceOverwrite,
  isMarkedForRemoval,
  onToggleRemoveModule,
  removedFunctions,
  onToggleRemoveFunction,
}) => {
  const checkboxRef = useRef<HTMLInputElement>(null);

  // Set indeterminate state when module is marked for removal
  useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = isMarkedForRemoval;
    }
  }, [isMarkedForRemoval]);

  const isExistingModule = diff.status !== "new";

  return (
    <div
      className={`${styles.moduleWrapper} ${isMarkedForRemoval ? styles.markedForRemoval : ""}`}
    >
      <div className={`${isSelected ? styles.selected : ""}`}>
        <div
          className={styles.moduleMainRow}
          onClick={() => onToggleExpand(diff.module)}
        >
          <div
            className={styles.moduleCheckboxWrapper}
            onClick={(e) => e.stopPropagation()}
          >
            <Checkbox
              ref={checkboxRef}
              checked={isSelected && !isMarkedForRemoval}
              onChange={() => onToggleModule(diff)}
              disabled={diff.status === "disabled" || isMarkedForRemoval}
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

          <StatusBadge status={isMarkedForRemoval ? "remove" : diff.status} />

          {isExistingModule && (
            <div
              className={styles.removeBtn}
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleRemoveModule}
                title={isMarkedForRemoval ? "Undo removal" : "Mark for removal"}
                className={styles.removeBtnInner}
              >
                <Trash2 size={14} />
              </Button>
            </div>
          )}
        </div>
      </div>

      {isExpanded && diff.functions && (
        <div className={styles.functionList}>
          {diff.functions.map((f) => {
            const isFuncRemoved =
              isMarkedForRemoval || removedFunctions.has(f.name);
            const isFuncExisting = f.status !== "new";

            return (
              <label
                key={f.name}
                className={`${styles.functionItem} ${isFuncRemoved ? styles.removedFunction : ""}`}
              >
                <Checkbox
                  checked={selectedFunctions.has(f.name) && !isFuncRemoved}
                  onChange={() => onToggleFunction(diff.module, f.name)}
                  disabled={f.status === "disabled" || isFuncRemoved}
                />
                <span className={styles.functionName} title={f.name}>
                  {f.name}
                </span>
                {f.requiresAuth && (
                  <div
                    title="Requires Authentication"
                    className={styles.authIconWrapper}
                  >
                    <Lock size={12} className={styles.authIcon} />
                  </div>
                )}
                <StatusBadge status={isFuncRemoved ? "remove" : f.status} />
                {f.status === "modified" && !isFuncRemoved && (
                  <div className={styles.overwriteAction}>
                    <label
                      className={styles.overwriteLabel}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Checkbox
                        checked={forceOverwriteFunctions.has(
                          `${diff.module}.${f.name}`,
                        )}
                        onChange={() =>
                          onToggleForceOverwrite(diff.module, f.name)
                        }
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
                {isFuncExisting && !isMarkedForRemoval && (
                  <div
                    className={styles.functionRemoveBtn}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onToggleRemoveFunction(f.name)}
                      title={
                        isFuncRemoved ? "Undo removal" : "Mark for removal"
                      }
                      className={styles.removeBtnInner}
                    >
                      <Trash2 size={12} />
                    </Button>
                  </div>
                )}
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ModuleItem;
