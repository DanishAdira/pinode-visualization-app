import React from 'react';
import type { MetricKey } from '../../types/sensor';
import { METRICS, METRIC_KEYS } from '../../constants/sensor';
import styles from './SensorView.module.css';

interface Props {
    selected: MetricKey;
    onSelect: (key: MetricKey) => void;
}

const MetricTabs: React.FC<Props> = ({ selected, onSelect }) => (
    <div className={styles.metricTabs}>
        {METRIC_KEYS.map((key) => {
            const m = METRICS[key];
            const active = key === selected;
            return (
                <button
                    key={key}
                    onClick={() => onSelect(key)}
                    className={styles.metricTab}
                    style={{
                        borderColor: active ? m.color : '#ddd',
                        background:  active ? m.color : '#fff',
                        color:       active ? '#fff'   : '#333',
                        fontWeight:  active ? 600      : 400,
                    }}
                >
                    {m.label}
                </button>
            );
        })}
    </div>
);

export default MetricTabs;