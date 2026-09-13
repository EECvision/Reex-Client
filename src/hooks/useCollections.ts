import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/useToast";
import type {
  Collection,
  RequestItem,
} from "@/components/TestApi/CollectionSidebar";
import { collectionStorage } from "@/services/collectionStorage";

const QUERY_KEY = ["collections"];

export const useCollections = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const {
    data: collections = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: QUERY_KEY,
    retry: false,
    queryFn: async () => {
      const saved = await collectionStorage.getCollections();
      const cached = queryClient.getQueryData<Collection[]>(QUERY_KEY);
      return saved.map((collection) => ({
        ...collection,
        isOpen:
          cached?.find((item) => item.id === collection.id)?.isOpen ??
          collection.isOpen,
      }));
    },
  });
  useEffect(() => {
    if (error) showToast("error", error.message);
  }, [error, showToast]);
  const refresh = () => queryClient.invalidateQueries({ queryKey: QUERY_KEY });
  const onError = (error: Error) =>
    showToast(
      "error",
      error.message || "Could not save changes in this browser.",
    );

  const createCollectionMutation = useMutation({
    mutationFn: collectionStorage.createCollection,
    onSuccess: async () => {
      await refresh();
      showToast("success", "Collection created");
    },
    onError,
  });
  const deleteCollectionMutation = useMutation({
    mutationFn: collectionStorage.deleteCollection,
    onSuccess: async () => {
      await refresh();
      showToast("success", "Collection deleted");
    },
    onError,
  });
  const renameCollectionMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      collectionStorage.updateCollection(id, { name }),
    onSuccess: refresh,
    onError,
  });
  const updateCollectionMutation = useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: Pick<Partial<Collection>, "base_url" | "auth">;
    }) => collectionStorage.updateCollection(id, updates),
    onSuccess: refresh,
    onError,
  });
  const createRequestMutation = useMutation({
    mutationFn: ({
      collectionId,
      name,
    }: {
      collectionId: string;
      name: string;
    }) => collectionStorage.createRequest(collectionId, name),
    onSuccess: async () => {
      await refresh();
      showToast("success", "Request created");
    },
    onError,
  });
  const updateRequestMutation = useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<RequestItem> & { config?: Record<string, unknown> };
    }) => collectionStorage.updateRequest(id, updates),
    onSuccess: refresh,
    onError,
  });
  const deleteRequestMutation = useMutation({
    mutationFn: ({
      collectionId,
      requestId,
    }: {
      collectionId: string;
      requestId: string;
    }) => collectionStorage.deleteRequest(collectionId, requestId),
    onSuccess: async () => {
      await refresh();
      showToast("success", "Request deleted");
    },
    onError,
  });
  const toggleCollection = (id: string) => {
    queryClient.setQueryData<Collection[]>(QUERY_KEY, (old) =>
      (old ?? []).map((collection) =>
        collection.id === id
          ? { ...collection, isOpen: !collection.isOpen }
          : collection,
      ),
    );
  };

  return {
    collections,
    isLoading,
    error,
    createCollection: createCollectionMutation.mutateAsync,
    deleteCollection: deleteCollectionMutation.mutateAsync,
    renameCollection: renameCollectionMutation.mutateAsync,
    updateCollection: updateCollectionMutation.mutateAsync,
    createRequest: createRequestMutation.mutateAsync,
    updateRequest: updateRequestMutation.mutateAsync,
    deleteRequest: deleteRequestMutation.mutateAsync,
    toggleCollection,
    isCreating:
      createCollectionMutation.isPending || createRequestMutation.isPending,
    isDeleting:
      deleteCollectionMutation.isPending || deleteRequestMutation.isPending,
    isUpdating: updateRequestMutation.isPending,
  };
};
