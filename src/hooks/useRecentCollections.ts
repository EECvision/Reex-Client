import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getHistory, addToHistory, deleteFromHistory } from '@/app/actions/recentCollectionActions';
import { HistoryItem } from '@/providers/ProjectContext';
import { useSubscription } from '@/hooks/useSubscription';
import { ClientStorage } from '@/lib/clientStorage';
import { useToast } from '@/hooks/useToast';
import { FREE_RECENT_COLLECTION_LIMIT } from '@/lib/constants';

const HISTORY_KEY = 'recent_collections';
const EVICTION_ORDER = ['standalone_collections', 'test_collections'];

export const useRecentCollections = () => {
    const queryClient = useQueryClient();
    const { isPro } = useSubscription();
    const { showToast } = useToast();
    const QUERY_KEY = ['recent-collections', isPro];

    // Query: Fetch History
    const {
        data: recentCollections = [],
        isLoading,
        error
    } = useQuery<HistoryItem[]>({
        queryKey: QUERY_KEY,
        queryFn: async () => {
            if (!isPro) {
                const items = await ClientStorage.get<HistoryItem>(HISTORY_KEY);
                return items
                    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
                    .slice(0, FREE_RECENT_COLLECTION_LIMIT);
            }
            return (await getHistory()) as unknown as HistoryItem[];
        }
    });

    // Mutation: Add to History
    const addHistoryMutation = useMutation({
        mutationFn: async ({ name, content }: { name: string, content: Record<string, unknown> }) => {
            if (!isPro) {
                const newItem = {
                    id: crypto.randomUUID(),
                    name,
                    content,
                    updated_at: new Date().toISOString()
                };

                const history = await ClientStorage.get<HistoryItem>(HISTORY_KEY);
                const index = history.findIndex(h => h.name === name);

                if (index > -1) {
                    // Update existing
                    history[index] = { ...history[index], content, updated_at: newItem.updated_at };
                    const saved = await ClientStorage.saveWithRetry(HISTORY_KEY, history, EVICTION_ORDER);
                    if (!saved) return { error: 'This collection is too large for browser storage.' };
                } else {
                    if (history.length >= FREE_RECENT_COLLECTION_LIMIT) {
                        return { error: `History limit reached (${FREE_RECENT_COLLECTION_LIMIT}). Upgrade to Pro for more.` };
                    }
                    const saved = await ClientStorage.saveWithRetry(HISTORY_KEY, [...history, newItem], EVICTION_ORDER);
                    if (!saved) return { error: 'This collection is too large for browser storage.' };
                }
                return;
            }

            const res = await addToHistory(name, content);
            if (res && 'error' in res) {
                return { error: res.error };
            }
        },
        onSuccess: (result) => {
            if (result && 'error' in result) {
                showToast('error', String(result.error));
                return;
            }
            queryClient.invalidateQueries({ queryKey: QUERY_KEY });
        },
        onError: (err: Error) => {
            showToast('error', err.message || 'Failed to add to history');
        }
    });

    // Mutation: Delete from History
    const deleteHistoryMutation = useMutation({
        mutationFn: async (id: string) => {
            if (!isPro) {
                await ClientStorage.delete(HISTORY_KEY, id);
                return id;
            }
            const res = await deleteFromHistory(id);
            if (res && 'error' in res) {
                return { error: res.error };
            }
            return id;
        },
        onSuccess: (result) => {
            if (result && typeof result === 'object' && 'error' in result) {
                showToast('error', String((result as Record<string, unknown>).error));
                return;
            }
            const deletedId = result as string;
            queryClient.setQueryData(QUERY_KEY, (old: HistoryItem[] = []) => {
                return old.filter(item => item.id !== deletedId);
            });
            queryClient.invalidateQueries({ queryKey: QUERY_KEY });
            showToast('success', 'Removed from history');
        },
        onError: (err: Error) => {
            showToast('error', err.message || 'Failed to delete from history');
        }
    });

    return {
        recentCollections,
        isLoading,
        error,
        addCollectionToHistory: addHistoryMutation.mutateAsync,
        removeCollectionFromHistory: deleteHistoryMutation.mutateAsync,
        isAdding: addHistoryMutation.isPending,
        isDeleting: deleteHistoryMutation.isPending
    };
};
