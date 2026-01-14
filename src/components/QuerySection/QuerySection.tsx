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
}

interface QuerySectionProps {
  selectedEndpoint: EndpointInfo;
  currentParams: Record<string, any>;
  loading: boolean;
  isSubmitDisabled: boolean;
  onParamChange: (paramName: string, value: string) => void;
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
  return (
    <div className={styles.querySection}>
      <h2 className={styles.queryTitle}>Query Parameters</h2>
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
                  <input
                    type="text"
                    value={currentParams[prop.name] ?? ""}
                    onChange={(e) => onParamChange(prop.name, e.target.value)}
                    className={styles.paramInput}
                    placeholder={prop.isOptional ? "Optional" : "Required"}
                  />
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
                <input
                  type="text"
                  value={currentParams[arg.name] ?? ""}
                  onChange={(e) => onParamChange(arg.name, e.target.value)}
                  className={styles.paramInput}
                  placeholder={arg.isOptional ? "Optional" : "Required"}
                />
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
