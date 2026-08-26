// src/pages/SensorDataPage.tsx
import React, { useState, useMemo } from 'react';
import styles from './AnalysisResultsPage.module.css';
import sensorStyles from '../components/SensorView/SensorView.module.css';

import type { Device } from '../types/device';
import type { MetricKey } from '../types/sensor';
import { METRICS, DAY_MINUTES } from '../constants/sensor';
import { toLocalDateStr, nowMinutesOfDay } from '../utils/dateTime';

import { useDevices } from '../hooks/useDevices';
import { useSensorDayData } from '../hooks/useSensorDayData';
import { useSensorWindow } from '../hooks/useSensorWindow';
import { useImageUrls } from '../hooks/useImageUrls';

import DeviceSelector from '../components/DeviceSelector';
import SensorHeader from '../components/SensorView/SensorHeader';
import CameraImagePanel from '../components/SensorView/CameraImagePanel';
import MetricTabs from '../components/SensorView/MetricTabs';
import DetailChart from '../components/SensorView/DetailChart';
import OverviewChart from '../components/SensorView/OverviewChart';
import CsvExportPanel from '../components/SensorView/CsvExportPanel';

const FIELD_ID = process.env.REACT_APP_FIELD_ID ?? 'daiwa-field-03';

const SensorDataPage: React.FC = () => {
    // ── デバイス一覧 & 現在選択 ──
    const { devices, loading: devicesLoading, error: devicesError } = useDevices(FIELD_ID);
    const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);

    // ── 日付 & ウィンドウ末尾（分）──
    const todayStr = toLocalDateStr(new Date());
    const [selectedDate, setSelectedDate]     = useState<string>(todayStr);
    const [endTimeMinutes, setEndTimeMinutes] = useState<number>(nowMinutesOfDay());
    const [selectedMetric, setSelectedMetric] = useState<MetricKey>('temperature');

    const isToday = selectedDate === todayStr;

    // ── 日次データ フェッチ ──
    const dayStart = useMemo(() => new Date(`${selectedDate}T00:00:00`), [selectedDate]);
    const dayEnd   = useMemo(() => {
        const d = new Date(dayStart);
        d.setDate(d.getDate() + 1);
        return d;
    }, [dayStart]);

    const { data: sensorData, loading, error } = useSensorDayData({
        deviceID: selectedDevice?.deviceID ?? null,
        dayStart,
        dayEnd,
        autoRefresh: isToday,
    });

    // ── ウィンドウ計算 ──
    const {
        windowStart, windowEnd, windowData, selectedItem,
        hourlyTicks, dayTicks,
    } = useSensorWindow({ data: sensorData, selectedDate, endTimeMinutes });

    // ── 画像URL ──
    const { urls: imageUrls, loading: imageLoading } = useImageUrls(
        selectedItem?.imageKeys ?? null,
        selectedItem?.timestamp ?? ''
    );

    // ── ハンドラ ──
    const handleDateChange = (next: string) => {
        setSelectedDate(next);
        setEndTimeMinutes(next === todayStr ? nowMinutesOfDay() : DAY_MINUTES - 1);
    };

    const handleJumpToNow = () => {
        setSelectedDate(todayStr);
        setEndTimeMinutes(nowMinutesOfDay());
    };

    // ── レンダー ──
    const metric = METRICS[selectedMetric];

    return (
        <div className={styles.pageContainer} style={{ padding: 0 }}>

            {/* デバイス一覧の読み込み表示 */}
            {devicesLoading && (
                <div className={sensorStyles.centerPad}>デバイス一覧を読み込み中...</div>
            )}
            {devicesError && (
                <div className={sensorStyles.errorPad}>
                    <h3>エラー</h3><p>{devicesError}</p>
                </div>
            )}

            {/* DeviceSelector (最上部, 非スティッキー) */}
            {!devicesLoading && !devicesError && (
                <div style={{ padding: '0.8rem' }}>
                    <DeviceSelector devices={devices} onDeviceSelected={setSelectedDevice} />
                </div>
            )}

            {/* センサー表示部 (デバイス選択後のみ) */}
            {selectedDevice && (
                <>
                    <SensorHeader
                        selectedDevice={selectedDevice}
                        selectedDate={selectedDate}
                        todayStr={todayStr}
                        windowEndTs={windowEnd.getTime()}
                        highlightColor={metric.color}
                        onDateChange={handleDateChange}
                        onJumpToNow={handleJumpToNow}
                    />

                    {error ? (
                        <div className={sensorStyles.errorPad}>
                            <h3>エラー</h3><p>{error}</p>
                        </div>
                    ) : loading && sensorData.length === 0 ? (
                        <div className={sensorStyles.centerPad}>読み込み中...</div>
                    ) : (
                        <>
                            <CameraImagePanel
                                urls={imageUrls}
                                loading={imageLoading}
                                timestamp={selectedItem?.timestamp ?? null}
                            />

                            <MetricTabs
                                selected={selectedMetric}
                                onSelect={setSelectedMetric}
                            />

                            <DetailChart
                                data={windowData}
                                metric={metric}
                                metricKey={selectedMetric}
                                windowStart={windowStart}
                                windowEnd={windowEnd}
                                hourlyTicks={hourlyTicks}
                            />

                            <OverviewChart
                                data={sensorData}
                                metric={metric}
                                metricKey={selectedMetric}
                                dayStart={dayStart}
                                dayEnd={dayEnd}
                                windowStart={windowStart}
                                windowEnd={windowEnd}
                                dayTicks={dayTicks}
                                endTimeMinutes={endTimeMinutes}
                                onEndTimeChange={setEndTimeMinutes}
                            />

                            <CsvExportPanel defaultDeviceId={selectedDevice.deviceID} />
                        </>
                    )}
                </>
            )}
        </div>
    );
};

export default SensorDataPage;