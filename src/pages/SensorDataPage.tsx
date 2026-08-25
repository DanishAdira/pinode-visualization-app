// src/pages/SensorDataPage.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { generateClient } from 'aws-amplify/api';
import { listSensorDataByDevice } from '../graphql/queries';
import { createCsvExport } from '../graphql/mutations';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, ReferenceLine, ReferenceArea,
} from 'recharts';
import styles from './AnalysisResultsPage.module.css';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { fetchAuthSession } from 'aws-amplify/auth';

const client = generateClient();

type SensorData = {
    deviceID: string;
    timestamp: string;
    imageKeys?: string[] | null;
    fruit_diagram: number;
    humidity: number;
    humidity_hq: number;
    i_v_light: number;
    stem: number;
    temperature: number;
    temperature_hq: number;
    u_v_light: number;
};

type ListSensorDataQueryResult = {
    data?: {
        listSensorDataByDevice: {
            items: (SensorData | null)[];
            nextToken?: string | null;
        };
    };
};

type CreateCsvExportResult = { data: { createCsvExport: string } };

// ─── 定数 ─────────────────────────────────
const WINDOW_HOURS = 3;
const WINDOW_MS    = WINDOW_HOURS * 60 * 60 * 1000;
const HOUR_MS      = 60 * 60 * 1000;
const DAY_MINUTES  = 24 * 60;
const MAX_PAGES    = 10;

// ─── メトリック定義 ───────────────────────
type MetricKey =
    | 'temperature' | 'humidity'
    | 'u_v_light'   | 'i_v_light'
    | 'stem'        | 'fruit_diagram';

const METRICS: Record<MetricKey, {
    label: string; unit: string; color: string; precision: number;
}> = {
    temperature:   { label: '温度',     unit: '°C', color: '#e74c3c', precision: 2 },
    humidity:      { label: '湿度',     unit: '%',  color: '#3498db', precision: 1 },
    u_v_light:     { label: '外部照度', unit: 'lx', color: '#f39c12', precision: 0 },
    i_v_light:     { label: '内部照度', unit: 'lx', color: '#e67e22', precision: 0 },
    stem:          { label: '茎径',     unit: 'V',  color: '#27ae60', precision: 3 },
    fruit_diagram: { label: '果実径',   unit: 'V',  color: '#8e44ad', precision: 3 },
};
const METRIC_KEYS = Object.keys(METRICS) as MetricKey[];

// ─── ユーティリティ ────────────────────────
const toLocalDateStr = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

