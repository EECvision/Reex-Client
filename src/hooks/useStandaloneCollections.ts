import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getStandaloneCollections,
    createStandaloneCollection,
    updateStandaloneCollection,
    deleteStandaloneCollection
} from '@/app/actions/standaloneActions';
import { StandaloneCollection } from '@/providers/ProjectContext';
import { useSubscription } from '@/hooks/useSubscription';
import { ClientStorage } from '@/lib/clientStorage';

const STANDALONE_KEY = 'standalone_collections';

export const useStandaloneCollections = (enabled: boolean = true) => {
    const queryClient = useQueryClient();
    const { isPro } = useSubscription();
    const QUERY_KEY = ['standalone-collections'];

    // Query: Fetch Collections
    const {
        data: collections = [],
        isLoading,
        error
    } = useQuery<StandaloneCollection[]>({
        queryKey: QUERY_KEY,
        queryFn: async () => {
            if (!isPro) {
                return ClientStorage.get<StandaloneCollection>(STANDALONE_KEY);
            }
            return await getStandaloneCollections();
        },
        enabled: enabled,
    });

    // Mutation: Create Collection
    const createCollectionMutation = useMutation({
        mutationFn: async (collection: StandaloneCollection) => {
            if (!isPro) {
                const newCol = { ...collection, id: collection.id || crypto.randomUUID() };
                ClientStorage.add(STANDALONE_KEY, newCol);
                return newCol;
            }

            const res = await createStandaloneCollection(collection);
            if (res.error) throw new Error(res.error);
            return {
                ...collection,
                id: (res.data as any)?.id || collection.id // Use DB ID if available
            };
        },
        onSuccess: (newCollection) => {
            queryClient.setQueryData(QUERY_KEY, (old: StandaloneCollection[] = []) => {
                // Check if already exists (optimistic update handling)
                const exists = old.find(c => c.id === newCollection.id);
                if (exists) return old.map(c => c.id === newCollection.id ? newCollection : c);
                return [newCollection, ...old];
            });
        },
        onError: (err: any) => {
            console.error('Failed to create standalone collection', err);
        }
    });

    // Mutation: Update Collection
    const updateCollectionMutation = useMutation({
        mutationFn: async ({ id, updates }: { id: string, updates: Partial<StandaloneCollection> }) => {
            if (!isPro) {
                ClientStorage.update(STANDALONE_KEY, id, updates);
                return { id, updates };
            }

            const res = await updateStandaloneCollection(id, updates);
            if (res.error) throw new Error(res.error);
            return { id, updates };
        },
        onSuccess: ({ id, updates }) => {
            queryClient.setQueryData(QUERY_KEY, (old: StandaloneCollection[] = []) => {
                return old.map(c => c.id === id ? { ...c, ...updates } : c);
            });
        },
        onError: (err: any) => {
            console.error('Failed to update standalone collection', err);
        }
    });

    // Mutation: Delete Collection
    const deleteCollectionMutation = useMutation({
        mutationFn: async (id: string) => {
            if (!isPro) {
                ClientStorage.delete(STANDALONE_KEY, id);
                return id;
            }

            const res = await deleteStandaloneCollection(id);
            if (res.error) throw new Error(res.error);
            return id;
        },
        onSuccess: (deletedId) => {
            queryClient.setQueryData(QUERY_KEY, (old: StandaloneCollection[] = []) => {
                return old.filter(c => c.id !== deletedId);
            });
        },
        onError: (err: any) => {
            console.error('Failed to delete standalone collection', err);
        }
    });

    // Mutation: Clear All Collections
    const clearAllMutation = useMutation({
        mutationFn: async () => {
            if (!isPro) {
                if (typeof window !== 'undefined') {
                    window.localStorage.removeItem(STANDALONE_KEY);
                }
                return;
            }

            const { deleteAllStandaloneCollections } = await import('@/app/actions/standaloneActions');
            const res = await deleteAllStandaloneCollections();
            if (res.error) throw new Error(res.error);
        },
        onSuccess: () => {
            queryClient.setQueryData(QUERY_KEY, []);
        },
        onError: (err: any) => {
            console.error('Failed to clear standalone collections', err);
        }
    });

    return {
        collections,
        isLoading,
        error,
        createStandaloneCollection: createCollectionMutation.mutateAsync,
        updateStandaloneCollection: updateCollectionMutation.mutateAsync,
        deleteStandaloneCollection: deleteCollectionMutation.mutateAsync,
        clearAllStandaloneCollections: clearAllMutation.mutateAsync,
        isCreating: createCollectionMutation.isPending,
        isUpdating: updateCollectionMutation.isPending,
        isDeleting: deleteCollectionMutation.isPending,
        isClearing: clearAllMutation.isPending
    };
};
