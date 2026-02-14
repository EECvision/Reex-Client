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
import { FREE_STANDALONE_LIMIT } from '@/lib/constants';
import { useToast } from '@/hooks/useToast';

const STANDALONE_KEY = 'standalone_collections';

export const useStandaloneCollections = (enabled: boolean = true) => {
    const queryClient = useQueryClient();
    const { isPro } = useSubscription();
    const { showToast } = useToast();
    const QUERY_KEY = ['standalone-collections', isPro];

    // Query: Fetch Collections
    const {
        data: collections = [],
        isLoading,
        error
    } = useQuery<StandaloneCollection[]>({
        queryKey: QUERY_KEY,
        queryFn: async () => {
            if (!isPro) {
                return await ClientStorage.get<StandaloneCollection>(STANDALONE_KEY);
            }
            return await getStandaloneCollections();
        },
        enabled: enabled,
    });

    // Mutation: Create Collection
    const createCollectionMutation = useMutation({
        mutationFn: async (collection: StandaloneCollection) => {
            if (!isPro) {
                const existing = await ClientStorage.get<StandaloneCollection>(STANDALONE_KEY);
                if (existing.length >= FREE_STANDALONE_LIMIT) {
                    return { error: `Collection limit reached (${FREE_STANDALONE_LIMIT}). Upgrade to Pro for more.` };
                }
                const newCol = { ...collection, id: collection.id || crypto.randomUUID() };
                await ClientStorage.add(STANDALONE_KEY, newCol);
                return newCol;
            }

            const res = await createStandaloneCollection(collection);
            if (res.error) return { error: res.error };
            return {
                ...collection,
                id: (res.data as any)?.id || collection.id // Use DB ID if available
            };
        },
        onSuccess: (newCollection) => {
            if ((newCollection as any).error) {
                showToast('error', String((newCollection as any).error));
                return;
            }
            const collection = newCollection as StandaloneCollection;
            queryClient.setQueryData(QUERY_KEY, (old: StandaloneCollection[] = []) => {
                // Check if already exists (optimistic update handling)
                const exists = old.find(c => c.id === collection.id);
                if (exists) return old.map(c => c.id === collection.id ? collection : c);
                return [collection, ...old];
            });
            showToast('success', 'Collection created');
        },
        onError: (err: any) => {
            showToast('error', err.message || 'Failed to create standalone collection');
        }
    });

    // Mutation: Update Collection
    const updateCollectionMutation = useMutation({
        mutationFn: async ({ id, updates }: { id: string, updates: Partial<StandaloneCollection> }) => {
            if (!isPro) {
                await ClientStorage.update(STANDALONE_KEY, id, updates);
                return { id, updates };
            }

            const res = await updateStandaloneCollection(id, updates);
            if (res.error) return { error: res.error };
            return { id, updates };
        },
        onSuccess: (result) => {
            if ((result as any).error) {
                showToast('error', String((result as any).error));
                return;
            }
            const { id, updates } = result as { id: string, updates: Partial<StandaloneCollection> };
            queryClient.setQueryData(QUERY_KEY, (old: StandaloneCollection[] = []) => {
                return old.map(c => c.id === id ? { ...c, ...updates } : c);
            });
            showToast('success', 'Collection updated');
        },
        onError: (err: any) => {
            showToast('error', err.message || 'Failed to update standalone collection');
        }
    });

    // Mutation: Delete Collection
    const deleteCollectionMutation = useMutation({
        mutationFn: async (id: string) => {
            if (!isPro) {
                await ClientStorage.delete(STANDALONE_KEY, id);
                return id;
            }

            const res = await deleteStandaloneCollection(id);
            if (res.error) return { error: res.error };
            return id;
        },
        onSuccess: (result) => {
            if ((result as any).error) {
                showToast('error', String((result as any).error));
                return;
            }
            const deletedId = result as string;
            queryClient.setQueryData(QUERY_KEY, (old: StandaloneCollection[] = []) => {
                return old.filter(c => c.id !== deletedId);
            });
            showToast('success', 'Collection deleted');
        },
        onError: (err: any) => {
            showToast('error', err.message || 'Failed to delete standalone collection');
        }
    });

    // Mutation: Clear All Collections
    const clearAllMutation = useMutation({
        mutationFn: async () => {
            if (!isPro) {
                if (typeof window !== 'undefined') {
                    await ClientStorage.clear(STANDALONE_KEY);
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
