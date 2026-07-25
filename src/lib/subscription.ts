import { SUBSCRIPTION_GRACE_PERIOD_MS } from "@/config/pricing";

export const isSubscriptionActive = (
    status?: string | null,
    currentPeriodEnd?: string | Date | null
): boolean => {
    if (!status || !currentPeriodEnd) return false;
    const cleanStatus = status.toLowerCase();

    // Give a 48-hour grace period for renewal webhooks to arrive
    const gracePeriodEnd = new Date(currentPeriodEnd).getTime() + SUBSCRIPTION_GRACE_PERIOD_MS;
    const isValidDate = gracePeriodEnd > Date.now();

    if (cleanStatus === 'active') {
        return isValidDate;
    }

    if (cleanStatus === 'canceled' || cleanStatus === 'cancelled') {
        return new Date(currentPeriodEnd).getTime() > Date.now();
    }

    return false;
};
