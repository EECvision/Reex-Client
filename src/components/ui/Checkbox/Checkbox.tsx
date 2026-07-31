import React, { forwardRef } from 'react';
import styles from './Checkbox.module.css';

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        type="checkbox"
        ref={ref}
        className={`${styles.checkbox} ${className || ''}`}
        {...props}
      />
    );
  }
);

Checkbox.displayName = 'Checkbox';
