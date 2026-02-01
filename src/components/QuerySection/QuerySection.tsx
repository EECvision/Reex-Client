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

interface EndpointArg {
  name: string;
  isOptional: boolean;
  isObject?: boolean;
  properties?: {
    name: string;
    isOptional: boolean;
  }[];
}

interface EndpointInfo {
  apiKey: string;
  fnName: string;
  args: EndpointArg[];
  contentType?: string;
}

interface QuerySectionProps {
  selectedEndpoint: EndpointInfo;
  currentParams: Record<string, any>;
  loading: boolean;
  isSubmitDisabled: boolean;
  onParamChange: (paramName: string, value: any) => void;
  onSubmit: () => void;
  rawPayload?: string;
  onRawPayloadChange?: (value: string) => void;
  inputMode?: InputMode;
  onInputModeChange?: (mode: InputMode) => void;
}

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

  // Generate default JSON template from endpoint args
  const generateDefaultTemplate = () => {
    const template: Record<string, string> = {};

    selectedEndpoint.args.forEach((arg) => {
      if (arg.isObject && Array.isArray(arg.properties)) {
        arg.properties.forEach((prop) => {
          template[prop.name] = "";
        });
      } else {
        template[arg.name] = "";
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

  const isFileParam = (name: string) => {
    const fileNames = ['file', 'image', 'photo', 'attachment', 'document', 'upload', 'avatar', 'icon'];
    return isMultipart && fileNames.some(fn => name.toLowerCase().includes(fn));
  };

  const renderInput = (name: string, isOptional: boolean) => {
    if (isFileParam(name)) {
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
        onChange={(e) => onParamChange(name, e.target.value)}
        className={styles.paramInput}
        placeholder={isOptional ? "Enter value (optional)" : "Enter value"}
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
            {selectedEndpoint.args.map((arg) => {
              if (arg.isObject && Array.isArray(arg.properties)) {
                return arg.properties.map((prop) => (
                  <div key={prop.name} className={styles.paramField}>
                    <label className={styles.paramLabel}>
                      {prop.name}
                      {!prop.isOptional && <span className={styles.required}>*</span>}
                      {prop.isOptional && <span className={styles.optional}>optional</span>}
                    </label>
                    {renderInput(prop.name, prop.isOptional)}
                  </div>
                ));
              }

              return (
                <div key={arg.name} className={styles.paramField}>
                  <label className={styles.paramLabel}>
                    {arg.name}
                    {!arg.isOptional && <span className={styles.required}>*</span>}
                    {arg.isOptional && <span className={styles.optional}>optional</span>}
                  </label>
                  {renderInput(arg.name, arg.isOptional)}
                </div>
              );
            })}
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
