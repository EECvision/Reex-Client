import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getHistory, addToHistory, deleteFromHistory } from '@/app/actions/recentCollectionActions';
import { HistoryItem } from '@/providers/ProjectContext';
import { useSubscription } from '@/hooks/useSubscription';
import { ClientStorage } from '@/lib/clientStorage';
import { useToast } from '@/hooks/useToast';

const HISTORY_KEY = 'recent_collections';

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
                return ClientStorage.get<HistoryItem>(HISTORY_KEY)
                    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
                    .slice(0, 20);
            }
            return await getHistory();
        }
    });

    // Mutation: Add to History
    const addHistoryMutation = useMutation({
        mutationFn: async ({ name, content }: { name: string, content: any }) => {
            if (!isPro) {
                // Upsert logic for local history
                const newItem = {
                    id: crypto.randomUUID(),
                    name,
                    content,
                    updated_at: new Date().toISOString()
                };

                // Custom upsert: match by name
                const history = ClientStorage.get<HistoryItem>(HISTORY_KEY);
                const index = history.findIndex(h => h.name === name);

                if (index > -1) {
                    history[index] = { ...history[index], content, updated_at: newItem.updated_at };
                    ClientStorage.save(HISTORY_KEY, history);
                } else {
                    ClientStorage.add(HISTORY_KEY, newItem);
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
        onError: (err: any) => {
            showToast('error', err.message || 'Failed to add to history');
        }
    });

    // Mutation: Delete from History
    const deleteHistoryMutation = useMutation({
        mutationFn: async (id: string) => {
            if (!isPro) {
                ClientStorage.delete(HISTORY_KEY, id);
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
                showToast('error', String((result as any).error));
                return;
            }
            const deletedId = result as string;
            // Optimistic update or just invalidate
            queryClient.setQueryData(QUERY_KEY, (old: HistoryItem[] = []) => {
                return old.filter(item => item.id !== deletedId);
            });
            queryClient.invalidateQueries({ queryKey: QUERY_KEY });
            showToast('success', 'Removed from history');
        },
        onError: (err: any) => {
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
