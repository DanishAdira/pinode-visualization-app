import React, { useMemo } from 'react';
import {
    LineChart, Line, XAxis, YAxis, ResponsiveContainer, ReferenceArea,
} from 'recharts';
import type { SensorData, MetricKey, MetricConfig } from '../../types/sensor';
import { formatHHmm } from '../../utils/dateTime';
import { yDomainMin, yDomainMax } from '../../utils/chartDomain';
import { DAY_MINUTES } from '../../constants/sensor';
import styles from './SensorView.module.css';

interface Props {
    data: SensorData[];
    metric: MetricConfig;
    metricKey: MetricKey;
    dayStart: Date;
    dayEnd: Date;
    windowStart: Date;
    windowEnd: Date;
    dayTicks: number[];
    endTimeMinutes: number;
    onEndTimeChange: (minutes: number) => void;
}

const OverviewChart: React.FC<Props> = ({
    data, metric, metricKey, dayStart, dayEnd,
    windowStart, windowEnd, dayTicks,
    endTimeMinutes, onEndTimeChange,
}) => {
    const chartData = useMemo(
        () => data.map(item => ({
            ts: new Date(item.timestamp).getTime(),
            value: (item as any)[metricKey] as number,
        })),
        [data, metricKey]
    );

    const domain: [number, number] = [dayStart.getTime(), dayEnd.getTime()];

    return (
        <div className={styles.overviewBlock}>
            <div className={styles.overviewNote}>1日の全体像（帯 = 上のグラフの範囲）</div>
            <div className={styles.overviewChart}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 4, right: 6, left: 0, bottom: 0 }}>
                        <XAxis
                            dataKey="ts"
                            type="number"
                            domain={domain}
                            ticks={dayTicks}
                            tickFormatter={formatHHmm}
                            scale="time"
                            tick={{ fontSize: 10, fill: '#888' }}
                        />
                        <YAxis hide domain={[yDomainMin, yDomainMax]} />
                        <ReferenceArea
                            x1={Math.max(windowStart.getTime(), dayStart.getTime())}
                            x2={Math.min(windowEnd.getTime(),   dayEnd.getTime())}
                            fill={metric.color}
                            fillOpacity={0.18}
                            stroke={metric.color}
                            strokeOpacity={0.5}
                        />
                        <Line
                            type="monotone"
                            dataKey="value"
                            stroke={metric.color}
                            strokeWidth={1.2}
                            dot={false}
                            isAnimationActive={false}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
            <input
                type="range"
                min={0}
                max={DAY_MINUTES}
                step={1}
                value={endTimeMinutes}
                onChange={(e) => onEndTimeChange(parseInt(e.target.value, 10))}
                className={styles.slider}
            />
            <div className={styles.sliderRow}>
                <span>00:00</span><span>12:00</span><span>24:00</span>
            </div>
        </div>
    );
};

export default OverviewChart;