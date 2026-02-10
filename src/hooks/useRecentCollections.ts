import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getHistory, addToHistory, deleteFromHistory } from '@/app/actions/recentCollectionActions';
import { HistoryItem } from '@/providers/ProjectContext';

export const useRecentCollections = () => {
    const queryClient = useQueryClient();
    const QUERY_KEY = ['recent-collections'];

    // Query: Fetch History
    const {
        data: recentCollections = [],
        isLoading,
        error
    } = useQuery<HistoryItem[]>({
        queryKey: QUERY_KEY,
        queryFn: async () => {
            return await getHistory();
        }
    });

    // Mutation: Add to History
    const addHistoryMutation = useMutation({
        mutationFn: async ({ name, content }: { name: string, content: any }) => {
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
