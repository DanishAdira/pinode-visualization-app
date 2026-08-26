import React from 'react';
import type { Section } from '../../types/device';
import { ALL_SECTIONS } from '../../utils/sectionParser';
import SectionCell from './SectionCell';
import styles from './DeviceSelector.module.css';

interface Props {
    sections: Record<string, Section>;
    selectedSectionID: string | null;
    onSelect: (sectionID: string) => void;
}

const SectionGrid: React.FC<Props> = ({ sections, selectedSectionID, onSelect }) => (
    <div className={styles.grid}>
        {ALL_SECTIONS.map((sid) => (
            <SectionCell
                key={sid}
                section={sections[sid]}
                isSelected={selectedSectionID === sid}
                onClick={() => onSelect(sid)}
            />
        ))}
    </div>
);

export default SectionGrid;