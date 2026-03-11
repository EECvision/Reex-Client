
export const getLocalUrl = () => {
    if (typeof window === 'undefined') return "http://localhost:4000"; // SSR fallback
    const params = new URLSearchParams(window.location.search);
    const port = params.get("localPort") || "4000";
    return `http://localhost:${port}`;
};

export const cloudUrl = "/api";

// Cached apiServicesDir - resolves once from bridge health, then reused
let _cachedApiServicesDir: string | null = null;
let _apiServicesDirPromise: Promise<string> | null = null;

export const getApiServicesDir = async (): Promise<string> => {
    if (_cachedApiServicesDir !== null) return _cachedApiServicesDir;
    if (_apiServicesDirPromise) return _apiServicesDirPromise;

    _apiServicesDirPromise = (async (): Promise<string> => {
        try {
            const res = await fetch(`${getLocalUrl()}/api/health`);
            if (res.ok) {
                const data = await res.json();
                const dir = data.apiServicesDir || "";
                _cachedApiServicesDir = dir;
                return dir;
            }
        } catch (e) {
            console.warn("Could not fetch apiServicesDir from bridge:", e);
        }
        _cachedApiServicesDir = "";
        return "";
    })();

    return _apiServicesDirPromise;
};

export const resetApiServicesDirCache = () => {
    _cachedApiServicesDir = null;
    _apiServicesDirPromise = null;
};

export const handleOperationResponse = async (res: Response) => {
    let data;
    try {
        data = await res.json();
    } catch {
        return { success: false, error: "Invalid JSON response" };
    }

    if (!data.success) return data;

    // Check for operations
    const operations = data.operations || (data.operation ? [data.operation] : []);

    if (operations.length > 0) {
        const bridgeUrl = getLocalUrl();
        for (const op of operations) {
            try {
                if (op.type === 'write') {
                    await fetch(`${bridgeUrl}/api/fs/write`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ filePath: op.filePath, content: op.content })
                    });
                } else if (op.type === 'delete') {
                    await fetch(`${bridgeUrl}/api/fs/delete`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ filePath: op.filePath })
                    });
                }
            } catch (e) {
                console.error(`Client-side operation failed: ${op.type} ${op.filePath}`, e);
                return { success: false, error: `Failed to write/delete ${op.filePath}: ${e}` };
            }
        }
    }

    return data;
};

/**
 * Helper to compress a file using the native browser CompressionStream.
 * Returns { blob, fileName } to be appended to FormData, falling back to raw file if compression fails.
 */
export const compressFilePayload = async (file: File, originalFileName?: string): Promise<{ blob: Blob | File, fileName: string }> => {
    const rawFileName = originalFileName || file.name;
    try {
        if (typeof CompressionStream !== 'undefined') {
            const stream = file.stream().pipeThrough(new CompressionStream('gzip'));
            const compressedBlob = await new Response(stream).blob();
            const finalName = rawFileName.endsWith('.gz') ? rawFileName : `${rawFileName}.gz`;
            return { blob: compressedBlob, fileName: finalName };
        }
    } catch (e) {
        console.warn("Compression failed, falling back to raw upload", e);
    }
    return { blob: file, fileName: rawFileName };
};
