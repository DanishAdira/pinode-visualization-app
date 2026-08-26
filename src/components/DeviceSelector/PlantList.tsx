import React from 'react';
import type { Plant } from '../../types/device';
import styles from './DeviceSelector.module.css';

interface Props {
    plants: Plant[];
    selectedPlantID: string | null;
    onSelect: (plantID: string) => void;
}

const PlantList: React.FC<Props> = ({ plants, selectedPlantID, onSelect }) => {
    if (plants.length === 0) {
        return <div className={styles.empty}>このセクションには株がありません</div>;
    }
    return (
        <div className={styles.plantList}>
            {plants.map((p) => {
                const active = selectedPlantID === p.plantID;
                const cls = [styles.plantBtn, active && styles.plantBtnActive]
                    .filter(Boolean).join(' ');
                return (
                    <button key={p.plantID} type="button" onClick={() => onSelect(p.plantID)} className={cls}>
                        株#{p.plantNumber}
                        <span className={styles.plantSub}>({p.plantID})</span>
                    </button>
                );
            })}
        </div>
    );
};

export default PlantList;