import React, { useState, useRef, useCallback, useEffect } from 'react';
import styles from './ResizablePanel.module.css';

interface ResizablePanelProps {
  children: React.ReactNode;
  minWidth?: number;
  maxWidth?: number;
  defaultWidth?: number;
  isOpen?: boolean;
  className?: string;
  resizerPosition?: 'right' | 'left';
  collapsedWidth?: number;
}

export const ResizablePanel: React.FC<ResizablePanelProps> = ({
  children,
  minWidth = 200,
  maxWidth = 600,
  defaultWidth = 260,
  isOpen = true,
  className = '',
  resizerPosition = 'right',
  collapsedWidth = 0
}) => {
  const [width, setWidth] = useState(defaultWidth);
  const [isDragging, setIsDragging] = useState(false);
  const isResizing = useRef(false);

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    setIsDragging(true);
    document.addEventListener("mousemove", resize);
    document.addEventListener("mouseup", stopResizing);
    document.body.style.cursor = "col-resize";
  }, []);

  const resize = useCallback((e: MouseEvent) => {
    if (isResizing.current) {
      // Use requestAnimationFrame to sync with browser render cycle
      requestAnimationFrame(() => {
        let newWidth = resizerPosition === 'right' 
          ? e.clientX 
          : window.innerWidth - e.clientX;
          
        if (newWidth < minWidth) newWidth = minWidth;
        if (newWidth > maxWidth) newWidth = maxWidth;
        setWidth(newWidth);
      });
    }
  }, [minWidth, maxWidth, resizerPosition]);

  const stopResizing = useCallback(() => {
    isResizing.current = false;
    setIsDragging(false);
    document.removeEventListener("mousemove", resize);
    document.removeEventListener("mouseup", stopResizing);
    document.body.style.cursor = "";
  }, [resize]);

  useEffect(() => {
    return () => {
      document.removeEventListener("mousemove", resize);
      document.removeEventListener("mouseup", stopResizing);
    };
  }, [resize, stopResizing]);

  return (
    <div 
      className={`${styles.container} ${!isDragging ? styles.withTransition : ''} ${!isOpen ? styles.closed : ''} ${className}`}
      style={{ width: isOpen ? width : collapsedWidth }}
    >
      <div className={styles.content}>
        {children}
      </div>
      {isOpen && (
        <div 
          className={`${styles.resizer} ${styles[resizerPosition]} ${isResizing.current ? styles.resizerActive : ""}`} 
          onMouseDown={startResizing} 
        />
      )}
    </div>
  );
};
