export const PRICING = {
    monthly: 5,
    yearly: 45
};

export const PLAN_IDS = {
    monthly: process.env.NEXT_PUBLIC_FLUTTERWAVE_MONTHLY_PLAN_ID || "",
    yearly: process.env.NEXT_PUBLIC_FLUTTERWAVE_YEARLY_PLAN_ID || ""
};

// 48 hours in milliseconds
export const SUBSCRIPTION_GRACE_PERIOD_MS = 2 * 24 * 60 * 60 * 1000;
