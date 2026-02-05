"use client";

import React from "react";
import styles from "./dashboard.module.css";
import { useAuth } from "@/providers/AuthContext";
import { Activity, Layers, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button/Button";

export default function DashboardPage() {
    const { user, isAuthenticated } = useAuth();
    const router = useRouter();

    // Protect the route
    React.useEffect(() => {
        if (!isAuthenticated && !user) {
            router.push("/");
        }
    }, [isAuthenticated, user, router]);

    if (!user) return null;

    return (
        <main className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>Welcome back, {user.name}</h1>
                <p className={styles.subtitle}>Here is what is happening with your APIs today.</p>
            </header>

            <div className={styles.grid}>
                <div className={styles.card}>
                    <div className={styles.cardTitle}>Total Requests</div>
                    <div className={styles.cardValue}>1,248</div>
                    <div className={styles.cardMeta}>
                        <Activity size={14} />
                        <span>+12% from last week</span>
                    </div>
                </div>

                <div className={styles.card}>
                    <div className={styles.cardTitle}>Success Rate</div>
                    <div className={styles.cardValue}>99.8%</div>
                    <div className={styles.cardMeta}>
                        <Zap size={14} />
                        <span>Optimal Performance</span>
                    </div>
                </div>

                <div className={styles.card}>
                    <div className={styles.cardTitle}>Active Collections</div>
                    <div className={styles.cardValue}>3</div>
                    <div className={styles.cardMeta}>
                        <Layers size={14} />
                        <span>All systems operational</span>
                    </div>
                </div>
            </div>

            <section>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h2 className={styles.sectionTitle}>Recent Activity</h2>
                    <Button variant="ghost" size="sm" onClick={() => router.push('/')}>View All</Button>
                </div>

                <div className={styles.recentList}>
                    <div className={styles.emptyState}>
                        <p>No recent activity generated yet.</p>
                        <Button
                            variant="primary"
                            style={{ marginTop: 16 }}
                            onClick={() => router.push('/')}
                        >
                            Start Building
                        </Button>
                    </div>
                </div>
            </section>
        </main>
    );
}
