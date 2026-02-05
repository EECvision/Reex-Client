"use client";

import React from "react";
import styles from "./subscription.module.css";
import { Button } from "@/components/ui/Button/Button";
import { Check } from "lucide-react";
import { useRouter } from "next/navigation";

export default function SubscriptionPage() {
    const router = useRouter();

    return (
        <main className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>Plans & Pricing</h1>
                <p className={styles.subtitle}>Simple, transparent pricing for every developer.</p>
            </header>

            <div className={styles.currentPlan}>
                <div className={styles.planInfo}>
                    <h3>Current Plan</h3>
                    <div className={styles.planName}>
                        Free Tier
                        <span className={styles.badge}>Active</span>
                    </div>
                </div>
                <Button variant="ghost" onClick={() => router.push('/')}>Back to Workspace</Button>
            </div>

            <div className={styles.plansGrid}>
                {/* Free Plan */}
                <div className={styles.planCard}>
                    <h3 style={{ fontSize: 20, fontWeight: 600 }}>Hobby</h3>
                    <div className={styles.price}>$0<span>/mo</span></div>
                    <ul className={styles.features}>
                        <li className={styles.feature}><Check size={18} className={styles.check} /> 3 Active Collections</li>
                        <li className={styles.feature}><Check size={18} className={styles.check} /> 1,000 Requests/mo</li>
                        <li className={styles.feature}><Check size={18} className={styles.check} /> Community Support</li>
                        <li className={styles.feature}><Check size={18} className={styles.check} /> Local Storage</li>
                    </ul>
                    <Button variant="secondary" disabled>Current Plan</Button>
                </div>

                {/* Pro Plan */}
                <div className={`${styles.planCard} ${styles.featured}`}>
                    <div className={styles.featuredLabel}>RECOMMENDED</div>
                    <h3 style={{ fontSize: 20, fontWeight: 600 }}>Pro Developer</h3>
                    <div className={styles.price}>$19<span>/mo</span></div>
                    <ul className={styles.features}>
                        <li className={styles.feature}><Check size={18} className={styles.check} /> Unlimited Collections</li>
                        <li className={styles.feature}><Check size={18} className={styles.check} /> Unlimited Requests</li>
                        <li className={styles.feature}><Check size={18} className={styles.check} /> Cloud Sync & Backup</li>
                        <li className={styles.feature}><Check size={18} className={styles.check} /> Team Collaboration</li>
                    </ul>
                    <Button variant="primary">Upgrade to Pro</Button>
                </div>
            </div>
        </main>
    );
}
