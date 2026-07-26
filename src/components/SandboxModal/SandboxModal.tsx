import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Rnd } from 'react-rnd';
import { X, TestTube, ExternalLink } from 'lucide-react';
import styles from './SandboxModal.module.css';
import { SandboxWindow } from '../SandboxWindow/SandboxWindow';

interface SandboxModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SandboxModal: React.FC<SandboxModalProps> = ({ isOpen, onClose }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className={styles.overlay}>
      <Rnd
        default={{
          x: typeof window !== 'undefined' ? Math.max(0, ((window.innerWidth - 1000) / 2) + 88) : 0,
          y: typeof window !== 'undefined' ? Math.max(0, (window.innerHeight - 650) / 2 + 18) : 0,
          width: 1000,
          height: 650,
        }}
        minWidth={700}
        minHeight={450}
        bounds="parent"
        dragHandleClassName={styles.header}
        className={styles.rndContainer}
        resizeHandleStyles={{
          left: { zIndex: 9999 },
          right: { zIndex: 9999 },
          top: { zIndex: 9999 },
          bottom: { zIndex: 9999 },
          topLeft: { zIndex: 9999 },
          topRight: { zIndex: 9999 },
          bottomLeft: { zIndex: 9999 },
          bottomRight: { zIndex: 9999 },
        }}
      >
        <div className={styles.header}>
          <div className={styles.title}>
            <TestTube size={16} />
            API Sandbox
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button 
              className={styles.closeButton} 
              onClick={() => {
                window.open('/sandbox', '_blank');
                onClose();
              }} 
              title="Open in new tab"
            >
              <ExternalLink size={14} />
            </button>
            <button className={styles.closeButton} onClick={onClose} title="Close Sandbox">
              <X size={16} />
            </button>
          </div>
        </div>
        <div className={styles.content}>
          <SandboxWindow />
        </div>
      </Rnd>
    </div>,
    document.body
  );
};

export default SandboxModal;
