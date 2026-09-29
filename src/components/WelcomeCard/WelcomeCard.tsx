import { DOCS_URL } from "@/config/links";
import { useToast } from "@/hooks/useToast";
import {
  BookOpen,
  CheckCircle2,
  Code,
  Copy,
  Folder,
  HelpCircle,
  MonitorPlay,
} from "lucide-react";
import Link from "next/link";
import React from "react";
import Logo from "../Logo/Logo";
import { Button } from "../ui/Button/Button";
import styles from "./WelcomeCard.module.css";

interface WelcomeCardProps {
  onImportClick?: () => void;
}

export default function WelcomeCard({ onImportClick }: WelcomeCardProps) {
  const { showToast } = useToast();
  const [copiedCliInstall, setCopiedCliInstall] = React.useState(false);
  const [copiedCliStart, setCopiedCliStart] = React.useState(false);

  const handleCopy = (
    text: string,
    setCopied: React.Dispatch<React.SetStateAction<boolean>>,
  ) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    showToast("success", "Command copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Logo horizontal />
        <p className={styles.subtitle}>
          Import Postman or OpenAPI collections, test endpoints in your browser,
          and instantly generate production-ready TanStack Query hooks, API
          functions, and TypeScript types directly into your local codebase.
        </p>
        <nav className={styles.resourceLinks} aria-label="Reex resources">
          <a
            href={DOCS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.navLink}
          >
            <BookOpen size={14} />
            <span>Documentation</span>
          </a>
          <Link href="/support" className={styles.navLink}>
            <HelpCircle size={14} />
            <span>Help &amp; troubleshooting</span>
          </Link>
        </nav>
      </div>

      {/* 2-Column Action Grid (Preview Mode & Dev Mode side-by-side) */}
      <div className={styles.cardGrid}>
        {/* Card 1: Preview Mode */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={`${styles.cardIcon} ${styles.iconPreview}`}>
              <MonitorPlay size={18} />
            </div>
            <div className={styles.cardTitleWrap}>
              <h2 className={styles.cardTitle}>Preview Mode</h2>
              <span className={styles.cardSubtitle}>Standard API client</span>
            </div>
          </div>
          <p className={styles.cardDesc}>
            Import Postman or OpenAPI collections to test endpoints in your
            browser.
          </p>
          <div className={styles.cardAction}>
            {onImportClick && (
              <Button
                variant="primary"
                onClick={onImportClick}
                leftIcon={<Folder size={15} />}
                className={styles.importBtn}
              >
                Import Collection
              </Button>
            )}
          </div>
        </div>

        {/* Card 2: Dev Mode */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={`${styles.cardIcon} ${styles.iconDev}`}>
              <Code size={18} />
            </div>
            <div className={styles.cardTitleWrap}>
              <h2 className={styles.cardTitle}>Dev Mode</h2>
              <span className={styles.cardSubtitle}>
                Connected to local codebase
              </span>
            </div>
          </div>
          <p className={styles.cardDesc}>
            Generate typed API hooks and interfaces directly into your
            project.
          </p>
          <div className={styles.cardAction}>
            <div className={styles.cmdGroup}>
              <div className={styles.codeBox}>
                <span className={styles.codePrompt}>$</span>
                <span className={styles.codeLine}>npm i -g reex-cli</span>
                <button
                  className={styles.copyBtn}
                  onClick={() =>
                    handleCopy("npm install -g reex-cli", setCopiedCliInstall)
                  }
                  title="Copy install command"
                  aria-label="Copy npm install command"
                >
                  {copiedCliInstall ? (
                    <CheckCircle2 size={13} className={styles.copiedIcon} />
                  ) : (
                    <Copy size={13} />
                  )}
                </button>
              </div>
              <div className={styles.codeBox}>
                <span className={styles.codePrompt}>$</span>
                <span className={styles.codeLine}>reex start</span>
                <button
                  className={styles.copyBtn}
                  onClick={() => handleCopy("reex start", setCopiedCliStart)}
                  title="Copy start command"
                  aria-label="Copy reex start command"
                >
                  {copiedCliStart ? (
                    <CheckCircle2 size={13} className={styles.copiedIcon} />
                  ) : (
                    <Copy size={13} />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
