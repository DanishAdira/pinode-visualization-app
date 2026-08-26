import React from 'react';
import type { DeviceType, Plant } from '../../types/device';
import styles from './DeviceSelector.module.css';

interface Props {
    plant: Plant;
    selectedType: DeviceType;
    onChange: (type: DeviceType) => void;
}

const DeviceTypeToggle: React.FC<Props> = ({ plant, selectedType, onChange }) => {
    const hasMelon = !!plant.melon;
    const hasWilt  = !!plant.wilt;
    const locked   = !(hasMelon && hasWilt); // 片方しか無ければトグル操作不可

    const renderBtn = (type: DeviceType, label: string, deviceID?: string) => {
        const enabled = type === 'melon' ? hasMelon : hasWilt;
        const active  = selectedType === type;
        const cls = [
            styles.toggleBtn,
            active && styles.toggleBtnActive,
            !enabled && styles.toggleBtnDisabled,
            locked && enabled && styles.toggleBtnLocked,
        ].filter(Boolean).join(' ');
        return (
            <button
                type="button"
                onClick={() => enabled && !locked && onChange(type)}
                disabled={!enabled || locked}
                aria-pressed={active}
                className={cls}
            >
                {label}
                {deviceID && <span className={styles.toggleSub}>({deviceID})</span>}
            </button>
        );
    };

    return (
        <div className={styles.toggle}>
            {renderBtn('melon', '🍈 メロン', plant.melon?.deviceID)}
            {renderBtn('wilt',  '🥀 萎れ',   plant.wilt?.deviceID)}
        </div>
    );
};

export default DeviceTypeToggle;