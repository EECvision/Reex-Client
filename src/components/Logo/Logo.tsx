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

    const isDark = theme === 'dark';

    // Select assets based on theme and orientation
    const logoToUse = isDark
        ? (horizontal ? logoDarkHorizontal : logoDark)
        : (horizontal ? logoLightHorizontal : logoLight);

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
