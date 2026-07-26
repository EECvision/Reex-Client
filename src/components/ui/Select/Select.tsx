import React, { useState, useRef, useEffect } from "react";
import styles from "./Select.module.css";
import { ChevronDown } from "lucide-react";

interface SelectOption {
    value: string;
    label: string;
}

interface SelectProps {
    options: SelectOption[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string; // For wrapper positioning
    disabled?: boolean;
}

export const Select: React.FC<SelectProps> = ({
    options,
    value,
    onChange,
    placeholder = "Select...",
    className,
    disabled = false,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find((opt) => opt.value === value);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                containerRef.current &&
                !containerRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const handleSelect = (optionValue: string) => {
        onChange(optionValue);
        setIsOpen(false);
    };

    return (
        <div
            className={`${styles.selectContainer} ${className || ""} ${disabled ? styles.disabled : ""}`}
            ref={containerRef}
        >
            <div
                className={`${styles.selectTrigger} ${isOpen ? styles.open : ""} ${disabled ? styles.disabledTrigger : ""}`}
                onClick={() => !disabled && setIsOpen(!isOpen)}
            >
                <span className={styles.value}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <ChevronDown size={16} className={styles.icon} />
            </div>

            {isOpen && (
                <div className={styles.dropdownMenu}>
                    {options.map((option) => (
                        <div
                            key={option.value}
                            className={`${styles.option} ${option.value === value ? styles.selected : ""
                                }`}
                            onClick={() => handleSelect(option.value)}
                        >
                            {option.label}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
