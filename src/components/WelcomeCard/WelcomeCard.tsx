import { DOCS_URL } from "@/config/links";
import { useToast } from "@/hooks/useToast";
import {
  BookOpen,
  CheckCircle2,
  Code,
  Compass,
  Copy,
  Folder,
  HelpCircle,
  MonitorPlay,
  TestTube,
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
  const [copiedProxy, setCopiedProxy] = React.useState(false);
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
          <Link href="/sandbox" className={styles.navLink}>
            <Compass size={14} />
            <span>API Sandbox</span>
          </Link>
          <Link href="/support" className={styles.navLink}>
            <HelpCircle size={14} />
            <span>Help &amp; troubleshooting</span>
          </Link>
        </nav>
      </div>

      {/* Clean Action Rows (Linear / VS Code Style) */}
      <div className={styles.actionList}>
        {/* Row 1: Preview Mode */}
        <div className={styles.actionRow}>
          <div className={styles.rowLeft}>
            <div className={`${styles.rowIcon} ${styles.iconPreview}`}>
              <MonitorPlay size={18} />
            </div>
            <div className={styles.rowInfo}>
              <div className={styles.rowTitleWrap}>
                <h2 className={styles.rowTitle}>Preview Mode</h2>
                <span className={styles.rowSubtitle}>Standard API client</span>
              </div>
              <p className={styles.rowDesc}>
                Import Postman or OpenAPI collections to test endpoints in your
                browser.
              </p>
            </div>
          </div>
          {onImportClick && (
            <div className={styles.rowRight}>
              <Button
                variant="primary"
                onClick={onImportClick}
                leftIcon={<Folder size={15} />}
                className={styles.importBtn}
              >
                Import Collection
              </Button>
            </div>
          )}
        </div>

        {/* Row 2: API Sandbox */}
        <div className={styles.actionRow}>
          <div className={styles.rowLeft}>
            <div className={`${styles.rowIcon} ${styles.iconSandbox}`}>
              <TestTube size={18} />
            </div>
            <div className={styles.rowInfo}>
              <div className={styles.rowTitleWrap}>
                <h2 className={styles.rowTitle}>API Sandbox</h2>
                <span className={styles.rowSubtitle}>Build and test APIs</span>
              </div>
              <p className={styles.rowDesc}>
                Test localhost endpoints and prototype requests from scratch.
              </p>
            </div>
          </div>
          <div className={styles.rowRight}>
            <div className={styles.codeBox}>
              <span className={styles.codePrompt}>$</span>
              <span className={styles.codeLine}>npx reex-proxy</span>
              <button
                className={styles.copyBtn}
                onClick={() => handleCopy("npx reex-proxy", setCopiedProxy)}
                title="Copy command"
                aria-label="Copy npx reex-proxy"
              >
                {copiedProxy ? (
                  <CheckCircle2 size={13} className={styles.copiedIcon} />
                ) : (
                  <Copy size={13} />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Row 3: Dev Mode */}
        <div className={styles.actionRow}>
          <div className={styles.rowLeft}>
            <div className={`${styles.rowIcon} ${styles.iconDev}`}>
              <Code size={18} />
            </div>
            <div className={styles.rowInfo}>
              <div className={styles.rowTitleWrap}>
                <h2 className={styles.rowTitle}>Dev Mode</h2>
                <span className={styles.rowSubtitle}>
                  Connected to local codebase
                </span>
              </div>
              <p className={styles.rowDesc}>
                Generate typed API hooks and interfaces directly into your
                project.
              </p>
            </div>
          </div>
          <div className={styles.rowRight}>
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
