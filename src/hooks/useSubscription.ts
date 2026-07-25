import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { isSubscriptionActive } from "@/lib/subscription";

export function useSubscription() {
    const { data: session, status, update } = useSession();
    const user = session?.user;

    // Fetch fresh subscription status from the database
    const { data: subscriptionData, isLoading: isQueryLoading } = useQuery({
        queryKey: ['subscription-status', user?.id],
        queryFn: async () => {
            const { data } = await axios.get('/api/subscription/status');
            return data;
        },
        enabled: !!user?.id,
        // Refetch when window is focused to ensure status is always up-to-date
        refetchOnWindowFocus: true,
    });

    const isLoading = status === "loading" || isQueryLoading;

    // Use the fresh data from the query, falling back to session data if needed
    const subscriptionStatus = subscriptionData?.subscription_status ?? user?.subscription_status;
    const currentPeriodEnd = subscriptionData?.current_period_end ?? user?.current_period_end;
    const plan = subscriptionData?.subscription_plan ?? user?.subscription_plan ?? "free";

    const isPro = isSubscriptionActive(subscriptionStatus, currentPeriodEnd);    

    return {
        isPro,
        plan,
        isLoading,
        user: { ...user, ...subscriptionData }, // Merge fresh data into user object
        subscriptionStatus,
        update
    };
}
