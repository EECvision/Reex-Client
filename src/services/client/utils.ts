
export const getLocalUrl = () => {
    if (typeof window === 'undefined') return "http://localhost:4000"; // SSR fallback
    const params = new URLSearchParams(window.location.search);
    const port = params.get("localPort") || "4000";
    return `http://localhost:${port}`;
};

export const cloudUrl = "/api";

export const handleOperationResponse = async (res: Response) => {
    let data;
    try {
        data = await res.json();
    } catch (e) {
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
