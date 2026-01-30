/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import styles from "./QuerySection.module.css";
import { Button } from "../ui/Button/Button";

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
  const isMultipart = selectedEndpoint.contentType === 'multipart/form-data';

  const handleFileChange = (paramName: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onParamChange(paramName, file);
    }
  };

  const isFileParam = (name: string) => {
    // Common file parameter names
    const fileNames = ['file', 'image', 'photo', 'attachment', 'document', 'upload', 'avatar', 'icon'];
    return isMultipart && fileNames.some(fn => name.toLowerCase().includes(fn));
  };

  const renderInput = (name: string, isOptional: boolean) => {
    if (isFileParam(name)) {
      return (
        <input
          type="file"
          onChange={(e) => handleFileChange(name, e)}
          className={styles.paramInput}
        />
      );
    }
    return (
      <input
        type="text"
        value={currentParams[name] ?? ""}
        onChange={(e) => onParamChange(name, e.target.value)}
        className={styles.paramInput}
        placeholder={isOptional ? "Optional" : "Required"}
      />
    );
  };

  return (
    <div className={styles.querySection}>
      <h2 className={styles.queryTitle}>
        Query Parameters
        {isMultipart && <span className={styles.multipartBadge}>multipart/form-data</span>}
      </h2>
      {selectedEndpoint.args.length === 0 ? (
        <p className={styles.noParams}>No parameters required</p>
      ) : (
        <div className={styles.paramList}>
          {selectedEndpoint.args.map((arg) => {
            if (arg.isObject && Array.isArray(arg.properties)) {
              return arg.properties.map((prop) => (
                <div key={prop.name} className={styles.paramField}>
                  <label className={styles.paramLabel}>
                    {prop.name}
                    {!prop.isOptional && (
                      <span className={styles.required}>*</span>
                    )}
                    {prop.isOptional && (
                      <span className={styles.optional}>(optional)</span>
                    )}
                  </label>
                  {renderInput(prop.name, prop.isOptional)}
                </div>
              ));
            }

            return (
              <div key={arg.name} className={styles.paramField}>
                <label className={styles.paramLabel}>
                  {arg.name}
                  {!arg.isOptional && (
                    <span className={styles.required}>*</span>
                  )}
                  {arg.isOptional && (
                    <span className={styles.optional}>(optional)</span>
                  )}
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
  );
};

export default QuerySection;

