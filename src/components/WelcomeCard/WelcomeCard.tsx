import React from 'react';
import styles from './WelcomeCard.module.css';
import { Terminal, Globe, Rocket, Copy, CheckCircle2, Sparkles, Folder } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import Logo from '../Logo/Logo';
import { Button } from '../ui/Button/Button';

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
                <p className={styles.subtitle} style={{ marginTop: '16px' }}>
                    The intelligent API client that bridges your backend to your frontend.
                </p>
            </div>

            <div className={styles.grid}>
                {/* Card 1: Standard API Client */}
                <div className={styles.card}>
                    <div className={styles.cardHeader}>
                        <div className={styles.cardIcon}>
                            <Rocket size={18} />
                        </div>
                        <h3 className={styles.cardTitle}>Standard API Client</h3>
                    </div>
                    <p className={styles.cardDesc}>
                        Skip the setup! Just use Reex right here in your browser as a powerful API client to test your remote endpoints. No installation required.
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
                        <h3 className={styles.cardTitle}>Test Localhost APIs</h3>
                    </div>
                    <p className={styles.cardDesc}>
                        Testing a local backend? Run our lightweight proxy to securely route localhost requests through the web app.
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
                        <h3 className={styles.cardTitle}>Generate APIs to Local Project</h3>
                    </div>
                    <p className={styles.cardDesc}>
                        Connect Reex to your React/Next.js project to instantly generate ready-to-use API hooks and TypeScript interfaces.
                    </p>
                    <div style={{ marginBottom: "6px", fontSize: "12px", color: "var(--text-secondary)", fontWeight: 600 }}>
                        1. Install globally:
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
