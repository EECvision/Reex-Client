import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getHistory, addToHistory, deleteFromHistory } from '@/app/actions/recentCollectionActions';
import { HistoryItem } from '@/providers/ProjectContext';
import { useSubscription } from '@/hooks/useSubscription';
import { ClientStorage } from '@/lib/clientStorage';

const HISTORY_KEY = 'recent_collections';

export const useRecentCollections = () => {
    const queryClient = useQueryClient();
    const { isPro } = useSubscription();
    const QUERY_KEY = ['recent-collections'];

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

            await addToHistory(name, content);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEY });
        },
        onError: (err) => {
            console.error('Failed to add to history', err);
        }
    });

    // Mutation: Delete from History
    const deleteHistoryMutation = useMutation({
        mutationFn: async (id: string) => {
            if (!isPro) {
                ClientStorage.delete(HISTORY_KEY, id);
                return id;
            }
            await deleteFromHistory(id);
            return id;
        },
        onSuccess: (deletedId) => {
            // Optimistic update or just invalidate
            queryClient.setQueryData(QUERY_KEY, (old: HistoryItem[] = []) => {
                return old.filter(item => item.id !== deletedId);
            });
            queryClient.invalidateQueries({ queryKey: QUERY_KEY });
        },
        onError: (err) => {
            console.error('Failed to delete from history', err);
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
