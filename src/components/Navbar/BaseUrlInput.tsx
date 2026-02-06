import React, { useState, useEffect, useRef } from 'react';
import styles from './Navbar.module.css';

interface BaseUrlInputProps {
    value: string;
    onChange: (value: string) => void;
}

export const BaseUrlInput: React.FC<BaseUrlInputProps> = ({ value, onChange }) => {
    const [localValue, setLocalValue] = useState(value);

    useEffect(() => {
        setLocalValue(value);
    }, [value]);

    return (
        <input
            className={styles.baseUrlInput}
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onBlur={() => {
                if (localValue !== value) {
                    onChange(localValue);
                }
            }}
            onKeyDown={(e) => {
                if (e.key === 'Enter') {
                    e.currentTarget.blur();
                }
            }}
            placeholder="http://localhost:3000"
        />
    );
};
