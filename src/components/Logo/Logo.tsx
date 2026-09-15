"use client";

import React from 'react';
import styles from './Logo.module.css';
import Image from 'next/image';
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
    if (icon) {
        return (
            <Image
                className={styles.logoIcon}
                src={logoIcon}
                alt="Reex API Studio Icon"
                priority
            />
        );
    }

    const lightAsset = horizontal ? logoLightHorizontal : logoLight;
    const darkAsset = horizontal ? logoDarkHorizontal : logoDark;

    return (
        <span className={styles.logoContainer}>
            <Image
                className={`${styles.logo} ${horizontal ? styles.horizontal : ''} ${styles.logoLight}`}
                src={lightAsset}
                alt="Reex API Studio Logo"
                priority
            />
            <Image
                className={`${styles.logo} ${horizontal ? styles.horizontal : ''} ${styles.logoDark}`}
                src={darkAsset}
                alt="Reex API Studio Logo"
                priority
            />
        </span>
    );
};

export default Logo;
