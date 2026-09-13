import React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { IDBFactory } from "fake-indexeddb";
import { ToastProvider } from "@/providers/ToastContext";
import { useCollections } from "./useCollections";

beforeEach(() => vi.stubGlobal("indexedDB", new IDBFactory()));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("loads, creates, and reloads local collections without a session provider or network calls", async () => {
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>
      <ToastProvider>{children}</ToastProvider>
    </QueryClientProvider>
  );
  const first = renderHook(() => useCollections(), { wrapper });
  await waitFor(() => expect(first.result.current.isLoading).toBe(false));
  await act(async () => {
    await first.result.current.createCollection("Local API");
  });
  expect(first.result.current.collections[0].name).toBe("Local API");
  first.unmount();
  client.clear();
  const second = renderHook(() => useCollections(), { wrapper });
  await waitFor(() =>
    expect(second.result.current.collections).toHaveLength(1),
  );
  expect(second.result.current.collections[0].name).toBe("Local API");
  expect(fetch).not.toHaveBeenCalled();
  second.unmount();
  client.clear();
});
