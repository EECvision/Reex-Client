"use client";

import { useState } from "react";
import { X } from "lucide-react";
import styles from "./MobileGuard.module.css";

export const MobileGuard = ({ children }: { children: React.ReactNode }) => {
  const [dismissed, setDismissed] = useState(false);

  return (
    <>
      {children}
      {!dismissed && (
        <aside className={styles.notice} aria-label="Desktop experience tip">
          <p>
            For more room to edit and test APIs, try Reex on a desktop or laptop.
          </p>
          <button
            type="button"
            className={styles.dismiss}
            aria-label="Dismiss desktop tip"
            onClick={() => setDismissed(true)}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </aside>
      )}
    </>
  );
};
