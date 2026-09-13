import React from 'react';
import styles from './WelcomeCard.module.css';
import { Terminal, Globe, Rocket, Copy, CheckCircle2, Folder, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import Logo from '../Logo/Logo';
import { Button } from '../ui/Button/Button';
import Link from 'next/link';
import { DOCS_URL } from '@/config/links';

interface WelcomeCardProps {
    onImportClick?: () => void;
}

export default function WelcomeCard({ onImportClick }: WelcomeCardProps) {
    const { showToast } = useToast();
    const [copiedProxy, setCopiedProxy] = React.useState(false);
    const [copiedCliInstall, setCopiedCliInstall] = React.useState(false);
    const [copiedCliStart, setCopiedCliStart] = React.useState(false);

    const handleCopy = (text: string, setCopied: React.Dispatch<React.SetStateAction<boolean>>) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        showToast('success', 'Command copied to clipboard');
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <Logo horizontal />
                <h1 className={styles.title}>API Client &amp; TypeScript Code Generator</h1>
                <p className={styles.subtitle}>
                    Import Postman and OpenAPI collections, test endpoints, and generate
                    the API layer for your React or Next.js app. Reex connects your API
                    functions, TanStack Query hooks, and TypeScript interfaces to your local codebase.
                </p>
                <nav className={styles.resourceLinks} aria-label="Reex resources">
                    <a href={DOCS_URL}>Documentation</a>
                    <Link href="/sandbox">API Sandbox</Link>
                    <Link href="/support">Help &amp; troubleshooting</Link>
                </nav>
            </div>

            <div className={styles.grid}>
                {/* Card 1: Standard API Client */}
                <div className={styles.card}>
                    <div className={styles.cardHeader}>
                        <div className={styles.cardIcon}>
                            <Rocket size={18} />
                        </div>
                        <h2 className={styles.cardTitle}>Import &amp; Test Collections</h2>
                    </div>
                    <p className={styles.cardDesc}>
                        Import Postman or OpenAPI collections, configure request parameters
                        and authentication, and inspect responses in Preview Mode.
                        No account or local project required.
                    </p>
                    {onImportClick && (
                        <div style={{ marginTop: 'auto' }}>
                            <Button 
                                variant="primary" 
                                onClick={onImportClick}
                                leftIcon={<Folder size={16} />}
                                style={{ width: '100%', height: '44px' }}
                            >
                                Import Collection
                            </Button>
                        </div>
                    )}
                </div>

                {/* Card 2: Test Localhost */}
                <div className={styles.card}>
                    <div className={styles.cardHeader}>
                        <div className={styles.cardIcon}>
                            <Globe size={18} />
                        </div>
                        <h2 className={styles.cardTitle}>Test Localhost APIs</h2>
                    </div>
                    <p className={styles.cardDesc}>
                        Run reex-proxy to test your local backend from the browser.
                        Use API Sandbox to create and organize requests from scratch,
                        even without an API collection.
                    </p>
                    <div className={styles.codeBox}>
                        <div className={styles.codeLines}>
                            <span className={styles.codeLine}>npx reex-proxy</span>
                        </div>
                        <button 
                            className={styles.copyBtn} 
                            onClick={() => handleCopy('npx reex-proxy', setCopiedProxy)}
                            title="Copy command"
                        >
                            {copiedProxy ? <CheckCircle2 size={14} color="#10b981" /> : <Copy size={14} />}
                        </button>
                    </div>
                </div>

                {/* Card 3: Generate Code */}
                <div className={styles.card}>
                    <div className={styles.cardHeader}>
                        <div className={styles.cardIcon}>
                            <Terminal size={18} />
                        </div>
                        <h2 className={styles.cardTitle}>Generate React &amp; Next.js Code</h2>
                    </div>
                    <p className={styles.cardDesc}>
                        Connect your project in Dev Mode to generate API functions,
                        TanStack Query hooks, and authentication helpers. Save TypeScript
                        interfaces from real responses, keep API definitions in sync with
                        your code, and review collection changes before applying them.
                    </p>
                    <div className={styles.stepHeader}>
                        <span className={styles.stepTitle}>1. Install globally:</span>
                        <a
                            href="https://www.npmjs.com/package/reex-cli"
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.npmLink}
                            title="View reex-cli on npm"
                        >
                            <span>npm</span>
                            <ExternalLink size={11} />
                        </a>
                    </div>
                    <div className={styles.codeBox} style={{ marginBottom: "12px" }}>
                        <div className={styles.codeLines}>
                            <span className={styles.codeLine}>npm install -g reex-cli</span>
                        </div>
                        <button 
                            className={styles.copyBtn} 
                            onClick={() => handleCopy('npm install -g reex-cli', setCopiedCliInstall)}
                            title="Copy command"
                        >
                            {copiedCliInstall ? <CheckCircle2 size={14} color="#10b981" /> : <Copy size={14} />}
                        </button>
                    </div>
                    <div style={{ marginBottom: "6px", fontSize: "12px", color: "var(--text-secondary)", fontWeight: 600 }}>
                        2. Run in your project directory:
                    </div>
                    <div className={styles.codeBox}>
                        <div className={styles.codeLines}>
                            <span className={styles.codeLine}>reex start</span>
                        </div>
                        <button 
                            className={styles.copyBtn} 
                            onClick={() => handleCopy('reex start', setCopiedCliStart)}
                            title="Copy command"
                        >
                            {copiedCliStart ? <CheckCircle2 size={14} color="#10b981" /> : <Copy size={14} />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