const formatHHmm = (ts: number) => {
    const d = new Date(ts);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const nowMinutesOfDay = () => {
    const n = new Date();
    return n.getHours() * 60 + n.getMinutes();
};

// Y 軸ドメイン計算（値域に応じたパディング。フラット時にも潰れないように）
const yDomainMin = (dataMin: number) => {
    if (dataMin === undefined || dataMin === null || Number.isNaN(dataMin)) return 0;
    const pad = Math.max(Math.abs(dataMin) * 0.05, 0.5);
    return Math.floor((dataMin - pad) * 10) / 10;
};
const yDomainMax = (dataMax: number) => {
    if (dataMax === undefined || dataMax === null || Number.isNaN(dataMax)) return 1;
    const pad = Math.max(Math.abs(dataMax) * 0.05, 0.5);
    return Math.ceil((dataMax + pad) * 10) / 10;
};

// ─── 本体 ──────────────────────────────────
const SensorDataPage: React.FC = () => {
    // データ
    const [sensorData, setSensorData] = useState<SensorData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // 画像
    const [imageUrls, setImageUrls]     = useState<string[]>([]);
    const [imageLoading, setImageLoading] = useState(false);

    // CSV
    const [exporting, setExporting]         = useState(false);
    const [exportError, setExportError]     = useState<string | null>(null);
    const [exportDeviceId, setExportDeviceId] = useState('PiNode40');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate]     = useState('');

    // デバイス・日付・ウィンドウ・メトリック
    const availableDevices = [
        'PiNode40','PiNode41','PiNode42','PiNode43','PiNode44',
        'pinode45','pinode46','pinode47','pinode48','pinode49',
    ];
    const [selectedDeviceId, setSelectedDeviceId] = useState('PiNode40');
    const [selectedDate, setSelectedDate] = useState<string>(() => toLocalDateStr(new Date()));
    const [endTimeMinutes, setEndTimeMinutes] = useState<number>(() => nowMinutesOfDay());
    const [selectedMetric, setSelectedMetric] = useState<MetricKey>('temperature');

    const todayStr = toLocalDateStr(new Date());
    const isToday  = selectedDate === todayStr;

    // 選択日の範囲
    const dayStart = useMemo(() => new Date(`${selectedDate}T00:00:00`), [selectedDate]);
    const dayEnd   = useMemo(() => {
        const d = new Date(dayStart);
        d.setDate(d.getDate() + 1);
        return d;
    }, [dayStart]);

    // ウィンドウ範囲
    const windowEnd = useMemo(() => {
        const d = new Date(dayStart);
        d.setMinutes(endTimeMinutes);
        return d;
    }, [dayStart, endTimeMinutes]);

    const windowStart = useMemo(
        () => new Date(windowEnd.getTime() - WINDOW_MS),
        [windowEnd]
    );

    // ウィンドウ内データ
    const windowData = useMemo(() => {
        const s = windowStart.getTime();
        const e = windowEnd.getTime();
        return sensorData.filter(d => {
            const t = new Date(d.timestamp).getTime();
            return t >= s && t <= e;
        });
    }, [sensorData, windowStart, windowEnd]);

    // 選択時刻 = ウィンドウ末尾
    const selectedItem = windowData.length > 0
        ? windowData[windowData.length - 1]
        : null;

    // 1 時間刻み tick（詳細）
    const hourlyTicks = useMemo(() => {
        const ticks: number[] = [];
        const first = new Date(windowStart);
        first.setMinutes(0, 0, 0);
        if (first.getTime() < windowStart.getTime()) {
            first.setHours(first.getHours() + 1);
        }
        for (let t = first.getTime(); t <= windowEnd.getTime(); t += HOUR_MS) {
            ticks.push(t);
        }
        return ticks;
    }, [windowStart, windowEnd]);

    // 6 時間刻み tick（オーバービュー）
    const dayTicks = useMemo(() => {
        const ticks: number[] = [];
        for (let h = 0; h <= 24; h += 6) {
            const t = new Date(dayStart);
            t.setHours(h);
            ticks.push(t.getTime());
        }
        return ticks;
    }, [dayStart]);

    // ─── S3 Presigned URL ─────────────────────
    const fetchImageUrls = async (keys: string[]) => {
        const session = await fetchAuthSession();
        if (!session.credentials) return [];
        const s3 = new S3Client({
            region: process.env.REACT_APP_AWS_PROJECT_REGION!,
            credentials: {
                accessKeyId:     session.credentials.accessKeyId,
                secretAccessKey: session.credentials.secretAccessKey,
                sessionToken:    session.credentials.sessionToken,
            },
        });
        const urls = await Promise.all(
            keys.map(async (key) => {
                try {
                    const command = new GetObjectCommand({
                        Bucket: process.env.REACT_APP_S3_BUCKET!,
                        Key: key,
                    });
                    return await getSignedUrl(s3, command, { expiresIn: 3600 });
                } catch {
                    return '';
                }
            })
        );
        return urls.filter(Boolean);
    };

    // ─── データフェッチ（1日ページング）───────
    const fetchDayData = useCallback(async (isRefreshing = false) => {
        if (!isRefreshing) setLoading(true);
        try {
            const all: SensorData[] = [];
            let nextToken: string | null | undefined = null;
            for (let i = 0; i < MAX_PAGES; i++) {
                const result = (await client.graphql({
                    query: listSensorDataByDevice,
                    variables: {
                        deviceID:       selectedDeviceId,
                        startTimestamp: dayStart.toISOString(),
                        endTimestamp:   dayEnd.toISOString(),
                        limit:          500,
                        nextToken,
                    },
                })) as ListSensorDataQueryResult;

                const items = result.data?.listSensorDataByDevice?.items ?? [];
                all.push(...items.filter((x): x is SensorData => x != null));
                nextToken = result.data?.listSensorDataByDevice?.nextToken;
                if (!nextToken) break;
            }
            all.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
            setSensorData(all);
            setError(null);
        } catch (e: any) {
            const msg = e?.errors
                ? e.errors.map((x: any) => x.message).join(', ')
                : '詳細不明なエラーが発生しました。';
            setError(`データの取得に失敗しました: ${msg}`);
        } finally {
            if (!isRefreshing) setLoading(false);
        }
    }, [selectedDeviceId, dayStart, dayEnd]);

    useEffect(() => {
        fetchDayData();
        setExportDeviceId(selectedDeviceId);
        if (!isToday) return;
        const id = setInterval(() => fetchDayData(true), 30000);
        return () => clearInterval(id);
    }, [fetchDayData, selectedDeviceId, isToday]);

    // 選択時刻の画像取得
    useEffect(() => {
        if (!selectedItem?.imageKeys?.length) {
            setImageUrls([]);
            return;
        }
        let cancelled = false;
        setImageLoading(true);
        fetchImageUrls(selectedItem.imageKeys)
            .then((urls) => { if (!cancelled) setImageUrls(urls); })
            .finally(() => { if (!cancelled) setImageLoading(false); });
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedItem?.timestamp]);

    // ─── CSV エクスポート ─────────────────────
    const handleExport = async () => {
        if (!startDate || !endDate || !exportDeviceId) {
            setExportError('デバイスIDと期間の両方を指定してください。');
            return;
        }
        setExporting(true);
        setExportError(null);
        try {
            const startTimestamp = new Date(startDate).toISOString();
            const endTimestamp   = new Date(endDate).toISOString();
            const result = (await client.graphql({
                query: createCsvExport,
                variables: { deviceID: exportDeviceId, startTimestamp, endTimestamp },
            })) as CreateCsvExportResult;
            const url = result.data.createCsvExport;
            if (url) {
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', `export_${exportDeviceId}_${Date.now()}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } else {
                setExportError('エクスポートするデータが見つかりませんでした。');
            }
        } catch {
            setExportError('CSVのエクスポートに失敗しました。');
        } finally {
            setExporting(false);
        }
    };

    const jumpToNow = () => {
        setSelectedDate(todayStr);
        setEndTimeMinutes(nowMinutesOfDay());
    };

    // ─── チャートデータ ────────────────────────
    const metric = METRICS[selectedMetric];

    const detailData = windowData.map(item => ({
        ts: new Date(item.timestamp).getTime(),
        value: (item as any)[selectedMetric] as number,
    }));

    const overviewData = sensorData.map(item => ({
        ts: new Date(item.timestamp).getTime(),
        value: (item as any)[selectedMetric] as number,
    }));

    const detailDomain:   [number, number] = [windowStart.getTime(), windowEnd.getTime()];
    const overviewDomain: [number, number] = [dayStart.getTime(),   dayEnd.getTime()];

    const dateLabel = new Date(`${selectedDate}T00:00:00`).toLocaleDateString('ja-JP', {
        year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
    });

	const nowLocalStr = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16); // "YYYY-MM-DDTHH:mm"

    // ─── レンダー ──────────────────────────────
    return (
        <div className={styles.pageContainer} style={{ padding: 0 }}>

            {/* ── L1: スティッキーヘッダー ── */}
            <header
                style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 100,
                    background: '#fff',
                    borderBottom: '1px solid #e0e0e0',
                    padding: '0.6rem 0.8rem',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                }}
            >
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <select
                        value={selectedDeviceId}
                        onChange={(e) => setSelectedDeviceId(e.target.value)}
                        style={{ padding: '0.3rem 0.4rem', fontSize: '0.85rem' }}
                    >
                        {availableDevices.map(id => (
                            <option key={id} value={id}>{id}</option>
                        ))}
                    </select>
                    <input
                        type="date"
                        value={selectedDate}
                        max={todayStr}
                        onChange={(e) => {
                            const next = e.target.value;
                            setSelectedDate(next);
                            setEndTimeMinutes(
                                next === todayStr ? nowMinutesOfDay() : DAY_MINUTES - 1
                            );
                        }}
                        style={{ padding: '0.3rem 0.4rem', fontSize: '0.85rem' }}
                    />
                    <button
                        onClick={jumpToNow}
                        style={{ padding: '0.3rem 0.7rem', fontSize: '0.8rem' }}
                    >
                        現在
                    </button>
                    <div style={{
                        marginLeft: 'auto',
                        display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
                        lineHeight: 1.2,
                    }}>
                        <span style={{ fontSize: '1.1rem', fontWeight: 700, color: metric.color }}>
                            {formatHHmm(windowEnd.getTime())}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: '#888' }}>
                            {dateLabel}
                        </span>
                    </div>
                </div>
            </header>

            {/* ── エラー時 / 初回ロード時 ── */}
            {error ? (
                <div style={{ padding: '2rem', textAlign: 'center' }}>
                    <h3>エラー</h3><p>{error}</p>
                </div>
            ) : loading && sensorData.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: '#888' }}>
                    読み込み中...
                </div>
            ) : (
                <>
                    {/* ── L2: 選択時刻の画像（最上部）── */}
                    <section style={{ padding: '0.8rem 0.8rem 0.4rem' }}>
                        <div style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                            marginBottom: '0.4rem',
                        }}>
                            <h3 style={{ margin: 0, fontSize: '0.95rem' }}>カメラ画像</h3>
                            <span style={{ fontSize: '0.8rem', color: '#666' }}>
                                {selectedItem
                                    ? formatHHmm(new Date(selectedItem.timestamp).getTime())
                                    : '---'}
                            </span>
                        </div>
                        {imageLoading && <p style={{ color: '#888' }}>読み込み中...</p>}
                        {!imageLoading && imageUrls.length === 0 && (
                            <p style={{ color: '#888', fontSize: '0.85rem' }}>
                                この時刻には画像がありません。
                            </p>
                        )}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                            gap: '0.6rem',
                        }}>
                            {imageUrls.map((url, i) => (
                                <img
                                    key={i}
                                    src={url}
                                    alt={`camera ${i + 1}`}
                                    style={{ width: '100%', borderRadius: 8, display: 'block' }}
                                />
                            ))}
                        </div>
                    </section>

                    {/* ── L3: メトリックタブ ── */}
                    <div style={{
                        display: 'flex', gap: '0.4rem',
                        overflowX: 'auto',
                        padding: '0.5rem 0.8rem',
                        WebkitOverflowScrolling: 'touch',
                    }}>
                        {METRIC_KEYS.map((key) => {
                            const m = METRICS[key];
                            const active = key === selectedMetric;
                            return (
                                <button
                                    key={key}
                                    onClick={() => setSelectedMetric(key)}
                                    style={{
                                        flex: '0 0 auto',
                                        padding: '0.4rem 0.9rem',
                                        borderRadius: 999,
                                        border: `1.5px solid ${active ? m.color : '#ddd'}`,
                                        background: active ? m.color : '#fff',
                                        color: active ? '#fff' : '#333',
                                        fontSize: '0.85rem',
                                        fontWeight: active ? 600 : 400,
                                        cursor: 'pointer',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {m.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* ── L3b: 詳細チャート（3時間ウィンドウ）── */}
                    <div style={{ padding: '0 0.8rem' }}>
                        <div style={{
                            display: 'flex', justifyContent: 'space-between',
                            alignItems: 'baseline', marginBottom: '0.3rem',
                        }}>
                            <span style={{ fontSize: '0.85rem', color: '#666' }}>
                                {metric.label} <span style={{ color: '#aaa' }}>({metric.unit})</span>
                            </span>
                            <span style={{ fontSize: '0.75rem', color: '#888' }}>
                                {formatHHmm(windowStart.getTime())} 〜 {formatHHmm(windowEnd.getTime())}
                            </span>
                        </div>
                        <div style={{ height: 260 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={detailData} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}>
                                    <CartesianGrid stroke="#eee" vertical={false} />
                                    <XAxis
                                        dataKey="ts"
                                        type="number"
                                        domain={detailDomain}
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

                    {/* ── L4: 全日オーバービュー + スライダー ── */}
                    <div style={{ padding: '0.8rem' }}>
                        <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.25rem' }}>
                            1日の全体像（帯 = 上のグラフの範囲）
                        </div>
                        <div style={{
                            height: 90,
                            background: '#fafafa',
                            borderRadius: 6,
                            padding: '0.3rem',
                        }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={overviewData} margin={{ top: 4, right: 6, left: 0, bottom: 0 }}>
                                    <XAxis
                                        dataKey="ts"
                                        type="number"
                                        domain={overviewDomain}
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
                            onChange={(e) => setEndTimeMinutes(parseInt(e.target.value, 10))}
                            style={{ width: '100%', marginTop: '0.3rem' }}
                        />
                        <div style={{
                            display: 'flex', justifyContent: 'space-between',
                            fontSize: '0.7rem', color: '#999',
                        }}>
                            <span>00:00</span><span>12:00</span><span>24:00</span>
                        </div>
                    </div>

                    {/* ── L5: CSV エクスポート（最下部）── */}
                    <div style={{
                        padding: '1rem 0.8rem 2rem',
                        borderTop: '1px solid #eee',
                        marginTop: '0.5rem',
                    }}>
                        <h3 style={{ margin: '0 0 0.6rem', fontSize: '0.9rem', color: '#666' }}>
                            CSVエクスポート
                        </h3>
                        <div style={{
                            display: 'flex', flexDirection: 'column', gap: '0.4rem',
                        }}>
                            <input
                                type="text"
                                value={exportDeviceId}
                                onChange={(e) => setExportDeviceId(e.target.value)}
                                placeholder="デバイスID"
                                style={{ padding: '0.4rem' }}
                            />
                            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                <input
                                    type="datetime-local"
                                    value={startDate}
									max={nowLocalStr}
									step="60"
                                    onChange={(e) => setStartDate(e.target.value)}
                                    style={{ padding: '0.4rem', flex: 1 }}
                                />
                                <span>〜</span>
                                <input
                                    type="datetime-local"
                                    value={endDate}
									max={nowLocalStr}
									step="60"
                                    onChange={(e) => setEndDate(e.target.value)}
                                    style={{ padding: '0.4rem', flex: 1 }}
                                />
                            </div>
                            <button
                                onClick={handleExport}
                                disabled={exporting}
                                style={{ padding: '0.5rem', fontSize: '0.9rem' }}
                            >
                                {exporting ? 'エクスポート中...' : 'CSVダウンロード'}
                            </button>
                        </div>
                        {exportError && (
                            <p style={{ color: 'red', marginTop: '0.4rem', fontSize: '0.85rem' }}>
                                {exportError}
                            </p>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default SensorDataPage;