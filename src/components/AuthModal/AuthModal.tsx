import React, { useState, useEffect } from "react";
import { Lock, Plus, Trash2, X } from "lucide-react";
import styles from "./AuthModal.module.css";
import { Button } from "../ui/Button/Button";
import { Modal } from "../ui/Modal/Modal";
import { StandaloneCollection } from "@/providers/ProjectContext";
import { useToast } from "@/hooks/useToast";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  collections: StandaloneCollection[];
  activeCollectionId?: string;
  onSave: (
    collectionId: string,
    token: string,
    customHeaders: Record<string, string>,
  ) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  collections,
  activeCollectionId,
  onSave,
}) => {
  const { showToast } = useToast();
  const [selectedId, setSelectedId] = useState<string>("");
  const [draftToken, setDraftToken] = useState("");
  const [draftHeaders, setDraftHeaders] = useState<
    { id: string; key: string; value: string }[]
  >([]);

  // Initialize selected collection
  useEffect(() => {
    if (isOpen) {
      if (
        activeCollectionId &&
        collections.some((c) => c.id === activeCollectionId)
      ) {
        setSelectedId(activeCollectionId);
      } else if (collections.length > 0) {
        setSelectedId(collections[0].id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, activeCollectionId]);

  // Load state when selected collection changes
  useEffect(() => {
    if (!isOpen || !selectedId) return;

    const col = collections.find((c) => c.id === selectedId);
    if (col) {
      const auth = col.config?.auth || {};
      setDraftToken(auth.token || "");

      const headers = auth.customHeaders || {};
      const headersArray = Object.entries(headers).map(
        ([key, value], index) => ({
          id: `header-${index}-${Date.now()}`,
          key,
          value: value as string,
        }),
      );
      setDraftHeaders(headersArray);
    }
    // Only re-run when the modal opens or the selected collection changes.
    // Do NOT include `collections` to prevent background renders from overwriting user drafts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, isOpen]);

  if (!isOpen) return null;

  const handleHeaderChange = (
    id: string,
    field: "key" | "value",
    text: string,
  ) => {
    setDraftHeaders((prev) =>
      prev.map((h) => (h.id === id ? { ...h, [field]: text } : h)),
    );
  };

  const addHeader = () => {
    setDraftHeaders((prev) => [
      ...prev,
      { id: `new-${Date.now()}`, key: "", value: "" },
    ]);
  };

  const removeHeader = (id: string) => {
    setDraftHeaders((prev) => prev.filter((h) => h.id !== id));
  };

  const handleSave = () => {
    if (!selectedId) return;
    const headersObj: Record<string, string> = {};
    draftHeaders.forEach((h) => {
      if (h.key.trim()) {
        headersObj[h.key.trim()] = h.value;
      }
    });
    onSave(selectedId, draftToken, headersObj);
    showToast("success", "Authorization settings saved");
  };



  // Check if a collection has auth configured to show a tiny green dot
  const hasAuth = (col: StandaloneCollection) => {
    const auth = col.config?.auth;
    return !!(
      auth?.token ||
      (auth?.customHeaders && Object.keys(auth.customHeaders).length > 0)
    );
  };

  const modalTitle = (
    <div className={styles.title}>
      <Lock size={18} />
      Authorization Settings
    </div>
  );

  const modalFooter = (
    <div className={styles.footerInner}>
      {/* <Button variant="danger" onClick={handleClear} disabled={!selectedId}>
                Clear
            </Button> */}
      <div style={{ flex: 1 }} />
      <Button variant="secondary" onClick={onClose}>
        Cancel
      </Button>
      <Button variant="primary" onClick={handleSave} disabled={!selectedId}>
        Save Changes
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      footer={modalFooter}
      size="lg"
      className={styles.modalOverride}
    >
      <div className={styles.content}>
        {/* Sidebar Area - Collections List */}
        <div className={styles.sidebar}>
          <div className={styles.sidebarTitle}>Collections</div>
          <div className={styles.collectionList}>
            {collections.map((col) => (
              <div
                key={col.id}
                className={`${styles.collectionItem} ${selectedId === col.id ? styles.active : ""}`}
                onClick={() => setSelectedId(col.id)}
              >
                <span
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {col.name}
                </span>
                {hasAuth(col) && (
                  <div className={styles.authBadge} title="Auth configured" />
                )}
              </div>
            ))}
            {collections.length === 0 && (
              <div
                style={{
                  padding: "0 16px",
                  fontSize: "13px",
                  color: "#9ca3af",
                  fontStyle: "italic",
                }}
              >
                No collections found.
              </div>
            )}
          </div>
        </div>

        {/* Main Area - Auth Config */}
        <div className={styles.mainPanel}>
          {selectedId ? (
            <>
              <div className={styles.section}>
                <div className={styles.sectionHeader}>Bearer Token</div>
                <div className={styles.inputGroup}>
                  <div
                    style={{
                      position: "relative",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <input
                      type="text"
                      placeholder="Enter token from auth/signin"
                      className={styles.input}
                      value={draftToken}
                      onChange={(e) => setDraftToken(e.target.value)}
                      style={{ paddingRight: draftToken ? "36px" : undefined }}
                    />
                    {draftToken && (
                      <button
                        onClick={() => setDraftToken("")}
                        className={styles.clearButton}
                        title="Clear token"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <span>Custom Headers</span>
                  <Button variant="secondary" size="sm" onClick={addHeader}>
                    <Plus size={14} style={{ marginRight: 4 }} /> Add
                  </Button>
                </div>

                {draftHeaders.length > 0 ? (
                  <div className={styles.scrollableHeaders}>
                    {draftHeaders.map((header) => (
                      <div key={header.id} className={styles.headerRow}>
                        <input
                          type="text"
                          placeholder="Key (e.g. X-Api-Key)"
                          className={styles.input}
                          style={{ flex: 1 }}
                          value={header.key}
                          onChange={(e) =>
                            handleHeaderChange(header.id, "key", e.target.value)
                          }
                        />
                        <input
                          type="text"
                          placeholder="Value"
                          className={styles.input}
                          style={{ flex: 2 }}
                          value={header.value}
                          onChange={(e) =>
                            handleHeaderChange(
                              header.id,
                              "value",
                              e.target.value,
                            )
                          }
                        />
                        <Button
                          variant="ghost"
                          onClick={() => removeHeader(header.id)}
                          style={{ color: "#ef4444", padding: "8px" }}
                          title="Remove Header"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={styles.emptyState}>
                    No custom headers added for this collection.
                  </div>
                )}
              </div>
            </>
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                color: "#9ca3af",
              }}
            >
              Select a collection to configure Authorization.
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
