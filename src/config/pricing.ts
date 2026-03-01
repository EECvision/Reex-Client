export const PRICING = {
    monthly: 1.99,
    yearly: 19.99
};

export const PLAN_IDS = {
    monthly: process.env.NEXT_PUBLIC_FLUTTERWAVE_MONTHLY_PLAN_ID || "",
    yearly: process.env.NEXT_PUBLIC_FLUTTERWAVE_YEARLY_PLAN_ID || ""
};
