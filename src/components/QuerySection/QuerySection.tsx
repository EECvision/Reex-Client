/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from "react";
import styles from "./QuerySection.module.css";
import { Button } from "../ui/Button/Button";
import { ClipboardList, FileText, Upload, ListTree, XIcon } from "lucide-react";

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
}

const QuerySection: React.FC<QuerySectionProps> = ({
  selectedEndpoint,
  currentParams,
  loading,
  isSubmitDisabled,
  onParamChange,
  onSubmit,
}) => {
  const [selectedFiles, setSelectedFiles] = useState<Record<string, File>>({});
  const isMultipart = selectedEndpoint.contentType === 'multipart/form-data';

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

  return (
    <div className={styles.querySectionWrapper}>
      <h2 className={styles.queryTitle}>
        <ListTree className={styles.titleIcon} size={18} />
        Request Parameters
        {isMultipart && <span className={styles.multipartBadge}>multipart</span>}
      </h2>

      <div className={styles.querySection}>
        {selectedEndpoint.args.length === 0 ? (
          <div className={styles.noParams}>
            <ClipboardList className={styles.noParamsIcon} size={40} strokeWidth={1.5} />
            <p>No parameters required for this endpoint</p>
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
