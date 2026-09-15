import React from "react";
import Link from "next/link";
import { BookOpen, HelpCircle } from "lucide-react";
import Logo from "../Logo/Logo";
import { DOCS_URL } from "@/config/links";
import styles from "./WorkspaceLoading.module.css";

export default function WorkspaceLoading() {
  return (
    <main className={styles.loadingContainer} id="main-content">
      <div className={styles.loadingCard}>
        <div className={styles.logoWrapper}>
          <Logo horizontal />
        </div>

        <div className={styles.spinnerSection}>
          <div className={styles.spinner} aria-hidden="true" />
          <p className={styles.statusText} role="status">
            Loading project workspace...
          </p>
        </div>

        <div className={styles.featureInfo}>
          <p className={styles.featureHighlight}>
            Import Postman or OpenAPI collections, test endpoints in your browser,
            and generate type-safe TanStack Query hooks for React.
          </p>
        </div>

        <nav className={styles.linksNav} aria-label="Quick links">
          <Link href="/support" className={styles.link}>
            <HelpCircle size={14} aria-hidden="true" />
            <span>Help &amp; troubleshooting</span>
          </Link>
          <span className={styles.divider} aria-hidden="true">•</span>
          <a
            href={DOCS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.link}
          >
            <BookOpen size={14} aria-hidden="true" />
            <span>Documentation</span>
          </a>
        </nav>
      </div>
    </main>
  );
}
