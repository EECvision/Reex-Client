import React, { forwardRef } from 'react';
import styles from './Checkbox.module.css';

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, style, disabled, ...props }, ref) => {
    return (
      <span
        className={`${styles.checkboxWrapper} ${disabled ? styles.disabled : ''} ${className || ''}`}
        style={style}
      >
        <input
          type="checkbox"
          ref={ref}
          disabled={disabled}
          className={styles.nativeInput}
          {...props}
        />
        <span className={styles.customCheckbox} aria-hidden="true">
          <svg
            className={styles.checkIcon}
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="3.5 8.5 6.5 11.5 12.5 4.5" />
          </svg>
          <svg
            className={styles.dashIcon}
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <line x1="3.5" y1="8" x2="12.5" y2="8" />
          </svg>
        </span>
      </span>
    );
  }
);

Checkbox.displayName = 'Checkbox';
