// src/pages/SensorDataPage.tsx
import React, { useState, useMemo, useEffect } from 'react';
import styles from './AnalysisResultsPage.module.css';
import sensorStyles from '../components/SensorView/SensorView.module.css';

import type { Device } from '../types/device';
import type { MetricKey } from '../types/sensor';
import { METRICS, DAY_MINUTES } from '../constants/sensor';
import { FIELD_STORAGE_KEY, getInitialFieldID } from '../constants/fields';
import { toLocalDateStr, nowMinutesOfDay } from '../utils/dateTime';

import { useDevices } from '../hooks/useDevices';
import { useSensorDayData } from '../hooks/useSensorDayData';
import { useSensorWindow } from '../hooks/useSensorWindow';
import { useImageUrls } from '../hooks/useImageUrls';

import DeviceSelector from '../components/DeviceSelector';
import FieldSelector from '../components/FieldSelector/FieldSelector';
import SensorHeader from '../components/SensorView/SensorHeader';
import CameraImagePanel from '../components/SensorView/CameraImagePanel';
import MetricTabs from '../components/SensorView/MetricTabs';
import DetailChart from '../components/SensorView/DetailChart';
import OverviewChart from '../components/SensorView/OverviewChart';
import CsvExportPanel from '../components/SensorView/CsvExportPanel';

const SensorDataPage: React.FC = () => {
    // ── 圃場（fieldID）選択 ──
    const [fieldID, setFieldID] = useState<string>(() => getInitialFieldID());

    // ── デバイス一覧 & 現在選択 ──
    const { devices, loading: devicesLoading, error: devicesError } = useDevices(fieldID);
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
    const handleFieldChange = (nextFieldID: string) => {
        setFieldID(nextFieldID);
        setSelectedDevice(null); // 他圃場のデバイスを引きずらない
        try {
            localStorage.setItem(FIELD_STORAGE_KEY, nextFieldID);
        } catch {
            // localStorage 不可環境は無視
        }
    };

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

            {/* 圃場セレクタ（常時表示） */}
            <div style={{ padding: '0.8rem 0.8rem 0' }}>
                <FieldSelector
                    fieldID={fieldID}
                    onChange={handleFieldChange}
                    disabled={devicesLoading}
                />
            </div>

            {/* デバイス一覧の読み込み表示 */}
            {devicesLoading && (
                <div className={sensorStyles.centerPad}>デバイス一覧を読み込み中...</div>
            )}
            {devicesError && (
                <div className={sensorStyles.errorPad}>
                    <h3>エラー</h3><p>{devicesError}</p>
                </div>
            )}

            {/* DeviceSelector (fieldID 切替で内部状態をリセットするため key を付与) */}
            {!devicesLoading && !devicesError && (
                <div style={{ padding: '0.8rem' }}>
                    <DeviceSelector
                        key={fieldID}
                        devices={devices}
                        onDeviceSelected={setSelectedDevice}
                    />
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