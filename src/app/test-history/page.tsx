"use client";

import React, { useState, useEffect } from "react";
import { addToHistory, getHistory, deleteFromHistory } from "../actions/collectionActions";

export default function TestHistoryPage() {
    const [history, setHistory] = useState<any[]>([]);
    const [log, setLog] = useState<string[]>([]);

    const addLog = (msg: string) => setLog(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);

    const refreshHistory = async () => {
        try {
            addLog("Fetching history...");
            const data = await getHistory();
            setHistory(data);
            addLog(`Fetched ${data.length} items.`);
        } catch (e: any) {
            addLog(`Error fetching: ${e.message}`);
        }
    };

    const handleAdd = async () => {
        try {
            const name = `Test Collection ${Date.now()}`;
            const content = { demo: true, timestamp: Date.now() };
            addLog(`Adding ${name}...`);
            await addToHistory(name, content);
            addLog("Added successfully.");
            await refreshHistory();
        } catch (e: any) {
            addLog(`Error adding: ${e.message}`);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            addLog(`Deleting ${id}...`);
            await deleteFromHistory(id);
            addLog("Deleted successfully.");
            await refreshHistory();
        } catch (e: any) {
            addLog(`Error deleting: ${e.message}`);
        }
    };

    useEffect(() => {
        refreshHistory();
    }, []);

    return (
        <div style={{ padding: 20 }}>
            <h1>History Feature Test</h1>

            <div style={{ marginBottom: 20, display: 'flex', gap: 10 }}>
                <button
                    onClick={refreshHistory}
                    style={{ padding: '8px 16px', background: '#3b82f6', color: 'white', borderRadius: 4 }}
                >
                    Refresh List
                </button>
                <button
                    onClick={handleAdd}
                    style={{ padding: '8px 16px', background: '#10b981', color: 'white', borderRadius: 4 }}
                >
                    Add Test Item
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div>
                    <h2>Current History DB ({history.length})</h2>
                    {history.length === 0 ? <p>No items found.</p> : (
                        <ul style={{ listStyle: 'none', padding: 0 }}>
                            {history.map(item => (
                                <li key={item.id} style={{ border: '1px solid #ccc', padding: 10, marginBottom: 10, borderRadius: 4 }}>
                                    <strong>{item.name}</strong> <br />
                                    <small>{new Date(item.updated_at).toLocaleString()}</small> <br />
                                    <pre style={{ background: '#f5f5f5', padding: 5, fontSize: 10 }}>
                                        {JSON.stringify(item.content).slice(0, 50)}...
                                    </pre>
                                    <button
                                        onClick={() => handleDelete(item.id)}
                                        style={{ marginTop: 5, padding: '4px 8px', background: '#ef4444', color: 'white', borderRadius: 4, fontSize: 12 }}
                                    >
                                        Delete
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div>
                    <h2>Logs</h2>
                    <div style={{ background: '#111', color: '#0f0', padding: 10, borderRadius: 4, height: 400, overflowY: 'auto', fontFamily: 'monospace' }}>
                        {log.map((l, i) => <div key={i}>{l}</div>)}
                    </div>
                </div>
            </div>
        </div>
    );
}
