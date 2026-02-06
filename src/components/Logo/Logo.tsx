"use client";

import React from 'react';
import styles from './Logo.module.css';
import Image from 'next/image';
import { useSettings } from '@/providers/SettingsContext';
import logoIcon from "@/assets/logo-icon.svg";
import logoLight from "@/assets/logo-light.svg";
import logoLightHorizontal from "@/assets/logo-light-2.svg";
import logoDark from "@/assets/logo-dark.svg";
import logoDarkHorizontal from "@/assets/logo-dark-2.svg";

interface LogoProps {
    icon?: boolean;
    horizontal?: boolean;
}

const Logo: React.FC<LogoProps> = ({ icon, horizontal }) => {
    const { theme } = useSettings();
    const [isLight, setIsLight] = React.useState(true);

    React.useEffect(() => {
        const checkTheme = () => {
            if (theme === 'system') {
                setIsLight(!window.matchMedia('(prefers-color-scheme: dark)').matches);
            } else {
                setIsLight(theme === 'light');
            }
        };

        checkTheme();

        if (theme === 'system') {
            const mq = window.matchMedia('(prefers-color-scheme: dark)');
            mq.addEventListener('change', checkTheme);
            return () => mq.removeEventListener('change', checkTheme);
        }
    }, [theme]);

    // Select assets based on theme and orientation
    const logoToUse = isLight
        ? (horizontal ? logoLightHorizontal : logoLight)
        : (horizontal ? logoDarkHorizontal : logoDark)

    return (
        <>
            {icon ? (
                <Image className={styles.logoIcon} src={logoIcon} alt="ReexAPI Icon" priority />
            ) : (
                <Image className={`${styles.logo} ${horizontal ? styles.horizontal : ''}`} src={logoToUse} alt="ReexAPI Logo" priority />
            )}
        </>
    );
};

export default Logo;
