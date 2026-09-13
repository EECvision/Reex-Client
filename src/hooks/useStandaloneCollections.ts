import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { StandaloneCollection } from "@/types";
import { collectionStorage } from "@/services/collectionStorage";
import { useToast } from "@/hooks/useToast";

const QUERY_KEY = ["standalone-collections"];

export const useStandaloneCollections = (enabled = true) => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const {
    data: collections = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: QUERY_KEY,
    retry: false,
    queryFn: collectionStorage.getStandaloneCollections,
    enabled,
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
  const createMutation = useMutation({
    mutationFn: collectionStorage.createStandaloneCollection,
    onSuccess: async () => {
      await refresh();
      showToast("success", "Collection created");
    },
    onError,
  });
  const updateMutation = useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<StandaloneCollection>;
    }) => collectionStorage.updateStandaloneCollection(id, updates),
    onSuccess: refresh,
    onError,
  });
  const deleteMutation = useMutation({
    mutationFn: collectionStorage.deleteStandaloneCollection,
    onSuccess: async () => {
      await refresh();
      showToast("success", "Collection deleted");
    },
    onError,
  });
  const clearMutation = useMutation({
    mutationFn: collectionStorage.clearStandaloneCollections,
    onSuccess: refresh,
    onError,
  });
  return {
    collections,
    isLoading,
    error,
    createStandaloneCollection: createMutation.mutateAsync,
    updateStandaloneCollection: updateMutation.mutateAsync,
    deleteStandaloneCollection: deleteMutation.mutateAsync,
    clearAllStandaloneCollections: clearMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isClearing: clearMutation.isPending,
  };
};
