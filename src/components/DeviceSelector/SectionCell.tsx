import React from 'react';
import type { Section } from '../../types/device';
import styles from './DeviceSelector.module.css';

interface Props {
    section: Section;
    isSelected: boolean;
    onClick: () => void;
}

const SectionCell: React.FC<Props> = ({ section, isSelected, onClick }) => {
    const count = section.plants.length;
    const disabled = count === 0;

    const cls = [
        styles.cell,
        isSelected && styles.cellSelected,
        disabled && styles.cellDisabled,
    ].filter(Boolean).join(' ');

    return (
        <button type="button" onClick={onClick} disabled={disabled} className={cls}>
            <span className={styles.cellId}>{section.sectionID}</span>
            <span className={styles.cellCount}>{count > 0 ? `${count}株` : '—'}</span>
        </button>
    );
};

export default SectionCell;