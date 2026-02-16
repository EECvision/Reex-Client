import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getCollections,
    createCollection,
    deleteCollection,
    createRequest,
    updateRequest,
    deleteRequest
} from '@/app/actions/testCollectionActions';
import { useToast } from '@/hooks/useToast';
import { Collection } from '@/components/TestApi/CollectionSidebar';
import { useSubscription } from '@/hooks/useSubscription';
import { ClientStorage } from '@/lib/clientStorage';
import { FREE_TEST_COLLECTION_LIMIT, FREE_TEST_REQUEST_LIMIT } from '@/lib/constants';

const COLLECTIONS_KEY = 'test_collections';
// We need to store requests separately or nested? 
// The server separates them. For local, nesting might be easier, but let's mimic server structure to minimize refactor.
// Actually, server actions return nested structure.
// Let's store nested `Collection` objects in local storage for simplicity.


export const useCollections = (userId?: string) => {
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const { isPro } = useSubscription();

    // Query: Fetch Collections
    const {
        data: collections = [],
        isLoading,
        error
    } = useQuery<Collection[]>({
        queryKey: ['collections', userId, isPro],
        queryFn: async () => {
            if (!userId) return [];

            if (!isPro) {
                // Hobby: Load from LocalStorage
                // Note: We might want to filter by user ID if multiple users share browser (rare but consistent)
                // or just store everything under one key. Let's filter by userId just in case.
                const all = await ClientStorage.get<Collection>(COLLECTIONS_KEY);
                // If we store with user_id attached? The Collection type might not have user_id on frontend.
                // Let's assume local storage is private to the browser/device user. 
                // But wait, the previous server logic filtered by user_id. 
                // Let's just return all for local mode, or wrap them? 
                // Simpler: Just return all. A hobby user is likely the only one on localhost or their browser.
                return all;
            }

            return await getCollections() as Collection[];
        },
        enabled: !!userId,
    });

    // Mutation: Create Collection
    const createCollectionMutation = useMutation({
        mutationFn: async (name: string) => {
            if (!isPro) {
                const existing = await ClientStorage.get<Collection>(COLLECTIONS_KEY);
                if (existing.length >= FREE_TEST_COLLECTION_LIMIT) {
                    return { error: `Collection limit reached (${FREE_TEST_COLLECTION_LIMIT}). Upgrade to Pro for more.` };
                }
                const newCol: Collection = {
                    id: crypto.randomUUID(),
                    name,
                    requests: [],
                    isOpen: true,
                    auth: { type: 'none', token: '' }
                };
                await ClientStorage.add(COLLECTIONS_KEY, newCol);
                return newCol;
            }

            const res = await createCollection(name);
            if (res.error) return { error: res.error };
            return res.data;
        },
        onSuccess: (newCollection) => {
            if (!newCollection) return;
            if ((newCollection as any).error) {
                showToast('error', String((newCollection as any).error));
                return;
            }
            queryClient.setQueryData(['collections', userId, isPro], (old: Collection[] = []) => {
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
            if (!isPro) {
                await ClientStorage.delete(COLLECTIONS_KEY, id);
                return id;
            }
            const res = await deleteCollection(id);
            if (res && typeof res === 'object' && 'error' in res) {
                return { error: res.error };
            }
            return id;
        },
        onSuccess: (result) => {
            if (result && typeof result === 'object' && 'error' in result) {
                showToast('error', result.error);
                return;
            }
            const deletedId = result as string;
            queryClient.setQueryData(['collections', userId, isPro], (old: Collection[] = []) => {
                return old.filter(c => c.id !== deletedId);
            });
            showToast('success', 'Collection deleted');
        },
        onError: (err: any) => {
            showToast('error', err.message || 'Failed to delete collection');
        }
    });

    // Mutation: Create Request
    const createRequestMutation = useMutation({
        mutationFn: async ({ collectionId, name }: { collectionId: string, name: string }) => {
            if (!isPro) {
                const collections = await ClientStorage.get<Collection>(COLLECTIONS_KEY);
                const col = collections.find(c => c.id === collectionId);
                if (col && col.requests.length >= FREE_TEST_REQUEST_LIMIT) {
                    return { error: `Request limit reached (${FREE_TEST_REQUEST_LIMIT}). Upgrade to Pro for more.` };
                }
                const newReq = {
                    id: crypto.randomUUID(),
                    name,
                    method: 'GET',
                    url: '',
                    config: { headers: [], queryParams: [], body: null, auth: null }
                };

                if (col) {
                    col.requests.push(newReq as any);
                    await ClientStorage.update(COLLECTIONS_KEY, collectionId, col);
                }
                return newReq;
            }
            const res = await createRequest(collectionId, { name });
            if (res.error) return { error: res.error };
            return res;
        },
        onSuccess: (newRequest, variables) => {
            if (!newRequest) return;
            if ((newRequest as any).error) {
                showToast('error', String((newRequest as any).error));
                return;
            }
            queryClient.setQueryData(['collections', userId, isPro], (old: Collection[] = []) => {
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
            showToast('error', err.message || 'Failed to create request');
        }
    });

    // Mutation: Update Request
    const updateRequestMutation = useMutation({
        mutationFn: async ({ id, updates }: { id: string, updates: any }) => {
            if (!isPro) {
                const collections = await ClientStorage.get<Collection>(COLLECTIONS_KEY);
                // Find collection containing request
                const col = collections.find(c => c.requests.some(r => r.id === id));
                if (col) {
                    const reqIndex = col.requests.findIndex(r => r.id === id);
                    if (reqIndex !== -1) {
                        const req = col.requests[reqIndex];
                        // Merge updates similar to reducer logic
                        const updatedReq = {
                            ...req,
                            ...updates,
                            config: { ...req.config, ...updates.config }
                        };
                        // Top level fields
                        if (updates.name) updatedReq.name = updates.name;
                        if (updates.method) updatedReq.method = updates.method;
                        if (updates.url) updatedReq.url = updates.url;

                        col.requests[reqIndex] = updatedReq;
                        await ClientStorage.update(COLLECTIONS_KEY, col.id, col);
                    }
                }
                return { id, updates };
            }

            const res = await updateRequest(id, updates);
            if (res && typeof res === 'object' && 'error' in res) {
                return { error: res.error };
            }
            return { id, updates };
        },
        onSuccess: (result) => {
            if (result && typeof result === 'object' && 'error' in result) {
                showToast('error', (result as any).error);
                return;
            }
            const { id, updates } = result as { id: string, updates: any };
            // Optimistic update or refetch. Here we manipulate cache manually to avoid refetch lag.
            queryClient.setQueryData(['collections', userId, isPro], (old: Collection[] = []) => {
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
            // showToast('success', 'Request saved');
        },
        onError: (err: any) => {
            // showToast('error', err.message || 'Failed to save request');
        }
    });

    // Mutation: Delete Request
    const deleteRequestMutation = useMutation({
        mutationFn: async ({ collectionId, requestId }: { collectionId: string, requestId: string }) => {
            if (!isPro) {
                const collections = await ClientStorage.get<Collection>(COLLECTIONS_KEY);
                const col = collections.find(c => c.id === collectionId);
                if (col) {
                    col.requests = col.requests.filter(r => r.id !== requestId);
                    await ClientStorage.update(COLLECTIONS_KEY, collectionId, col);
                }
                return { collectionId, requestId };
            }

            const res = await deleteRequest(requestId);
            if (res && typeof res === 'object' && 'error' in res) {
                return { error: res.error };
            }
            return { collectionId, requestId };
        },
        onSuccess: (result) => {
            if (result && typeof result === 'object' && 'error' in result) {
                showToast('error', (result as any).error);
                return;
            }
            const { collectionId, requestId } = result as { collectionId: string, requestId: string };
            queryClient.setQueryData(['collections', userId, isPro], (old: Collection[] = []) => {
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
            showToast('error', err.message || 'Failed to delete request');
        }
    });

    const toggleCollection = (id: string) => {
        queryClient.setQueryData(['collections', userId, isPro], (old: Collection[] | undefined) => {
            if (!old) return [];
            return old.map(c => c.id === id ? { ...c, isOpen: !c.isOpen } : c);
        });
    };

    return {
        collections,
        isLoading,
        createCollection: createCollectionMutation.mutateAsync,
        deleteCollection: deleteCollectionMutation.mutateAsync,
        createRequest: createRequestMutation.mutateAsync,
        updateRequest: updateRequestMutation.mutateAsync,
        deleteRequest: deleteRequestMutation.mutateAsync,
        toggleCollection,
        isCreating: createCollectionMutation.isPending || createRequestMutation.isPending,
        isDeleting: deleteCollectionMutation.isPending || deleteRequestMutation.isPending,
        isUpdating: updateRequestMutation.isPending
    };
};
