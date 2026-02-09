import { useSession } from "next-auth/react";

export function useSubscription() {
    const { data: session, status } = useSession();

    const isLoading = status === "loading";
    const user = session?.user;

    const isPro =
        user?.subscription_status === "active" &&
        user?.current_period_end &&
        new Date(user.current_period_end) > new Date();

    const plan = user?.subscription_plan || "free";

    return {
        isPro,
        plan,
        isLoading,
        user,
        subscriptionStatus: user?.subscription_status
    };
}
