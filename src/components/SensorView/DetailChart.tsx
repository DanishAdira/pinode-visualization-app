import React, { useMemo } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, ReferenceLine,
} from 'recharts';
import type { SensorData, MetricKey, MetricConfig } from '../../types/sensor';
import { formatHHmm } from '../../utils/dateTime';
import { yDomainMin, yDomainMax } from '../../utils/chartDomain';
import styles from './SensorView.module.css';

interface Props {
    data: SensorData[];
    metric: MetricConfig;
    metricKey: MetricKey;
    windowStart: Date;
    windowEnd: Date;
    hourlyTicks: number[];
}

const DetailChart: React.FC<Props> = ({
    data, metric, metricKey, windowStart, windowEnd, hourlyTicks,
}) => {
    const chartData = useMemo(
        () => data.map(item => ({
            ts: new Date(item.timestamp).getTime(),
            value: (item as any)[metricKey] as number,
        })),
        [data, metricKey]
    );

    const domain: [number, number] = [windowStart.getTime(), windowEnd.getTime()];

    return (
        <div className={styles.chartBlock}>
            <div className={styles.chartHeader}>
                <span className={styles.chartLabel}>
                    {metric.label} <span className={styles.chartUnit}>({metric.unit})</span>
                </span>
                <span className={styles.chartRange}>
                    {formatHHmm(windowStart.getTime())} 〜 {formatHHmm(windowEnd.getTime())}
                </span>
            </div>
            <div className={styles.detailChart}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid stroke="#eee" vertical={false} />
                        <XAxis
                            dataKey="ts"
                            type="number"
                            domain={domain}
                            ticks={hourlyTicks}
                            tickFormatter={formatHHmm}
                            scale="time"
                            tick={{ fontSize: 11, fill: '#666' }}
                        />
                        <YAxis
                            domain={[yDomainMin, yDomainMax]}
                            tick={{ fontSize: 11, fill: '#666' }}
                            width={45}
                        />
                        <Tooltip
                            labelFormatter={(v) => formatHHmm(v as number)}
                            formatter={(v: number) =>
                                [`${v?.toFixed(metric.precision)} ${metric.unit}`, metric.label]
                            }
                        />
                        <ReferenceLine
                            x={windowEnd.getTime()}
                            stroke="#bbb"
                            strokeDasharray="3 3"
                        />
                        <Line
                            type="monotone"
                            dataKey="value"
                            stroke={metric.color}
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 5 }}
                            isAnimationActive={false}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default DetailChart;