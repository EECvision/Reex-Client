import React, { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import {
  Send,
  Layout,
  Pencil,
  Loader2,
  Check,

} from "lucide-react";
import { api } from "@/services/api";
import { ClientStorage } from "@/lib/clientStorage";
import styles from "./RequestEditor.module.css";
import ResultSection from "@/components/ResultSection/ResultSection";
import { Button } from "@/components/ui/Button/Button";
import { Select } from "@/components/ui/Select/Select";
import DynamicParamTable, {
  ParamRow,
} from "@/components/TestApi/DynamicParamTable";
import { useToast } from "@/hooks/useToast";
import LocalhostBanner from "../LocalhostBanner/LocalhostBanner";
import { isLocalhostUrl } from "@/lib/urlUtils";

import CurlSection from "@/components/CurlSection/CurlSection";

// Monaco Editor
const MonacoJsonEditor = dynamic(
  () => import("@/components/MonacoJsonEditor/MonacoJsonEditor"),
  { ssr: false, loading: () => <div>Loading editor...</div> },
);

const METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"];

export interface RequestConfigPayload {
  method: string;
  url: string;
  queryParams: ParamRow[];
  headers: ParamRow[];
  auth: { type: "bearer" | "none"; token: string };
  bodyType: "none" | "json" | "form-data";
  body: string;
  formData: ParamRow[];
}

export interface RequestEditorData extends Partial<RequestConfigPayload> {
  baseUrl?: string;
  authType?: "bearer" | "none";
  authToken?: string;
  customHeaders?: Record<string, string>;
}

interface RequestEditorProps {
  data?: RequestEditorData; // The request data (method, url, etc)
  onSave: (name: string, config: RequestConfigPayload) => void;
  requestName: string;
  requestId: string;
}

const PROXY_PORT = 9876;
const PROXY_URL = `http://localhost:${PROXY_PORT}`;

export default function RequestEditor({
  data,
  onSave,
  requestName,
  requestId,
}: RequestEditorProps) {
  const { showToast } = useToast();

  // Request State
  const [name, setName] = useState(requestName);
  const [method, setMethod] = useState("GET");
  const [url, setUrl] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [activeTab, setActiveTab] = useState<
    "params" | "auth" | "headers" | "body"
  >("params");

  // Dynamic Params
  const [queryParams, setQueryParams] = useState<ParamRow[]>([
    { id: "1", key: "", value: "", active: true },
  ]);
  const [headers, setHeaders] = useState<ParamRow[]>([
    { id: "1", key: "Content-Type", value: "application/json", active: true },
    { id: "2", key: "Accept", value: "application/json", active: true },
  ]);

  // Auth State
  const [authType, setAuthType] = useState<"none" | "bearer">("none");
  const [authToken, setAuthToken] = useState("");

  // Body State
  const [bodyType, setBodyType] = useState<"none" | "json" | "form-data">("json");
  const [body, setBody] = useState("{\n  \n}");
  const [formData, setFormData] = useState<ParamRow[]>([
    { id: "1", key: "", value: "", active: true },
  ]);

  // Auth & Config inherited from Collection
  const inheritedCustomHeaders: Record<string, string> =
    data?.customHeaders || {};

  // Response State
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [interfacePreview, setInterfacePreview] = useState<string | null>(null);

  const [copied, setCopied] = useState(false);
  const [executedCurl, setExecutedCurl] = useState<string | undefined>(
    undefined,
  );
  const [isSaving, setIsSaving] = useState(false);

  // Sync state with props (Initial Load)
  const initialDataRef = useRef(data);
  useEffect(() => {
    const initialData = initialDataRef.current;
    if (initialData) {
      setMethod(initialData.method || "GET");
      setUrl(initialData.url || "");
      setBaseUrl(initialData.baseUrl || "");
      setQueryParams(
        initialData.queryParams || [{ id: "1", key: "", value: "", active: true }],
      );
      setHeaders(
        initialData.headers || [
          {
            id: "1",
            key: "Content-Type",
            value: "application/json",
            active: true,
          },
        ],
      );
      setAuthType(initialData.authType || "none");
      setAuthToken(initialData.authToken || "");
      setBodyType(initialData.bodyType || "json");
      setBody(initialData.body || "{\n  \n}");
      setFormData(
        initialData.formData || [{ id: "1", key: "", value: "", active: true }],
      );
      // Clear results temporarily until cache loads
      setResult(null);
      setError(null);
      setExecutedCurl(undefined);
      setInterfacePreview(null);

      // Load from LRU Cache
      if (requestId) {
        ClientStorage.getExecutionResult(requestId)
          .then((saved) => {
            if (saved) {
              setResult(saved.result || null);
              setError(saved.error || null);
              setExecutedCurl(saved.executedCurl || undefined);
              setInterfacePreview(saved.interfacePreview || null);
            }
          })
          .catch((err) => console.error("Failed to load cached result", err));
      }
    }
    setName(requestName);
  }, [requestName, requestId]); // Run only on mount (key forces remount on switch)

  const dataBaseUrl = data?.baseUrl;
  const dataAuthType = data?.authType;
  const dataAuthToken = data?.authToken;

  // Sync inherited properties if they change externally (e.g., from Navbar)
  useEffect(() => {
    if (dataBaseUrl !== undefined) setBaseUrl(dataBaseUrl);
    setAuthType(dataAuthType || "none");
    setAuthToken(dataAuthToken || "");
  }, [dataBaseUrl, dataAuthType, dataAuthToken]);

  const onSaveRef = useRef(onSave);
  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  // Auto-Save Effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const config = {
        method,
        url,
        queryParams,
        headers,
        auth: { type: authType, token: authToken },
        bodyType,
        body,
        formData,
      };
      onSaveRef.current(name, config);
      setIsSaving(false);
    }, 1000);

    setIsSaving(true);
    return () => clearTimeout(timeoutId);
  }, [name, method, url, queryParams, headers, authType, authToken, bodyType, body, formData]);

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
      if (baseUrl && !finalUrl.startsWith("http")) {
        // Ensure there's a slash between baseUrl and path if needed
        const bUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
        const path = finalUrl.startsWith("/") ? finalUrl : "/" + finalUrl;
        finalUrl = bUrl + path;
      }
      const activeParams = queryParams.filter((p) => p.active && p.key);
      if (activeParams.length > 0) {
        const qs = activeParams
          .map(
            (p) =>
              `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`,
          )
          .join("&");
        finalUrl += (finalUrl.includes("?") ? "&" : "?") + qs;
      }

      // 2. Construct Headers
      const finalHeaders: Record<string, string> = {};
      headers.forEach((h) => {
        if (h.active && h.key) finalHeaders[h.key] = h.value;
      });

      if (authType === "bearer" && authToken) {
        finalHeaders["Authorization"] = `Bearer ${authToken}`;
      }

      // Apply custom headers from collection auth config
      Object.entries(inheritedCustomHeaders).forEach(([k, v]) => {
        if (k && !finalHeaders[k]) {
          // Don't override if explicitly set in request params
          finalHeaders[k] = v;
        }
      });

      // 3. Prepare Body
      let requestData = undefined;
      let activeFormData: ParamRow[] = [];

      if (["POST", "PUT", "PATCH"].includes(method)) {
        if (bodyType === "json") {
          try {
            if (body && body.trim()) {
              requestData = JSON.parse(body);
            }
          } catch {
            throw new Error("Invalid JSON body");
          }
        } else if (bodyType === "form-data") {
          activeFormData = formData.filter((p) => p.active && p.key);
        }
      }

      // 4. Update Header for JSON if body exists
      if (bodyType === "json" && requestData && !finalHeaders["Content-Type"]) {
        finalHeaders["Content-Type"] = "application/json";
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

      if (bodyType === "json" && requestData) {
        const jsonData = JSON.stringify(requestData, null, 2);
        curlCmd += ` \\\n-d '${jsonData}'`;
      } else if (bodyType === "form-data" && activeFormData.length > 0) {
        activeFormData.forEach(p => {
          if (p.type === 'file' && p.file) {
            curlCmd += ` \\\n-F '${p.key}=@${p.file.name}'`;
          } else {
            curlCmd += ` \\\n-F '${p.key}=${p.value}'`;
          }
        });
      }
      setExecutedCurl(curlCmd);
      // ---------------------

      // 5. Execute
      const isLocal = isLocalhostUrl(finalUrl);
      let execRes: { success?: boolean; error?: string; data?: unknown; [key: string]: unknown } = {};

      if (isLocal) {
        // Route through user's local reex-proxy to reach localhost
        try {
          const proxyRes = await fetch(`${PROXY_URL}/proxy`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              url: finalUrl,
              method,
              data: requestData,
              formData: activeFormData.length > 0 ? activeFormData : undefined,
              headers: finalHeaders,
            }),
          });
          execRes = await proxyRes.json();
        } catch {
          throw new Error(
            "Could not connect to the local proxy. Run `npx reex-proxy` in your terminal first.",
          );
        }
      } else {
        // External URL — use server-side proxy to bypass CORS
        execRes = await api.executeRequest({
          url: finalUrl,
          method,
          data: requestData,
          formData: activeFormData.length > 0 ? activeFormData : undefined,
          headers: finalHeaders,
          useProxy: true,
        });
      }

      if (!execRes.success) {
        throw new Error(execRes.error || "Request failed");
      }

      setResult(execRes.data);
      showToast("success", `Status: ${(execRes.data as Record<string, unknown>)?.status || 200}`);

      let currentPreview: string | null = null;
      // Generate Interface Preview
      try {
        const previewRes = await api.previewTypes({
          data: execRes.data,
          fnName: "ManualRequest",
        });
        const res = previewRes as { success?: boolean; interfaceString?: string };
        if (res.success) {
          currentPreview = res.interfaceString || null;
          setInterfacePreview(currentPreview);
        }
      } catch (e) {
        console.warn("Failed to generate type preview", e);
      }
      // Save to LRU Cache
      ClientStorage.saveExecutionResult(requestId, {
        result: execRes.data,
        error: undefined,
        executedCurl: curlCmd,
        interfacePreview: currentPreview || undefined,
      }).catch((e) => console.error(e));
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      const errMsg = errorMessage || "Unknown error occurred";
      setError(errMsg);
      showToast("error", "Error: Failed to fetch");

      // Wait, curlCmd is scoped to the try block. It might not exist here.
      // But executedCurl state is already updated before the fetch starts!
      ClientStorage.saveExecutionResult(requestId, {
        result: undefined,
        error: errMsg,
        executedCurl: undefined, // We'll just omit it here, state will use undefined or old value
        interfacePreview: undefined,
      }).catch((e) => console.error(e));
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
        {/* Localhost Info Banner */}
        {(isLocalhostUrl(url) || isLocalhostUrl(baseUrl)) && (
          <LocalhostBanner />
        )}

        <div className={styles.headerRow}>
          <div className={styles.headerLeft}>
            <div className={styles.headerIcon}>
              <Layout size={20} />
            </div>
            <div className={styles.nameWrapper}>
              <div className={styles.inputSizerWrapper}>
                <span className={styles.inputSizer}>
                  {name || "Request Name"}
                </span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={styles.nameInput}
                  placeholder="Request Name"
                />
              </div>
              <Pencil size={16} className={styles.editIcon} />
            </div>
          </div>
          <div className={styles.saveStatus}>
            {isSaving ? (
              <>
                <Loader2 size={14} className={styles.spinner} />
                <span>Syncing...</span>
              </>
            ) : (
              <>
                <Check size={14} />
                <span>Synced</span>
              </>
            )}
          </div>
        </div>

        {/* Request Bar */}
        <div className={styles.requestBar}>
          <div style={{ width: 120 }}>
            <Select
              className={styles.requestSelect}
              options={METHODS.map((m) => ({ value: m, label: m }))}
              value={method}
              onChange={setMethod}
            />
          </div>

          <div className={styles.urlInputContainer}>
            <span className={styles.baseUrlPrefix}>
              {baseUrl || "Set Base URL in Navbar ↗"}
            </span>
            <input
              type="text"
              className={styles.urlInput}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="/users"
            />
          </div>

          <Button
            variant="primary"
            onClick={handleSend}
            disabled={loading || !url}
            isLoading={loading}
            leftIcon={<Send size={16} />}
            style={{ height: "40px" }}
          >
            Send
          </Button>
        </div>

        {/* Config Tabs */}
        <div>
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${activeTab === "params" ? styles.tabActive : ""}`}
              onClick={() => setActiveTab("params")}
            >
              Query Params
            </button>
            <button
              className={`${styles.tab} ${activeTab === "headers" ? styles.tabActive : ""}`}
              onClick={() => setActiveTab("headers")}
            >
              Headers
            </button>
            <button
              className={`${styles.tab} ${activeTab === "auth" ? styles.tabActive : ""}`}
              onClick={() => setActiveTab("auth")}
            >
              Auth
            </button>
            <button
              className={`${styles.tab} ${activeTab === "body" ? styles.tabActive : ""}`}
              onClick={() => setActiveTab("body")}
            >
              Body
            </button>
          </div>

          <div className={styles.tabContent}>
            {activeTab === "params" && (
              <DynamicParamTable
                title="Query Parameters"
                params={queryParams}
                onChange={setQueryParams}
              />
            )}

            {activeTab === "headers" && (
              <DynamicParamTable
                title="Request Headers"
                params={headers}
                onChange={setHeaders}
                placeholderKey="Header"
                inheritedParams={inheritedCustomHeaders}
              />
            )}

            {activeTab === "auth" && (
              <div className={styles.authSection}>
                <div>
                  <label className={styles.authTypeLabel}>
                    Authorization Type:
                  </label>
                  <p
                    className={styles.authHelp}
                    style={{ marginBottom: "12px", marginTop: "-4px" }}
                  >
                    Inherited from Collection settings (Editable in Navbar)
                  </p>
                  <div style={{ width: 200 }}>
                    <Select
                      options={[
                        { value: "none", label: "None" },
                        { value: "bearer", label: "Bearer Token" },
                      ]}
                      value={authType}
                      onChange={() => {}}
                      disabled={true}
                    />
                  </div>
                </div>

                {authType === "bearer" && (
                  <input
                    type="text"
                    className={styles.authInput}
                    placeholder="Enter Bearer Token"
                    value={authToken}
                    onChange={() => {}}
                    readOnly
                    style={{ opacity: 0.6, cursor: "not-allowed" }}
                  />
                )}
              </div>
            )}

            {activeTab === "body" && (
              <div style={{ marginTop: 12 }}>
                <div style={{ marginBottom: 12 }}>
                  <Select
                    options={[
                      { value: "none", label: "None" },
                      { value: "json", label: "JSON" },
                      { value: "form-data", label: "Multipart Form Data" },
                    ]}
                    value={bodyType}
                    onChange={(v) =>
                      setBodyType(v as "none" | "json" | "form-data")
                    }
                  />
                </div>

                {bodyType === "json" && (
                  <>
                    <MonacoJsonEditor
                      value={body}
                      onChange={setBody}
                      height="200px"
                    />
                    <p
                      style={{
                        fontSize: 12,
                        color: "var(--text-secondary)",
                        marginTop: 8,
                      }}
                    >
                      JSON Body (Only for POST, PUT, PATCH)
                    </p>
                  </>
                )}

                {bodyType === "form-data" && (
                  <DynamicParamTable
                    title="Form Data"
                    params={formData}
                    onChange={setFormData}
                    placeholderKey="Key"
                    placeholderValue="Value"
                    allowFiles={true}
                  />
                )}
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
          onUpdateInterface={() => {}}
          updatingInterface={false}
          isStandaloneMode={true}
        />
      </div>
    </div>
  );
}
