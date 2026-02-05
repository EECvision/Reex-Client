"use client";

import { useState } from 'react';
import styles from './page.module.css';
import CollectionSidebar, { Collection, RequestItem } from '@/components/TestApi/CollectionSidebar';
import RequestEditor from '@/components/TestApi/RequestEditor';
import EmptyState from '@/components/EmptyState/EmptyState';
import { Modal } from '@/components/ui/Modal/Modal';
import { Button } from '@/components/ui/Button/Button';

export default function TestApiPage() {
  // Local State (to be replaced by DB later)
  const [collections, setCollections] = useState<Collection[]>([
    {
      id: 'c1',
      name: 'Example Collection',
      isOpen: true,
      requests: [
        {
          id: 'r1',
          name: 'Get Todos',
          method: 'GET',
          url: 'https://jsonplaceholder.typicode.com/todos',
          config: {
            method: 'GET',
            url: 'https://jsonplaceholder.typicode.com/todos'
          }
        }
      ]
    }
  ]);
  const [activeRequest, setActiveRequest] = useState<RequestItem | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'collection' | 'request' | 'delete-collection' | 'delete-request'>('collection');
  const [newItemName, newItemNameSet] = useState(''); // renamed to avoid conflict if any, but let's stick to setNewItemName
  const [targetColId, setTargetColId] = useState<string | null>(null);
  const [targetReqId, setTargetReqId] = useState<string | null>(null);

  // --- Actions ---

  const handleAddCollection = () => {
    setModalType('collection');
    newItemNameSet('');
    setIsModalOpen(true);
  };

  const handleAddRequest = (collectionId: string) => {
    setModalType('request');
    setTargetColId(collectionId);
    newItemNameSet('');
    setIsModalOpen(true);
  };

  const confirmDeleteCollection = () => {
    if (!targetColId) return;
    setCollections(collections.filter(c => c.id !== targetColId));
    if (activeRequest && collections.find(c => c.id === targetColId)?.requests.find(r => r.id === activeRequest.id)) {
      setActiveRequest(null);
    }
    setIsModalOpen(false);
  };

  const confirmDeleteRequest = () => {
    if (!targetColId || !targetReqId) return;
    setCollections(collections.map(c => {
      if (c.id === targetColId) {
        return { ...c, requests: c.requests.filter(r => r.id !== targetReqId) };
      }
      return c;
    }));
    if (activeRequest?.id === targetReqId) {
      setActiveRequest(null);
    }
    setIsModalOpen(false);
  };

  const handleConfirmModal = () => {
    if (modalType === 'delete-collection') {
      confirmDeleteCollection();
      return;
    }
    if (modalType === 'delete-request') {
      confirmDeleteRequest();
      return;
    }

    if (!newItemName.trim()) return;

    if (modalType === 'collection') {
      const newCol: Collection = {
        id: Date.now().toString(),
        name: newItemName,
        requests: [],
        isOpen: true
      };
      setCollections([...collections, newCol]);
    } else {
      if (!targetColId) return;
      const newReq: RequestItem = {
        id: Date.now().toString(),
        name: newItemName,
        method: 'GET',
        url: '',
        config: {}
      };

      setCollections(collections.map(c => {
        if (c.id === targetColId) {
          return { ...c, requests: [...c.requests, newReq], isOpen: true };
        }
        return c;
      }));
      setActiveRequest(newReq);
    }
    setIsModalOpen(false);
  };

  const handleDeleteCollection = (id: string) => {
    setModalType('delete-collection');
    setTargetColId(id);
    setIsModalOpen(true);
  };

  const handleDeleteRequest = (colId: string, reqId: string) => {
    setModalType('delete-request');
    setTargetColId(colId);
    setTargetReqId(reqId);
    setIsModalOpen(true);
  };

  const handleToggleCollection = (id: string) => {
    setCollections(collections.map(c => {
      if (c.id === id) return { ...c, isOpen: !c.isOpen };
      return c;
    }));
  };

  const handleSaveRequest = (name: string, config: any) => {
    if (!activeRequest) return;

    // Find which collection owns this request
    // Find which collection owns this request
    setCollections(collections.map(c => {
      if (c.requests.some(r => r.id === activeRequest.id)) {
        return {
          ...c,
          // Update Collection Auth (Shared State)
          auth: {
            type: config.authType,
            token: config.authToken
          },
          requests: c.requests.map(r => {
            if (r.id === activeRequest.id) {
              return {
                ...r,
                name, // update name
                method: config.method, // update badge
                url: config.url,
                config // save full config
              };
            }
            return r;
          })
        };
      }
      return c;
    }));

    // Update local active request to reflect changes immediately
    setActiveRequest(prev => prev ? ({ ...prev, name, method: config.method, config }) : null);
  };

  const activeCollection = collections.find(c => c.requests.some(r => r.id === activeRequest?.id));

  const editorData = activeRequest ? {
    ...activeRequest.config,
    authType: activeCollection?.auth?.type || activeRequest.config.authType || 'none',
    authToken: activeCollection?.auth?.token || activeRequest.config.authToken || ''
  } : undefined;

  const getModalTitle = () => {
    switch (modalType) {
      case 'collection': return 'New Collection';
      case 'request': return 'New Request';
      case 'delete-collection': return 'Delete Collection';
      case 'delete-request': return 'Delete Request';
    }
  };

  return (
    <div className={styles.pageContainer}>
      <CollectionSidebar
        collections={collections}
        activeRequestId={activeRequest?.id || null}
        onSelectRequest={(cid, req) => setActiveRequest(req)}
        onAddCollection={handleAddCollection}
        onAddRequest={handleAddRequest}
        onDeleteCollection={handleDeleteCollection}
        onDeleteRequest={handleDeleteRequest}
        onToggleCollection={handleToggleCollection}
      />

      <div className={styles.rightPanel}>
        {activeRequest ? (
          <RequestEditor
            key={activeRequest.id} // Force remount on switch to avoid stale state issues easily
            data={editorData}
            onSave={handleSaveRequest}
            requestName={activeRequest.name}
          />
        ) : (
          <EmptyState hasEndpoints={true} onImportClick={() => { }} />
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={getModalTitle()}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button
              variant={modalType.startsWith('delete') ? 'danger' : 'primary'}
              onClick={handleConfirmModal}
            >
              {modalType.startsWith('delete') ? 'Delete' : 'Create'}
            </Button>
          </>
        }
      >
        <div>
          {modalType.startsWith('delete') ? (
            <p style={{ fontSize: 13, color: 'var(--text-primary)' }}>
              {modalType === 'delete-collection'
                ? 'Are you sure you want to delete this collection?'
                : 'Are you sure you want to delete this request?'}
            </p>
          ) : (
            <>
              <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>
                {modalType === 'collection' ? 'Collection Name' : 'Request Name'}
              </label>
              <input
                autoFocus
                className={styles.modalInput}
                value={newItemName}
                onChange={(e) => newItemNameSet(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleConfirmModal()}
                placeholder={modalType === 'collection' ? 'My Collection' : 'My Request'}
              />
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
