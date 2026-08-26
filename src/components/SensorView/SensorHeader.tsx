import React from 'react';
import type { Device } from '../../types/device';
import { formatHHmm, formatDateLabel } from '../../utils/dateTime';
import styles from './SensorView.module.css';

interface Props {
    selectedDevice: Device | null;
    selectedDate: string;
    todayStr: string;
    windowEndTs: number;
    highlightColor: string;
    onDateChange: (dateStr: string) => void;
    onJumpToNow: () => void;
}

const SensorHeader: React.FC<Props> = ({
    selectedDevice, selectedDate, todayStr, windowEndTs,
    highlightColor, onDateChange, onJumpToNow,
}) => {
    const typeLabel = selectedDevice
        ? (selectedDevice.deviceType === 'melon' ? '🍈' : '🥀')
        : '';

    return (
        <header className={styles.header}>
            <div className={styles.headerRow}>
                <input
                    type="date"
                    value={selectedDate}
                    max={todayStr}
                    onChange={(e) => onDateChange(e.target.value)}
                    className={styles.smallInput}
                />
                <button onClick={onJumpToNow} className={styles.smallBtn}>現在</button>

                {selectedDevice && (
                    <span className={styles.headerDeviceTag}>
                        {typeLabel} {selectedDevice.deviceID} / {selectedDevice.sectionID} / 株#{selectedDevice.plantNumber}
                    </span>
                )}

                <div className={styles.headerRight}>
                    <span className={styles.headerTime} style={{ color: highlightColor }}>
                        {formatHHmm(windowEndTs)}
                    </span>
                    <span className={styles.headerDate}>
                        {formatDateLabel(selectedDate)}
                    </span>
                </div>
            </div>
        </header>
    );
};

export default SensorHeader;