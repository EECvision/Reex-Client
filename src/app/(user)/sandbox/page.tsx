"use client";

import { useState, useEffect } from "react";
import styles from "./page.module.css";
import CollectionSidebar, {
  RequestItem,
} from "@/components/TestApi/CollectionSidebar";
import RequestEditor from "@/components/TestApi/RequestEditor";
import EmptyState from "@/components/EmptyState/EmptyState";
import { Assistant } from "@/components/Assistant/Assistant";
import { TestApiAuthModal } from "@/components/TestApiAuthModal/TestApiAuthModal";
import { Modal } from "@/components/ui/Modal/Modal";
import { Button } from "@/components/ui/Button/Button";
import { Loading } from "@/components/ui/Loading/Loading";
import { useAuth } from "@/providers/AuthContext";
import { signOut } from "next-auth/react";
import { useCollections } from "@/hooks/useCollections";
import { useToast } from "@/hooks/useToast";

import { useUI } from "@/providers/UIContext";
import LoginModal from "@/components/LoginModal/LoginModal";
import { ResizablePanel } from "@/components/ui/ResizablePanel/ResizablePanel";
import TestApiNavbar from "@/components/TestApiNavbar/TestApiNavbar";

export default function TestApiPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { isSidebarOpen, setSidebarOpen, setHasSidebar } = useUI();

  // Prevent default browser right-click context menu globally
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    document.addEventListener("contextmenu", handleContextMenu);
    return () => document.removeEventListener("contextmenu", handleContextMenu);
  }, []);

  // Collections Data via TanStack Query
  const {
    collections,
    isLoading,
    createCollection,
    deleteCollection,
    renameCollection,
    createRequest,
    updateRequest,
    deleteRequest,
    toggleCollection,
    updateCollection,
  } = useCollections(user?.id);

  // Active Request & Collection State
  const [activeRequest, setActiveRequest] = useState<RequestItem | null>(null);
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [modalType, setModalType] = useState<
    "collection" | "request" | "delete-collection" | "delete-request"
  >("collection");
  const [newItemName, newItemNameSet] = useState("");
  const [targetColId, setTargetColId] = useState<string | null>(null);
  const [targetReqId, setTargetReqId] = useState<string | null>(null);
  
  // Auth Modal State
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    setHasSidebar(true);
    if (typeof window !== "undefined" && window.innerWidth > 1140) {
      setSidebarOpen(true);
    }
    return () => setHasSidebar(false);
  }, [setHasSidebar, setSidebarOpen]);

  // --- Actions ---

  const handleAddCollection = async () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }

    // Check for stale session (User object exists but has no ID)
    if (user && !user.id) {
      console.warn("Stale session detected: User has no ID");
      showToast("error", "Session incomplete. Please sign in again.");
      // Force logout to clear stale token
      await signOut({ redirect: false });
      setShowLoginModal(true);
      return;
    }

    setModalType("collection");
    newItemNameSet("");
    setIsModalOpen(true);
  };

  const handleAddRequest = (collectionId: string) => {
    setModalType("request");
    setTargetColId(collectionId);
    newItemNameSet("");
    setIsModalOpen(true);
  };

  const confirmDeleteCollection = async () => {
    if (!targetColId) return;
    setIsActionLoading(true);
    try {
      await deleteCollection(targetColId);
      if (
        activeRequest &&
        collections
          .find((c) => c.id === targetColId)
          ?.requests.find((r) => r.id === activeRequest.id)
      ) {
        setActiveRequest(null);
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error(error);
    } finally {
      setIsActionLoading(false);
    }
  };

  const confirmDeleteRequest = async () => {
    if (!targetColId || !targetReqId) return;
    setIsActionLoading(true);
    try {
      await deleteRequest({
        collectionId: targetColId,
        requestId: targetReqId,
      });
      if (activeRequest?.id === targetReqId) {
        setActiveRequest(null);
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error(error);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleConfirmModal = async () => {
    if (modalType === "delete-collection") {
      await confirmDeleteCollection();
      return;
    }
    if (modalType === "delete-request") {
      await confirmDeleteRequest();
      return;
    }


    if (!newItemName.trim()) return;

    setIsActionLoading(true);
    try {
      if (modalType === "collection") {
        if (!user?.id) {
          showToast("error", "You must be logged in");
          return;
        }
        await createCollection(newItemName);
      } else {
        if (!targetColId) return;
        const result = await createRequest({
          collectionId: targetColId,
          name: newItemName,
        });
        if (result && (result as Record<string, unknown>).error) {
          // Error handled in hook toast
          return;
        }
        setActiveRequest(result as RequestItem);
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error(error);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDeleteCollection = (id: string) => {
    setModalType("delete-collection");
    setTargetColId(id);
    setIsModalOpen(true);
  };

  const handleDeleteRequest = (colId: string, reqId: string) => {
    setModalType("delete-request");
    setTargetColId(colId);
    setTargetReqId(reqId);
    setIsModalOpen(true);
  };

  const handleToggleCollection = (id: string) => {
    setActiveCollectionId(id);
    toggleCollection(id);
  };

  const handleSaveRequest = async (name: string, config: unknown) => {
    if (!activeRequest) return;

    const activeCol = collections.find((c) =>
      c.requests.some((r) => r.id === activeRequest.id),
    );
    if (!activeCol) return;

    try {
      const configObj = config as Record<string, string>;
      await updateRequest({
        id: activeRequest.id,
        updates: {
          name,
          method: configObj.method,
          url: configObj.url,
          config: config as Record<string, unknown>,
        },
      });

      setActiveRequest((prev) =>
        prev ? { ...prev, name, method: configObj.method, config } : null,
      );
    } catch (error) {
      console.error(error);
    }
  };

  const requestCollection = collections.find((c) =>
    c.requests.some((r) => r.id === activeRequest?.id),
  );

  const activeCollection = activeCollectionId 
    ? collections.find((c) => c.id === activeCollectionId)
    : requestCollection;

  const configObj = activeRequest?.config as Record<string, unknown> | undefined;
  const editorData = activeRequest
    ? {
        ...(configObj || {}),
        method: activeRequest.method,
        url: activeRequest.url,
        baseUrl: requestCollection?.base_url || "",
        authType:
          (requestCollection?.auth?.type ||
          (configObj?.auth as Record<string, string>)?.type ||
          "none") as "bearer" | "none",
        authToken:
          requestCollection?.auth?.token ||
          (configObj?.auth as Record<string, string>)?.token ||
          "",
        customHeaders: requestCollection?.auth?.customHeaders || {},
      }
    : undefined;

  const getModalTitle = () => {
    switch (modalType) {
      case "collection":
        return "New Collection";
      case "request":
        return "New Request";
      case "delete-collection":
        return "Delete Collection";
      case "delete-request":
        return "Delete Request";
    }
  };

  return (
    <div className={styles.pageContainer}>
      <div
        className={`${styles.sidebarOverlay} ${isSidebarOpen ? styles.showOverlay : ""}`}
        onClick={() => setSidebarOpen(false)}
      />

      <ResizablePanel
        isOpen={isSidebarOpen}
        defaultWidth={320}
        minWidth={200}
        maxWidth={600}
        collapsedWidth={64}
        className={styles.sidebarResizer}
      >
        <CollectionSidebar
          collections={collections}
          activeRequestId={activeRequest?.id || null}
          onSelectRequest={(cid, req) => {
            setActiveCollectionId(cid);
            setActiveRequest(req);
            if (window.innerWidth <= 1140) setSidebarOpen(false);
          }}
          onAddRequest={handleAddRequest}
          onDeleteCollection={handleDeleteCollection}
          onDeleteRequest={handleDeleteRequest}
          onToggleCollection={handleToggleCollection}
          onRenameCollection={(id, name) => renameCollection({ id, name })}
          isOpen={isSidebarOpen}
          onToggleSidebar={() => setSidebarOpen(!isSidebarOpen)}
          onAddCollection={handleAddCollection}
        />
      </ResizablePanel>

      <div className={styles.rightPanel}>
        <TestApiNavbar 
          onAddCollection={handleAddCollection}
          activeCollection={activeCollection}
          onBaseUrlChange={(url) => {
            if (activeCollectionId) {
              updateCollection({ id: activeCollectionId, updates: { base_url: url } });
            }
          }}
          onAuthClick={() => {
            setShowAuthModal(true);
          }}
          onAskDocsClick={() => {
            setIsAssistantOpen(true);
          }}
          isAssistantOpen={isAssistantOpen}
        />
        {isLoading ? (
          <Loading />
        ) : activeRequest ? (
          <RequestEditor
            key={activeRequest.id}
            data={editorData}
            onSave={handleSaveRequest}
            requestName={activeRequest.name}
            requestId={activeRequest.id}
          />
        ) : (
          <EmptyState hasEndpoints={true} onImportClick={() => {}} />
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={getModalTitle()}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant={modalType.startsWith("delete") ? "danger" : "primary"}
              onClick={handleConfirmModal}
              isLoading={isActionLoading}
              disabled={!modalType.startsWith("delete") && !newItemName.trim()}
            >
              {modalType.startsWith("delete") ? "Delete" : "Create"}
            </Button>
          </>
        }
      >
        <div>
          {modalType.startsWith("delete") ? (
            <p style={{ fontSize: 13, color: "var(--text-primary)" }}>
              {modalType === "delete-collection"
                ? "Are you sure you want to delete this collection?"
                : "Are you sure you want to delete this request?"}
            </p>

          ) : (
            <>
              <label
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--text-secondary)",
                }}
              >
                {modalType === "collection"
                  ? "Collection Name"
                  : "Request Name"}
              </label>
              <input
                autoFocus
                className={styles.modalInput}
                value={newItemName}
                onChange={(e) => newItemNameSet(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleConfirmModal()}
                placeholder={
                  modalType === "collection" ? "My Collection" : "My Request"
                }
              />
            </>
          )}
        </div>
      </Modal>

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        message="Sign in to create your first API collection."
      />
      
      <TestApiAuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        collections={collections}
        activeCollectionId={activeCollectionId || undefined}
        onSave={(collectionId, token, customHeaders) => {
          updateCollection({
            id: collectionId,
            updates: { auth: { type: "bearer", token, customHeaders } },
          });
          setShowAuthModal(false);
        }}
      />

      <Assistant
        isOpen={isAssistantOpen}
        onClose={() => setIsAssistantOpen(false)}
      />
    </div>
  );
}
