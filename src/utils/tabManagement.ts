export interface TabPointer {
  apiKey: string;
  fnName: string;
  isPinned: boolean;
}

export function getTabKey(apiKey: string, fnName: string): string {
  return `${apiKey}__${fnName}`;
}

export function selectEndpoint(
  currentPointers: TabPointer[],
  endpoint: { apiKey: string; fnName: string }
): { newPointers: TabPointer[]; newActiveKey: string } {
  const key = getTabKey(endpoint.apiKey, endpoint.fnName);
  const exists = currentPointers.some(
    (p) => getTabKey(p.apiKey, p.fnName) === key
  );
  if (exists) {
    return { newPointers: currentPointers, newActiveKey: key };
  }

  const newPointers = [
    ...currentPointers,
    { apiKey: endpoint.apiKey, fnName: endpoint.fnName, isPinned: true },
  ];
  return { newPointers, newActiveKey: key };
}

export function doubleClickEndpoint(
  currentPointers: TabPointer[],
  endpoint: { apiKey: string; fnName: string }
): { newPointers: TabPointer[]; newActiveKey: string } {
  const key = getTabKey(endpoint.apiKey, endpoint.fnName);
  const existingIndex = currentPointers.findIndex(
    (p) => getTabKey(p.apiKey, p.fnName) === key
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
