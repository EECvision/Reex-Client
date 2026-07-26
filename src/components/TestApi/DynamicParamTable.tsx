import React, { useState } from 'react';
import styles from './DynamicParamTable.module.css';
import { Plus, Trash2, CheckCircle, Circle, Copy, Check } from 'lucide-react';

export interface ParamRow {
    id: string;
    key: string;
    value: string;
    active: boolean;
}

interface DynamicParamTableProps {
    title: string;
    params: ParamRow[];
    onChange: (newParams: ParamRow[]) => void;
    placeholderKey?: string;
    placeholderValue?: string;
    inheritedParams?: Record<string, string>;
}

const DynamicParamTable: React.FC<DynamicParamTableProps> = ({
    title,
    params,
    onChange,
    placeholderKey = "Key",
    placeholderValue = "Value",
    inheritedParams = {}
}) => {
    const [isCopied, setIsCopied] = useState(false);

    const handleAdd = () => {
        const newId = Math.random().toString(36).substr(2, 9);
        onChange([...params, { id: newId, key: '', value: '', active: true }]);
    };

    const handleRemove = (id: string) => {
        onChange(params.filter(p => p.id !== id));
    };

    const handleUpdate = (id: string, field: 'key' | 'value', text: string) => {
        onChange(params.map(p => p.id === id ? { ...p, [field]: text } : p));
    };

    const toggleActive = (id: string) => {
        onChange(params.map(p => p.id === id ? { ...p, active: !p.active } : p));
    };

    const handleCopy = () => {
        const paramObj = params.reduce((acc, p) => {
            if (p.active && p.key) acc[p.key] = p.value;
            return acc;
        }, {} as Record<string, string>);

        navigator.clipboard.writeText(JSON.stringify(paramObj, null, 2));
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        const text = e.clipboardData.getData('text');
        try {
            const json = JSON.parse(text);
            if (typeof json === 'object' && json !== null && !Array.isArray(json)) {
                e.preventDefault();
                const newParams: ParamRow[] = Object.entries(json).map(([key, value]) => ({
                    id: Math.random().toString(36).substr(2, 9),
                    key,
                    value: String(value),
                    active: true
                }));

                // Append unique or replace? Let's append but filter out empty placeholder if exists
                const existing = params.filter(p => p.key || p.value);
                onChange([...existing, ...newParams]);
            }
        } catch (err) {
            // Not valid JSON, allow default paste
        }
    };

    return (
        <div className={styles.paramTableContainer}>
            <div className={styles.paramTableHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span className={styles.paramTitle}>{title}</span>
                    <button
                        className={styles.addParamBtn}
                        onClick={handleCopy}
                        title="Copy as JSON"
                    >
                        {isCopied ? <Check size={12} /> : <Copy size={12} />}
                        {isCopied ? 'Copied' : 'JSON'}
                    </button>
                </div>
                <button className={styles.addParamBtn} onClick={handleAdd}>
                    <Plus size={14} />
                    Add
                </button>
            </div>

            <div className={styles.paramList}>
                {params.length === 0 && (
                    <div className={styles.emptyParams}>
                        No {title.toLowerCase()} added yet.
                    </div>
                )}

                {Object.entries(inheritedParams)
                    .filter(([k]) => k && !params.some(p => p.active && p.key === k))
                    .map(([k, v]) => (
                    <div key={`inherited-${k}`} className={styles.paramRow} style={{ opacity: 0.6 }}>
                        <div className={styles.activeToggle} style={{ cursor: 'default' }} title="Inherited (Always Active)">
                            <CheckCircle size={16} className={styles.activeIcon} />
                        </div>
                        <input
                            type="text"
                            className={styles.paramInput}
                            value={k}
                            readOnly
                            style={{ cursor: 'not-allowed' }}
                            title="Inherited from Collection Settings"
                        />
                        <input
                            type="text"
                            className={styles.paramInput}
                            value={v}
                            readOnly
                            style={{ cursor: 'not-allowed' }}
                            title="Inherited from Collection Settings"
                        />
                        <div className={styles.removeParamBtn} style={{ visibility: 'hidden' }}>
                            <Trash2 size={15} />
                        </div>
                    </div>
                ))}

                {params.map(param => (
                    <div key={param.id} className={`${styles.paramRow} ${!param.active ? styles.paramRowInactive : ''}`}>
                        <button
                            className={styles.activeToggle}
                            onClick={() => toggleActive(param.id)}
                            title={param.active ? "Disable" : "Enable"}
                        >
                            {param.active ?
                                <CheckCircle size={16} className={styles.activeIcon} /> :
                                <Circle size={16} className={styles.inactiveIcon} />
                            }
                        </button>

                        <input
                            type="text"
                            className={styles.paramInput}
                            placeholder={placeholderKey}
                            value={param.key}
                            onChange={(e) => handleUpdate(param.id, 'key', e.target.value)}
                            onPaste={handlePaste}
                        />

                        <input
                            type="text"
                            className={styles.paramInput}
                            placeholder={placeholderValue}
                            value={param.value}
                            onChange={(e) => handleUpdate(param.id, 'value', e.target.value)}
                            onPaste={handlePaste}
                        />

                        <button
                            className={styles.removeParamBtn}
                            onClick={() => handleRemove(param.id)}
                            title="Remove"
                        >
                            <Trash2 size={15} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DynamicParamTable;
