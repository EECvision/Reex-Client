/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import styles from "./QuerySection.module.css";
import { Button } from "../ui/Button/Button";
import { ClipboardList, FileText, Upload, ListTree, XIcon, FormInput, Code } from "lucide-react";

// Dynamic import for Monaco to avoid SSR issues
const MonacoJsonEditor = dynamic(
  () => import("../MonacoJsonEditor/MonacoJsonEditor"),
  { ssr: false, loading: () => <div className={styles.editorLoading}>Loading editor...</div> }
);

type InputMode = "form" | "raw";

interface EndpointArgProperty {
  name: string;
  isOptional: boolean;
  description?: string;
  type?: string;
  properties?: EndpointArgProperty[];
}

interface EndpointArg {
  name: string;
  isOptional: boolean;
  description?: string;
  type?: string;
  isObject?: boolean;
  properties?: EndpointArgProperty[];
}

interface EndpointInfo {
  apiKey: string;
  fnName: string;
  args: EndpointArg[];
  contentType?: string;
  description?: string;
}

interface QuerySectionProps {
  selectedEndpoint: EndpointInfo;
  currentParams: Record<string, any>;
  loading: boolean;
  isSubmitDisabled: boolean;
  onParamChange: (paramName: string, value: any, type?: string) => void;
  onSubmit: () => void;
  rawPayload?: string;
  onRawPayloadChange?: (value: string) => void;
  inputMode?: InputMode;
  onInputModeChange?: (mode: InputMode) => void;
}

const getTypeColor = (type: string) => {
  const t = type.toLowerCase();
  if (t.includes('string')) return '#059669'; // emerald-600
  if (t.includes('int') || t.includes('number') || t.includes('float') || t.includes('double')) return '#2563eb'; // blue-600
  if (t.includes('bool')) return '#dc2626'; // red-600
  if (t.includes('array') || t.includes('[]') || t.includes('list')) return '#d97706'; // amber-600
  if (t.includes('object') || t.includes('map') || t.includes('dict')) return '#7c3aed'; // violet-600
  return '#64748b'; // slate-500
};

