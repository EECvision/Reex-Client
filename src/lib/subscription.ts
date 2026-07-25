export const isSubscriptionActive = (status?: string | null): boolean => {
    return status?.toLowerCase() === 'active';
};
