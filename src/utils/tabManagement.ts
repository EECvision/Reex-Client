export interface TabPointer {
  apiKey: string;
  fnName: string;
  isPinned: boolean;
}

// Browser storage can contain older full tabs or incomplete records.
// Validate it before allowing tab operations to treat it as TabPointer[].
export function normalizeTabPointers(value: unknown): TabPointer[] {
  if (!Array.isArray(value)) return [];

  const isRecord = (item: unknown): item is Record<string, unknown> =>
    typeof item === "object" && item !== null;

  return value.flatMap((item) => {
    if (!isRecord(item)) return [];
    const pointer = isRecord(item.endpoint) ? item.endpoint : item;
    if (
      typeof pointer.apiKey !== "string" ||
      !pointer.apiKey ||
      typeof pointer.fnName !== "string" ||
      !pointer.fnName
    )
      return [];

    return [
      {
        apiKey: pointer.apiKey,
        fnName: pointer.fnName,
        isPinned: item.isPinned !== false,
      },
    ];
  });
}

export function getTabKey(apiKey: string, fnName: string): string {
  return `${apiKey}__${fnName}`;
}

export function selectEndpoint(
  currentPointers: TabPointer[],
  endpoint: { apiKey: string; fnName: string },
  pinByDefault = false,
): { newPointers: TabPointer[]; newActiveKey: string } {
  const key = getTabKey(endpoint.apiKey, endpoint.fnName);
  const exists = currentPointers.some(
    (p) => getTabKey(p.apiKey, p.fnName) === key,
  );
  if (exists) {
    return { newPointers: currentPointers, newActiveKey: key };
  }

  const pointer = {
    apiKey: endpoint.apiKey,
    fnName: endpoint.fnName,
    isPinned: pinByDefault,
  };
  const previewIndex = pinByDefault
    ? -1
    : currentPointers.findIndex((p) => !p.isPinned);
  const newPointers = [...currentPointers];
  if (previewIndex >= 0) newPointers[previewIndex] = pointer;
  else newPointers.push(pointer);
  return { newPointers, newActiveKey: key };
}

export function doubleClickEndpoint(
  currentPointers: TabPointer[],
  endpoint: { apiKey: string; fnName: string },
): { newPointers: TabPointer[]; newActiveKey: string } {
  const key = getTabKey(endpoint.apiKey, endpoint.fnName);
  const existingIndex = currentPointers.findIndex(
    (p) => getTabKey(p.apiKey, p.fnName) === key,
  );
  if (existingIndex >= 0) {
    const newPointers = [...currentPointers];
    newPointers[existingIndex] = {
      ...newPointers[existingIndex],
      isPinned: true,
    };
    return { newPointers, newActiveKey: key };
  }
  const newPointers = [
    ...currentPointers,
    { apiKey: endpoint.apiKey, fnName: endpoint.fnName, isPinned: true },
  ];
  return { newPointers, newActiveKey: key };
}