const QuerySection: React.FC<QuerySectionProps> = ({
  selectedEndpoint,
  currentParams,
  loading,
  isSubmitDisabled,
  onParamChange,
  onSubmit,
  rawPayload = "",
  onRawPayloadChange,
  inputMode = "form",
  onInputModeChange,
}) => {
  const [selectedFiles, setSelectedFiles] = useState<Record<string, File>>({});
  const [localInputMode, setLocalInputMode] = useState<InputMode>(inputMode);
  const [localRawPayload, setLocalRawPayload] = useState(rawPayload);

  const isMultipart = selectedEndpoint.contentType === 'multipart/form-data';

  // Generate default JSON template from endpoint args, using type info for correct structure
  const generateDefaultTemplate = () => {
    // Build a value for a property based on its type and sub-properties
    const buildValue = (prop: EndpointArgProperty): any => {
      const isArray = prop.type?.includes('[]');
      const hasSubs = prop.properties && prop.properties.length > 0;

      if (hasSubs) {
        // Build an object from sub-properties
        const obj: Record<string, any> = {};
        prop.properties!.forEach((sub) => {
          obj[sub.name] = buildValue(sub);
        });
        return isArray ? [obj] : obj;
      }

      // Primitive defaults based on type
      if (isArray) return [];
      if (prop.type === 'number') return 0;
      if (prop.type === 'boolean') return false;
      return "";
    };

    const template: Record<string, any> = {};

    selectedEndpoint.args.forEach((arg) => {
      if (arg.isObject && Array.isArray(arg.properties)) {
        // Payload type — expand top-level properties
        arg.properties.forEach((prop) => {
          template[prop.name] = buildValue(prop);
        });
      } else {
        // Direct parameter
        const isArray = arg.type?.includes('[]');
        if (arg.properties && arg.properties.length > 0) {
          const obj: Record<string, any> = {};
          arg.properties.forEach((sub) => {
            obj[sub.name] = buildValue(sub);
          });
          template[arg.name] = isArray ? [obj] : obj;
        } else if (isArray) {
          template[arg.name] = [];
        } else if (arg.type === 'number') {
          template[arg.name] = 0;
        } else if (arg.type === 'boolean') {
          template[arg.name] = false;
        } else {
          template[arg.name] = "";
        }
      }
    });

    return JSON.stringify(template, null, 2);
  };

  // Sync with parent if controlled
  useEffect(() => {
    setLocalInputMode(inputMode);
  }, [inputMode]);

  useEffect(() => {
    // If parent provides a raw payload, use it; otherwise generate default
    if (rawPayload) {
      setLocalRawPayload(rawPayload);
    } else if (selectedEndpoint.args.length > 0) {
      const defaultTemplate = generateDefaultTemplate();
      setLocalRawPayload(defaultTemplate);
      onRawPayloadChange?.(defaultTemplate);
    }
  }, [rawPayload, selectedEndpoint]);

  const handleModeChange = (mode: InputMode) => {
    setLocalInputMode(mode);
    onInputModeChange?.(mode);
  };

  const handleRawChange = (value: string) => {
    setLocalRawPayload(value);
    onRawPayloadChange?.(value);
  };

  const handleFileChange = (paramName: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFiles(prev => ({ ...prev, [paramName]: file }));
      onParamChange(paramName, file);
    }
  };

  const removeFile = (paramName: string) => {
    setSelectedFiles(prev => {
      const updated = { ...prev };
      delete updated[paramName];
      return updated;
    });
    onParamChange(paramName, undefined);
  };

  const isFileParam = (name: string, type?: string) => {
    const fileNames = ['file', 'image', 'photo', 'attachment', 'document', 'upload', 'avatar', 'icon', 'picture', 'pdf', 'media', 'asset'];
    const isNameMatch = fileNames.some(fn => name.toLowerCase().includes(fn));
    const isTypeMatch = type ? (type.toLowerCase().includes('file') || type.toLowerCase().includes('blob')) : false;
    return isMultipart && (isNameMatch || isTypeMatch);
  };

  const renderInput = (name: string, isOptional: boolean, type?: string) => {
    if (isFileParam(name, type)) {
      const selectedFile = selectedFiles[name];

      if (selectedFile) {
        return (
          <div className={styles.selectedFile}>
            <FileText className={styles.selectedFileIcon} size={16} />
            <span>{selectedFile.name}</span>
            <button
              type="button"
              className={styles.removeFileBtn}
              onClick={() => removeFile(name)}
            >
              <XIcon size={14} />
            </button>
          </div>
        );
      }

      return (
        <label className={styles.fileInputLabel}>
          <Upload className={styles.fileInputIcon} size={20} />
          <span>Choose file{isOptional ? '' : ' *'}</span>
          <input
            type="file"
            onChange={(e) => handleFileChange(name, e)}
            style={{ display: 'none' }}
          />
        </label>
      );
    }

    return (
      <input
        type="text"
        value={currentParams[name] ?? ""}
        onChange={(e) => onParamChange(name, e.target.value, type)}
        className={styles.paramInput}
        placeholder={isOptional ? "Enter value" : "Enter value"}
      />
    );
  };

  const hasParams = selectedEndpoint.args.length > 0;

  return (
    <div className={styles.querySectionWrapper}>
      <div className={styles.queryHeader}>
        <h2 className={styles.queryTitle}>
          <ListTree className={styles.titleIcon} size={18} />
          Request Parameters
          {isMultipart && <span className={styles.multipartBadge}>multipart</span>}
        </h2>

        {/* Input Mode Toggle - only show if there are parameters and not multipart */}
        {hasParams && !isMultipart && (
          <div className={styles.modeToggle}>
            <button
              className={`${styles.modeButton} ${localInputMode === "form" ? styles.modeButtonActive : ""}`}
              onClick={() => handleModeChange("form")}
              title="Form Input"
            >
              <FormInput size={14} />
              <span>Form</span>
            </button>
            <button
              className={`${styles.modeButton} ${localInputMode === "raw" ? styles.modeButtonActive : ""}`}
              onClick={() => handleModeChange("raw")}
              title="Raw JSON"
            >
              <Code size={14} />
              <span>Raw</span>
            </button>
          </div>
        )}
      </div>

      <div className={styles.querySection}>
        {!hasParams ? (
          <div className={styles.noParams}>
            <ClipboardList className={styles.noParamsIcon} size={40} strokeWidth={1.5} />
            <p>No parameters required for this endpoint</p>
          </div>
        ) : localInputMode === "raw" ? (
          <div className={styles.rawInputWrapper}>
            <MonacoJsonEditor
              value={localRawPayload}
              onChange={handleRawChange}
              height="200px"
            />
            <p className={styles.rawHint}>
              Fill in the values for each parameter.
            </p>
          </div>
        ) : (
          <div className={styles.paramList}>
            {(() => {
              // Recursive function to render a property tree
              const renderParamNode = (prop: EndpointArgProperty | EndpointArg, path: string, depth: number): React.ReactNode => {
                const hasChildren = prop.properties && prop.properties.length > 0;
                const isArray = prop.type?.includes('[]') || prop.type?.toLowerCase().includes('array') || prop.type?.toLowerCase().includes('list');
                const basePath = isArray && hasChildren ? `${path}.0` : path;

                if (hasChildren) {
                  return (
                    <div key={path} className={styles.paramGroup} style={{ 
                      marginLeft: depth > 0 ? '12px' : '0', 
                      borderLeft: depth > 0 ? '2px solid var(--border-color)' : 'none', 
                      paddingLeft: depth > 0 ? '16px' : '0',
                      marginTop: depth > 0 ? '12px' : '0',
                      marginBottom: '12px'
                    }}>
                      <label className={styles.paramLabel}>
                        {prop.name}
                        {!prop.isOptional && <span className={styles.required}>*</span>}
                        {prop.type && <span className={styles.paramType} style={{ color: getTypeColor(prop.type) }}>{prop.type}</span>}
                      </label>
                      {prop.description && (
                        <span className={styles.paramDescription} style={{ marginBottom: '8px', display: 'block' }}>{prop.description}</span>
                      )}
                      <div className={styles.nestedParams}>
                        {prop.properties!.map((child) => renderParamNode(child, `${basePath}.${child.name}`, depth + 1))}
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={path} className={styles.paramField} style={{ 
                    marginLeft: depth > 0 ? '12px' : '0', 
                    borderLeft: depth > 0 ? '2px solid var(--border-color)' : 'none', 
                    paddingLeft: depth > 0 ? '16px' : '0',
                    marginTop: depth > 0 ? '8px' : '0'
                  }}>
                    <label className={styles.paramLabel}>
                      {prop.name}
                      {!prop.isOptional && <span className={styles.required}>*</span>}
                      {prop.type && <span className={styles.paramType} style={{ color: getTypeColor(prop.type) }}>{prop.type}</span>}
                    </label>
                    {prop.description && (
                      <span className={styles.paramDescription}>{prop.description}</span>
                    )}
                    {renderInput(basePath, prop.isOptional, prop.type)}
                  </div>
                );
              };

              return selectedEndpoint.args.map((arg) => {
                if (arg.isObject && Array.isArray(arg.properties)) {
                  // If it's a payload object, expand its properties at depth 0
                  return arg.properties.map((prop) => renderParamNode(prop, prop.name, 0));
                }

                // If it's a normal arg
                return renderParamNode(arg, arg.name, 0);
              });
            })()}
          </div>
        )}

        <Button
          onClick={onSubmit}
          disabled={isSubmitDisabled}
          className={styles.submitButton}
          variant="primary"
          isLoading={loading}
        >
          Send Request
        </Button>
      </div>
    </div>
  );
};

export default QuerySection;
