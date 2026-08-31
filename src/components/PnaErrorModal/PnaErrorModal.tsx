"use client";

import React from "react";
import styles from "./PnaErrorModal.module.css";

import { Button } from "@/components/ui/Button/Button";

export default function PnaErrorModal({
  onSwitchToPreview,
}: {
  onSwitchToPreview: () => void;
}) {
  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2>Connection Blocked</h2>
        </div>
        <div className={styles.content}>
          <p className={styles.message}>
            We could not connect to your local Reex project. This usually
            happens if your CLI is not running or your browser blocked the
            connection.
          </p>
          <div className={styles.instructions}>
            <p>
              <strong>Troubleshooting:</strong>
            </p>
            <ol>
              <li>
                Ensure you have run <code>reex start</code> in your terminal and
                it is still running.
              </li>
              <li>
                Check the top of your browser window (in the URL bar). If you
                see a prompt asking to{" "}
                <strong>
                  &quot;Access other apps and services on this device&quot;
                </strong>
                , click <strong>Allow</strong>.
              </li>
              <li>
                If you don&apos;t see the prompt, click the icon in your address
                bar and enable <strong>Apps on device</strong>.
              </li>
            </ol>
          </div>

          <div className={styles.actions}>
            <Button
              variant="primary"
              className={styles.fullWidthButton}
              onClick={handleReload}
            >
              I have fixed it, reload page
            </Button>
            <Button
              variant="secondary"
              className={styles.fullWidthButton}
              onClick={onSwitchToPreview}
            >
              Switch to Preview Mode
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
