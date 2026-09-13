import React, { useRef, useEffect } from "react";
import styles from "./TabBar.module.css";
import { EndpointInfo } from "@/types";
import { X } from "lucide-react";
import ContextMenu, { MenuItem } from "../ui/ContextMenu/ContextMenu";

interface Tab {
  endpoint: EndpointInfo;
  isPinned: boolean;
}

interface TabBarProps {
  tabs: Tab[];
  activeTabIndex: number;
  onSelectTab: (index: number) => void;
  onCloseTab: (index: number) => void;
  onCloseAllTabs?: () => void;
  onCloseOthers?: (index: number) => void;
  onCloseToRight?: (index: number) => void;
  onPinTab: (index: number) => void;
}

const TabBar: React.FC<TabBarProps> = ({
  tabs,
  activeTabIndex,
  onSelectTab,
  onCloseTab,
  onCloseAllTabs,
  onCloseOthers,
  onCloseToRight,
  onPinTab,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [contextMenu, setContextMenu] = React.useState<{ x: number, y: number, tabIndex: number | null } | null>(null);

  // Scroll active tab into view when it changes
  useEffect(() => {
    if (scrollRef.current) {
      const activeElement = scrollRef.current.children[activeTabIndex] as HTMLElement;
      if (activeElement) {
        activeElement.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
      }
    }
  }, [activeTabIndex]);

  // Translate vertical wheel scroll to horizontal scrolling
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, []);

  useEffect(() => {
    const handlePinShortcut = (event: KeyboardEvent) => {
      if (
        !(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey ||
        event.key.toLowerCase() !== "s" || !tabs[activeTabIndex]
      ) return;
      event.preventDefault();
      if (!tabs[activeTabIndex].isPinned) onPinTab(activeTabIndex);
    };
    // Capture the shortcut even when a request editor has keyboard focus.
    window.addEventListener("keydown", handlePinShortcut, true);
    return () => window.removeEventListener("keydown", handlePinShortcut, true);
  }, [activeTabIndex, onPinTab, tabs]);

  if (tabs.length === 0) return null;

  const handleContextMenu = (e: React.MouseEvent, tabIndex: number | null = null) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, tabIndex });
  };

  const contextMenuItems: MenuItem[] = [];
  if (contextMenu && contextMenu.tabIndex !== null) {
    contextMenuItems.push({
      label: "Close",
      onClick: () => onCloseTab(contextMenu.tabIndex!),
    });
    contextMenuItems.push({
      label: "Close Others",
      onClick: () => { if (onCloseOthers) onCloseOthers(contextMenu.tabIndex!); },
    });
    contextMenuItems.push({
      label: "Close to the Right",
      onClick: () => {
        if (contextMenu.tabIndex! < tabs.length - 1 && onCloseToRight) {
          onCloseToRight(contextMenu.tabIndex!);
        }
      },
      disabled: contextMenu.tabIndex! === tabs.length - 1,
    });
    contextMenuItems.push({ type: "separator", label: "", onClick: () => {} });
  }
  
  contextMenuItems.push({
    label: "Close All",
    onClick: () => { if (onCloseAllTabs) onCloseAllTabs(); },
  });

  return (
    <div className={styles.tabBarContainer} onContextMenu={(e) => handleContextMenu(e, null)}>
      {contextMenu && (
        <ContextMenu
          items={contextMenuItems}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
        />
      )}
      <div className={`${styles.tabScrollArea} slim-scrollbar`} ref={scrollRef}>
        {tabs.map((tab, index) => {
          const isActive = index === activeTabIndex;
          const methodPrefix = tab.endpoint.fnName.split("_")[0].toLowerCase();
          
          return (
            <div
              key={`${tab.endpoint.apiKey}-${tab.endpoint.fnName}-${index}`}
              className={`${styles.tab} ${isActive ? styles.active : ""} ${!tab.isPinned ? styles.unpinned : ""}`}
              onClick={() => onSelectTab(index)}
              onContextMenu={(e) => handleContextMenu(e, index)}
              onDoubleClick={() => {
                if (!tab.isPinned) {
                  onPinTab(index);
                }
              }}
              title={tab.endpoint.fnName}
            >
              <span className={`${styles.methodDot} ${styles[methodPrefix] || styles.defaultMethod}`}></span>
              <span className={styles.tabName}>{tab.endpoint.fnName}</span>
              <button
                className={styles.closeBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseTab(index);
                }}
                title="Close tab"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TabBar;
