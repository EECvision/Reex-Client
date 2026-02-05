"use client";
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TestTube } from 'lucide-react';
import styles from './FloatingTestButton.module.css';

const FloatingTestButton = () => {
    const pathname = usePathname();

    // Only show on workspace (root)
    if (pathname !== '/') {
        return null;
    }

    return (
        <Link href="/test-api" className={styles.fab}>
            <span className={styles.label}>Test API</span>
            <TestTube size={16} style={{ flexShrink: 0 }} />
        </Link>
    );
};

export default FloatingTestButton;
