"use client";

import React, { useState } from "react";
import styles from "./subscription.module.css";
import { Button } from "@/components/ui/Button/Button";
import { Check, Loader2 } from "lucide-react";
import { Loading } from '@/components/ui/Loading/Loading';
import { useRouter } from "next/navigation";
import { useSubscription } from "@/hooks/useSubscription";
import { closePaymentModal } from "flutterwave-react-v3";
import { useFlutterwaveCustom } from "@/hooks/useFlutterwaveCustom";
import { useQueryClient } from "@tanstack/react-query";
import LoginModal from "@/components/LoginModal/LoginModal";

import { SubscriptionStatusModal } from "./_components/SubscriptionStatusModal";
import { PRICING, PLAN_IDS } from "@/config/pricing";

export default function SubscriptionPage() {
    const router = useRouter();
    const { isPro, plan, user, isLoading, update } = useSubscription();
    const queryClient = useQueryClient();
    const [isProcessing, setIsProcessing] = useState(false);
    const [showLogin, setShowLogin] = useState(false);

    const yearlySavings = Math.round(((PRICING.monthly * 12 - PRICING.yearly) / (PRICING.monthly * 12)) * 100);

    // Status Modal State
    const [statusModal, setStatusModal] = useState<{
        isOpen: boolean;
        status: 'success' | 'error';
        title: string;
        message: string;
    }>({
        isOpen: false,
        status: 'success',
        title: '',
        message: ''
    });

    const getBaseConfig = () => ({
        public_key: process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY || "",
        tx_ref: `reexapibuilder_${Date.now()}`,
        currency: "USD",
        payment_options: "card,mobilemoney,ussd",
        customer: {
            email: user?.email || "",
            phone_number: "",
            name: user?.name || "",
        },
        meta: [
            { metaname: "app", metavalue: "reexapibuilder" }
        ],
        customizations: {
            title: "Reex API Builder Pro",
            description: "Upgrade to Pro for unlimited access",
            logo: "/logo-subscription.svg",
        },
    });

    const configMonthly = {
        ...getBaseConfig(),
        amount: PRICING.monthly,
        payment_plan: PLAN_IDS.monthly,
    };

    const configYearly = {
        ...getBaseConfig(),
        amount: PRICING.yearly,
        payment_plan: PLAN_IDS.yearly,
    };

    const handleFlutterPaymentMonthly = useFlutterwaveCustom(configMonthly);
    const handleFlutterPaymentYearly = useFlutterwaveCustom(configYearly);

    const handlePayment = (billingCycle: 'monthly' | 'yearly') => {
        if (!user?.email) {
            setShowLogin(true);
            return;
        }

        const handleFlutterPayment = billingCycle === 'monthly' ? handleFlutterPaymentMonthly : handleFlutterPaymentYearly;
        const currentConfig = billingCycle === 'monthly' ? configMonthly : configYearly;

        handleFlutterPayment({
            callback: async (response) => {
                console.log("Payment response:", response);
                closePaymentModal();

                if (response.status === "successful") {
                    setIsProcessing(true);
                    try {
                        const verifyRes = await fetch("/api/subscription/verify", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                transaction_id: response.transaction_id,
                                plan_id: currentConfig.payment_plan,
                                billing_cycle: billingCycle
                            }),
                        });

                        const verifyData = await verifyRes.json();

                        if (verifyRes.ok && verifyData.success) {
                            await update({ refresh: true });
                            await queryClient.invalidateQueries({ queryKey: ['subscription-status', user?.id] }); // Force refresh of subscription status

                            setStatusModal({
                                isOpen: true,
                                status: 'success',
                                title: 'Subscription Successful!',
                                message: 'Welcome to Pro. You now have unlimited access.'
                            });

                            router.refresh();
                        } else {
                            setStatusModal({
                                isOpen: true,
                                status: 'error',
                                title: 'Verification Failed',
                                message: 'Payment verification failed. Please contact support.'
                            });
                        }
                    } catch (error) {
                        console.error("Verification error:", error);
                        setStatusModal({
                            isOpen: true,
                            status: 'error',
                            title: 'Error',
                            message: 'An error occurred during verification.'
                        });
                    } finally {
                        setIsProcessing(false);
                    }
                } else {
                    // Only show error if explicitly failed, not just closed
                    if (response.status === "failed") {
                        setStatusModal({
                            isOpen: true,
                            status: 'error',
                            title: 'Payment Failed',
                            message: 'The payment could not be completed.'
                        });
                    }
                }
            },
            onClose: () => {
                // handle close
            },
        });
    };

    if (isLoading) {
        return <Loading />;
    }

    const isYearlyPro = isPro && String(plan) === String(PLAN_IDS.yearly);
    const isMonthlyPro = isPro && String(plan) === String(PLAN_IDS.monthly);

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
                        {isPro ? `Pro Developer (${plan === PLAN_IDS.yearly ? 'Yearly' : 'Monthly'})` : "Free Tier"}
                        <span className={isPro ? styles.badgePro : styles.badge}>Active</span>
                    </div>
                </div>
                <Button variant="ghost" onClick={() => router.push('/')}>Back to Workspace</Button>
            </div>

            <div className={styles.plansGrid}>
                {/* Free Plan */}
                <div className={styles.planCard}>
                    <h3 style={{ fontSize: 20, fontWeight: 600 }}>Hobby</h3>
                    <div className={styles.price}>$0</div>
                    <ul className={styles.features}>
                        <li className={styles.feature}><Check size={18} className={styles.check} /> 3 Dev Mode Imports</li>
                        <li className={styles.feature}><Check size={18} className={styles.check} /> 20 Active Collections</li>
                        <li className={styles.feature}><Check size={18} className={styles.check} /> 20 Requests per Collection</li>
                        <li className={styles.feature}><Check size={18} className={styles.check} /> Unlimited Requests</li>
                        <li className={styles.feature}><Check size={18} className={styles.check} /> Community Support</li>
                        <li className={styles.feature}><Check size={18} className={styles.check} /> Local Storage</li>
                    </ul>
                    <Button variant="secondary" disabled>
                        {!isPro ? "Current Plan" : "Included"}
                    </Button>
                </div>

                {/* Pro Monthly Plan */}
                <div className={`${styles.planCard} ${isMonthlyPro ? styles.featured : ''}`}>
                    {isMonthlyPro && <div className={styles.featuredLabel}>CURRENT PLAN</div>}
                    <div className={styles.planCardHeader}>
                        <h3 className={styles.planCardTitle}>Pro (Monthly)</h3>
                    </div>
                    <div className={styles.price}>${PRICING.monthly}<span>/mo</span></div>
                    
                    <ul className={styles.features}>
                        <li className={styles.feature}><Check size={18} className={styles.check} /> Everything in Hobby</li>
                        <li className={styles.feature}><Check size={18} className={styles.check} /> Unlimited Project Mode Imports</li>
                        <li className={styles.feature}><Check size={18} className={styles.check} /> Cloud Sync & Backup</li>
                    </ul>

                    {isMonthlyPro ? (
                        <Button variant="primary" disabled>Current Plan</Button>
                    ) : (
                        <Button
                            variant="primary"
                            onClick={() => handlePayment('monthly')}
                            disabled={isProcessing}
                        >
                            {isProcessing ? <><Loader2 className="animate-spin mr-2" size={16} /> Processing...</> : (isPro ? 'Switch to Monthly' : 'Upgrade to Monthly')}
                        </Button>
                    )}
                </div>

                {/* Pro Yearly Plan */}
                <div className={`${styles.planCard} ${!isMonthlyPro ? styles.featured : ''}`}>
                    {!isMonthlyPro && <div className={styles.featuredLabel}>{isYearlyPro ? 'CURRENT PLAN' : 'RECOMMENDED'}</div>}
                    <div className={styles.planCardHeader}>
                        <h3 className={styles.planCardTitle}>Pro (Yearly)</h3>
                        {yearlySavings > 0 && <span className={styles.saveBadge}>Save {yearlySavings}%</span>}
                    </div>
                    <div className={styles.price}>${PRICING.yearly}<span>/yr</span></div>
                    
                    <ul className={styles.features}>
                        <li className={styles.feature}><Check size={18} className={styles.check} /> Everything in Hobby</li>
                        <li className={styles.feature}><Check size={18} className={styles.check} /> Unlimited Project Mode Imports</li>
                        <li className={styles.feature}><Check size={18} className={styles.check} /> Cloud Sync & Backup</li>
                    </ul>

                    {isYearlyPro ? (
                        <Button variant="primary" disabled>Current Plan</Button>
                    ) : (
                        <Button
                            variant="primary"
                            onClick={() => handlePayment('yearly')}
                            disabled={isProcessing}
                        >
                            {isProcessing ? <><Loader2 className="animate-spin mr-2" size={16} /> Processing...</> : (isPro ? 'Switch to Yearly' : 'Upgrade to Yearly')}
                        </Button>
                    )}
                </div>
            </div>
            <LoginModal
                isOpen={showLogin}
                onClose={() => setShowLogin(false)}
                message="Sign in to subscribe to the Pro plan."
            />

            <SubscriptionStatusModal
                isOpen={statusModal.isOpen}
                onClose={() => setStatusModal(prev => ({ ...prev, isOpen: false }))}
                status={statusModal.status}
                title={statusModal.title}
                message={statusModal.message}
            />
        </main >
    );
}
