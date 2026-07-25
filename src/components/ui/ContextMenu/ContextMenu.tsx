import React, { useEffect } from "react";
import styles from "./ContextMenu.module.css";

export interface MenuItem {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  type?: "item" | "separator";
}

interface ContextMenuProps {
  items: MenuItem[];
  x: number;
  y: number;
  onClose: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ items, x, y, onClose }) => {
  useEffect(() => {
    const handleClick = () => onClose();
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, [onClose]);

  if (!items || items.length === 0) return null;

  return (
    <div
      className={styles.contextMenu}
      style={{ top: y, left: x }}
      onClick={(e) => e.stopPropagation()}
    >
      {items.map((item, index) => {
        if (item.type === "separator") {
          return <div key={`separator-${index}`} className={styles.contextMenuSeparator}></div>;
        }

        return (
          <div
            key={`${item.label}-${index}`}
            className={`${styles.contextMenuItem} ${item.disabled ? styles.disabled : ""}`}
            onClick={() => {
              if (!item.disabled) {
                item.onClick();
                onClose();
              }
            }}
          >
            <span>{item.label}</span>
          </div>
        );
      })}
    </div>
  );
};

export default ContextMenu;
