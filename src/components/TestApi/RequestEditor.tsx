import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Send, Layout, Pencil, Loader2, Check } from 'lucide-react';
import { api } from '@/services/api';
import styles from './RequestEditor.module.css';
import ResultSection from '@/components/ResultSection/ResultSection';
import { Button } from '@/components/ui/Button/Button';
import { Select } from '@/components/ui/Select/Select';
import DynamicParamTable, { ParamRow } from '@/components/TestApi/DynamicParamTable';
import { useToast } from '@/hooks/useToast';

import CurlSection from '@/components/CurlSection/CurlSection';

// Monaco Editor
const MonacoJsonEditor = dynamic(
    () => import("@/components/MonacoJsonEditor/MonacoJsonEditor"),
    { ssr: false, loading: () => <div>Loading editor...</div> }
);

const METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

interface RequestEditorProps {
    data?: any; // The request data (method, url, etc)
    onSave: (name: string, config: any) => void;
    requestName: string;
}

export default function RequestEditor({ data, onSave, requestName }: RequestEditorProps) {
    const { showToast } = useToast();

    // Request State
    const [name, setName] = useState(requestName);
    const [method, setMethod] = useState('GET');
    const [url, setUrl] = useState('https://jsonplaceholder.typicode.com/todos/1');
    const [activeTab, setActiveTab] = useState<'params' | 'auth' | 'headers' | 'body'>('params');

    // Dynamic Params
    const [queryParams, setQueryParams] = useState<ParamRow[]>([
        { id: '1', key: '', value: '', active: true }
    ]);
    const [headers, setHeaders] = useState<ParamRow[]>([
        { id: '1', key: 'Content-Type', value: 'application/json', active: true },
        { id: '2', key: 'Accept', value: 'application/json', active: true }
    ]);

    // Auth State
    const [authType, setAuthType] = useState<'none' | 'bearer'>('none');
    const [authToken, setAuthToken] = useState('');

    // Body State
    const [body, setBody] = useState('{\n  \n}');

    // Response State
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [interfacePreview, setInterfacePreview] = useState<string | null>(null);
    const [savingInterface, setSavingInterface] = useState(false);
    const [copied, setCopied] = useState(false);
    const [executedCurl, setExecutedCurl] = useState<string | undefined>(undefined);
    const [isSaving, setIsSaving] = useState(false);

    // Sync state with props (Initial Load)
    useEffect(() => {
        if (data) {
            setMethod(data.method || 'GET');
            setUrl(data.url || '');
            setQueryParams(data.queryParams || [{ id: '1', key: '', value: '', active: true }]);
            setHeaders(data.headers || [{ id: '1', key: 'Content-Type', value: 'application/json', active: true }]);
            setAuthType(data.authType || 'none');
            setAuthToken(data.authToken || '');
            setBody(data.body || '{\n  \n}');
            // Clear results on switch
            setResult(null);
            setError(null);
            setExecutedCurl(undefined);
            setInterfacePreview(null);
        }
        setName(requestName);
    }, []); // Run only on mount (key forces remount on switch)

    // Auto-Save Effect
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            const config = {
                method,
                url,
                queryParams,
                headers,
                auth: { type: authType, token: authToken },
                body
            };
            onSave(name, config);
            setIsSaving(false);
        }, 1000);

        setIsSaving(true);
        return () => clearTimeout(timeoutId);
    }, [name, method, url, queryParams, headers, authType, authToken, body]);

    // --- Logic ---

    const handleSend = async () => {
        setLoading(true);
        setResult(null);
        setError(null);
        setInterfacePreview(null);
        setExecutedCurl(undefined);

        try {
            // 1. Construct URL with Query Params
            let finalUrl = url.trim();
            const activeParams = queryParams.filter(p => p.active && p.key);
            if (activeParams.length > 0) {
                const qs = activeParams.map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`).join('&');
                finalUrl += (finalUrl.includes('?') ? '&' : '?') + qs;
            }

            // 2. Construct Headers
            const finalHeaders: Record<string, string> = {};
            headers.forEach(h => {
                if (h.active && h.key) finalHeaders[h.key] = h.value;
            });

            if (authType === 'bearer' && authToken) {
                finalHeaders['Authorization'] = `Bearer ${authToken}`;
            }

            // 3. Prepare Body
            let requestData = undefined;
            if (['POST', 'PUT', 'PATCH'].includes(method)) {
                try {
                    if (body && body.trim()) {
                        requestData = JSON.parse(body);
                    }
                } catch (e) {
                    throw new Error("Invalid JSON body");
                }
            }

            // 4. Update Header for JSON if body exists
            if (requestData && !finalHeaders['Content-Type']) {
                finalHeaders['Content-Type'] = 'application/json';
            }

            // --- Generate Curl ---
            let curlCmd = `curl -X '${method}' \\\n  '${finalUrl}'`;
            const paramHeaders: string[] = [];

            Object.entries(finalHeaders).forEach(([k, v]) => {
                paramHeaders.push(`-H '${k}: ${v}'`);
            });

            if (paramHeaders.length > 0) {
                curlCmd += ` \\\n${paramHeaders.join(" \\\n")}`;
            }

            if (requestData) {
                const jsonData = JSON.stringify(requestData, null, 2);
                curlCmd += ` \\\n-d '${jsonData}'`;
            }
            setExecutedCurl(curlCmd);
            // ---------------------

            // 5. Execute
            const isLocalhost = finalUrl.includes('localhost') || finalUrl.includes('127.0.0.1');

            const execRes: any = await api.executeRequest({
                url: finalUrl,
                method,
                data: requestData,
                headers: finalHeaders,
                useProxy: !isLocalhost // Always use proxy except for localhost
            });

            if (!execRes.success) {
                throw new Error(execRes.error || "Request failed");
            }

            setResult(execRes.data);
            showToast('success', `Status: ${execRes.data.status || 200}`);

            // Generate Interface Preview
            try {
                const previewRes = await api.previewTypes({
                    data: execRes.data,
                    fnName: 'ManualRequest'
                });
                if ((previewRes as any).success) {
                    setInterfacePreview((previewRes as any).interfaceString);
                }
            } catch (e) {
                console.warn("Failed to generate type preview", e);
            }

        } catch (err: any) {
            setError(err.message || "Unknown error occurred");
            showToast('error', "Error: Failed to fetch");
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = () => {
        if (result) {
            navigator.clipboard.writeText(JSON.stringify(result, null, 2));
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className={styles.editorContainer}>


            <div className={styles.editorScrollArea}>
                <div className={styles.headerRow}>
                    <div className={styles.headerLeft}>
                        <div className={styles.headerIcon}>
                            <Layout size={20} />
                        </div>
                        <div className={styles.nameWrapper}>
                            <input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className={styles.nameInput}
                                placeholder="Request Name"
                            />
                            <Pencil size={16} className={styles.editIcon} />
                        </div>
                    </div>
                    <div className={styles.saveStatus}>
                        {isSaving ? (
                            <>
                                <Loader2 size={14} className={styles.spinner} />
                                <span>Saving...</span>
                            </>
                        ) : (
                            <>
                                <Check size={14} />
                                <span>Saved</span>
                            </>
                        )}
                    </div>
                </div>

                {/* Request Bar */}
                <div className={styles.requestBar}>
                    <div style={{ width: 120 }}>
                        <Select
                            options={METHODS.map(m => ({ value: m, label: m }))}
                            value={method}
                            onChange={setMethod}
                        />
                    </div>

                    <input
                        type="text"
                        className={styles.urlInput}
                        value={url}
                        onChange={e => setUrl(e.target.value)}
                        placeholder="Enter request URL (e.g. https://api.example.com/users)"
                    />

                    <Button
                        variant="primary"
                        onClick={handleSend}
                        disabled={loading || !url}
                        isLoading={loading}
                        leftIcon={<Send size={16} />}
                    >
                        Send
                    </Button>
                </div>

                {/* Config Tabs */}
                <div>
                    <div className={styles.tabs}>
                        <button
                            className={`${styles.tab} ${activeTab === 'params' ? styles.tabActive : ''}`}
                            onClick={() => setActiveTab('params')}
                        >
                            Query Params
                        </button>
                        <button
                            className={`${styles.tab} ${activeTab === 'headers' ? styles.tabActive : ''}`}
                            onClick={() => setActiveTab('headers')}
                        >
                            Headers
                        </button>
                        <button
                            className={`${styles.tab} ${activeTab === 'auth' ? styles.tabActive : ''}`}
                            onClick={() => setActiveTab('auth')}
                        >
                            Auth
                        </button>
                        <button
                            className={`${styles.tab} ${activeTab === 'body' ? styles.tabActive : ''}`}
                            onClick={() => setActiveTab('body')}
                        >
                            Body
                        </button>
                    </div>

                    <div className={styles.tabContent}>
                        {activeTab === 'params' && (
                            <DynamicParamTable
                                title="Query Parameters"
                                params={queryParams}
                                onChange={setQueryParams}
                            />
                        )}

                        {activeTab === 'headers' && (
                            <DynamicParamTable
                                title="Request Headers"
                                params={headers}
                                onChange={setHeaders}
                                placeholderKey="Header"
                            />
                        )}

                        {activeTab === 'auth' && (
                            <div className={styles.authSection}>
                                <div>
                                    <label className={styles.authTypeLabel}>Authorization Type:</label>
                                    <div style={{ width: 200 }}>
                                        <Select
                                            options={[
                                                { value: "none", label: "None" },
                                                { value: "bearer", label: "Bearer Token" }
                                            ]}
                                            value={authType}
                                            onChange={(val) => setAuthType(val as any)}
                                        />
                                    </div>
                                </div>

                                {authType === 'bearer' && (
                                    <input
                                        type="text"
                                        className={styles.authInput}
                                        placeholder="Enter Bearer Token"
                                        value={authToken}
                                        onChange={(e) => setAuthToken(e.target.value)}
                                    />
                                )}
                            </div>
                        )}

                        {activeTab === 'body' && (
                            <div>
                                <MonacoJsonEditor
                                    value={body}
                                    onChange={setBody}
                                    height="200px"
                                />
                                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 8 }}>
                                    JSON Body (Only for POST, PUT, PATCH)
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Curl Section */}
                {executedCurl && (
                    <div style={{ marginTop: 20 }}>
                        <CurlSection curlCommand={executedCurl} />
                    </div>
                )}

                {/* Results */}
                <ResultSection
                    result={result}
                    error={error}
                    copied={copied}
                    onCopy={handleCopy}
                    interfacePreview={interfacePreview}
                    onUpdateInterface={() => { }}
                    updatingInterface={savingInterface}
                    isStandaloneMode={true}
                />
            </div>
        </div>
    );
}
