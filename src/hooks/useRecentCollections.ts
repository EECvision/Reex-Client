import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { collectionStorage } from "@/services/collectionStorage";
import { useToast } from "@/hooks/useToast";

const QUERY_KEY = ["recent-collections"];

export const useRecentCollections = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const {
    data: recentCollections = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: QUERY_KEY,
    retry: false,
    queryFn: collectionStorage.getHistory,
  });
  useEffect(() => {
    if (error) showToast("error", error.message);
  }, [error, showToast]);
  const refresh = () => queryClient.invalidateQueries({ queryKey: QUERY_KEY });
  const onError = (error: Error) =>
    showToast(
      "error",
      error.message || "Could not save history in this browser.",
    );
  const addMutation = useMutation({
    mutationFn: ({
      name,
      content,
    }: {
      name: string;
      content: Record<string, unknown>;
    }) => collectionStorage.addToHistory(name, content),
    onSuccess: refresh,
    onError,
  });
  const deleteMutation = useMutation({
    mutationFn: collectionStorage.deleteFromHistory,
    onSuccess: async () => {
      await refresh();
      showToast("success", "Removed from history");
    },
    onError,
  });
  return {
    recentCollections,
    isLoading,
    error,
    addCollectionToHistory: addMutation.mutateAsync,
    removeCollectionFromHistory: deleteMutation.mutateAsync,
    isAdding: addMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};
