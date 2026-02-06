import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getCollections,
    createCollection,
    deleteCollection,
    createRequest,
    updateRequest,
    deleteRequest
} from '@/app/actions/collectionActions';
import { useToast } from '@/hooks/useToast';
import { Collection } from '@/components/TestApi/CollectionSidebar';

export const useCollections = (userId?: string) => {
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    // Query: Fetch Collections
    const {
        data: collections = [],
        isLoading,
        error
    } = useQuery<Collection[]>({
        queryKey: ['collections', userId],
        queryFn: async () => {
            if (!userId) return [];
            return await getCollections() as Collection[];
        },
        enabled: !!userId,
    });

    // Mutation: Create Collection
    const createCollectionMutation = useMutation({
        mutationFn: async (name: string) => {
            const res = await createCollection(name);
            if (res.error) throw new Error(res.error);
            return res.data;
        },
        onSuccess: (newCollection) => {
            queryClient.setQueryData(['collections', userId], (old: Collection[] = []) => {
                return [...old, newCollection];
            });
            showToast('success', 'Collection created');
        },
        onError: (err: any) => {
            showToast('error', err.message || 'Failed to create collection');
        }
    });

    // Mutation: Delete Collection
    const deleteCollectionMutation = useMutation({
        mutationFn: async (id: string) => {
            await deleteCollection(id);
            return id;
        },
        onSuccess: (deletedId) => {
            queryClient.setQueryData(['collections', userId], (old: Collection[] = []) => {
                return old.filter(c => c.id !== deletedId);
            });
            showToast('success', 'Collection deleted');
        },
        onError: (err: any) => {
            showToast('error', 'Failed to delete collection');
        }
    });

    // Mutation: Create Request
    const createRequestMutation = useMutation({
        mutationFn: async ({ collectionId, name }: { collectionId: string, name: string }) => {
            return await createRequest(collectionId, { name });
        },
        onSuccess: (newRequest, variables) => {
            queryClient.setQueryData(['collections', userId], (old: Collection[] = []) => {
                return old.map(c => {
                    if (c.id === variables.collectionId) {
                        return { ...c, requests: [...c.requests, newRequest], isOpen: true };
                    }
                    return c;
                });
            });
            showToast('success', 'Request created');
        },
        onError: (err: any) => {
            showToast('error', 'Failed to create request');
        }
    });

    // Mutation: Update Request
    const updateRequestMutation = useMutation({
        mutationFn: async ({ id, updates }: { id: string, updates: any }) => {
            await updateRequest(id, updates);
            return { id, updates };
        },
        onSuccess: ({ id, updates }) => {
            // Optimistic update or refetch. Here we manipulate cache manually to avoid refetch lag.
            queryClient.setQueryData(['collections', userId], (old: Collection[] = []) => {
                return old.map(c => {
                    // Check if request is in this collection
                    const reqIndex = c.requests.findIndex(r => r.id === id);
                    if (reqIndex === -1) return c;

                    const updatedRequests = [...c.requests];
                    updatedRequests[reqIndex] = { ...updatedRequests[reqIndex], ...updates, config: { ...updatedRequests[reqIndex].config, ...updates.config } };

                    // If method/name changed at top level
                    if (updates.name) updatedRequests[reqIndex].name = updates.name;
                    if (updates.method) updatedRequests[reqIndex].method = updates.method;
                    if (updates.url) updatedRequests[reqIndex].url = updates.url;

                    return { ...c, requests: updatedRequests };
                });
            });
            showToast('success', 'Request saved');
        },
        onError: (err: any) => {
            showToast('error', 'Failed to save request');
        }
    });

    // Mutation: Delete Request
    const deleteRequestMutation = useMutation({
        mutationFn: async ({ collectionId, requestId }: { collectionId: string, requestId: string }) => {
            await deleteRequest(requestId);
            return { collectionId, requestId };
        },
        onSuccess: ({ collectionId, requestId }) => {
            queryClient.setQueryData(['collections', userId], (old: Collection[] = []) => {
                return old.map(c => {
                    if (c.id === collectionId) {
                        return { ...c, requests: c.requests.filter(r => r.id !== requestId) };
                    }
                    return c;
                });
            });
            showToast('success', 'Request deleted');
        },
        onError: (err: any) => {
            showToast('error', 'Failed to delete request');
        }
    });

    return {
        collections,
        isLoading,
        createCollection: createCollectionMutation.mutateAsync,
        deleteCollection: deleteCollectionMutation.mutateAsync,
        createRequest: createRequestMutation.mutateAsync,
        updateRequest: updateRequestMutation.mutateAsync,
        deleteRequest: deleteRequestMutation.mutateAsync,
        isCreating: createCollectionMutation.isPending || createRequestMutation.isPending,
        isDeleting: deleteCollectionMutation.isPending || deleteRequestMutation.isPending,
        isUpdating: updateRequestMutation.isPending
    };
};
