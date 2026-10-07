// src/components/FieldSelector/FieldSelector.tsx
import React from 'react';
import { FIELD_OPTIONS } from '../../constants/fields';
import styles from './FieldSelector.module.css';

interface Props {
    fieldID: string;
    onChange: (next: string) => void;
    disabled?: boolean;
}

const FieldSelector: React.FC<Props> = ({ fieldID, onChange, disabled }) => {
    return (
        <div className={styles.container}>
            <label htmlFor="field-select" className={styles.label}>
                圃場:
            </label>
            <select
                id="field-select"
                className={styles.select}
                value={fieldID}
                disabled={disabled}
                onChange={(e) => onChange(e.target.value)}
            >
                {FIELD_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                        {opt.label}
                    </option>
                ))}
            </select>
        </div>
    );
};

export default FieldSelector;