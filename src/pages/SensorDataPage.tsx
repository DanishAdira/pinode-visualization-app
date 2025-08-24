// src/pages/SensorDataPage.tsx (時間指定対応版)
import React, { useState, useEffect, useCallback } from 'react';
import { generateClient } from 'aws-amplify/api';
import { getUrl } from 'aws-amplify/storage';
import { listSensorData } from '../graphql/queries';
import { createCsvExport } from '../graphql/mutations';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import styles from './AnalysisResultsPage.module.css';

const client = generateClient();

interface SensorData {
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
}

type ListSensorDataQueryResult = {
    data?: {
        listSensorData: {
            items: (SensorData | null)[];
        };
    };
    errors?: any[];
};

type CreateCsvExportResult = {
    data: {
        createCsvExport: string;
    };
};

const SensorDataPage = () => {
    const [sensorData, setSensorData] = useState<SensorData[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const [imageUrls, setImageUrls] = useState<string[]>([]);
    const [imageLoading, setImageLoading] = useState<boolean>(false);

    const [exporting, setExporting] = useState<boolean>(false);
    const [exportError, setExportError] = useState<string | null>(null);
    const [exportDeviceId, setExportDeviceId] = useState<string>('00');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');

    const fetchData = useCallback(async (isRefreshing = false) => {
        if (!isRefreshing) setLoading(true);
        try {
            const result = await client.graphql({
                query: listSensorData,
            }) as ListSensorDataQueryResult;

            const items = result.data?.listSensorData?.items || [];
            const validItems = items.filter((item): item is SensorData => item !== null);
            
            validItems.sort((a, b) => parseInt(a.timestamp, 10) - parseInt(b.timestamp, 10));

            setSensorData(validItems);

            // ★ 追加: 最新データの画像キーを取得してURLを生成
            const latestItem = validItems.length > 0 ? validItems[validItems.length - 1] : null;
            if (latestItem && latestItem.imageKeys && latestItem.imageKeys.length > 0) {
                setImageLoading(true);
                const urls = await Promise.all(
                    latestItem.imageKeys.map(async (key) => {
                        try {
                            const getUrlResult = await getUrl({ key });
                            return getUrlResult.url.toString();
                        } catch (e) {
                            console.error('Error getting image URL', e);
                            return ''; // エラー時は空文字
                        }
                    })
                );
                setImageUrls(urls.filter(url => url)); // 空文字を除外
                setImageLoading(false);
            } else {
                setImageUrls([]); // 画像キーがない場合はクリア
            }

            setError(null);
        } catch (err: any) {
            const errorMessage = err.errors ? err.errors.map((e: any) => e.message).join(', ') : '詳細不明なエラーが発生しました。';
            setError(`データの取得に失敗しました: ${errorMessage}`);
            console.error('Error fetching sensor data:', err);
        } finally {
            if (!isRefreshing) setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        const intervalId = setInterval(() => fetchData(true), 30000);
        return () => clearInterval(intervalId);
    }, [fetchData]);

    const handleExport = async () => {
        if (!startDate || !endDate || !exportDeviceId) {
            setExportError('デバイスIDと期間の両方を指定してください。');
            return;
        }
        setExporting(true);
        setExportError(null);
        try {
            const startTimestamp = new Date(startDate).getTime().toString();
            const endTimestamp = new Date(endDate).getTime().toString();

            const result = await client.graphql({
                query: createCsvExport,
                variables: {
                    deviceID: exportDeviceId,
                    startTimestamp,
                    endTimestamp,
                }
            }) as CreateCsvExportResult;

            const presignedUrl = result.data.createCsvExport;
            if (presignedUrl) {
                const link = document.createElement('a');
                link.href = presignedUrl;
                link.setAttribute('download', `export_${exportDeviceId}_${Date.now()}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } else {
                setExportError('エクスポートするデータが見つかりませんでした。');
            }
        } catch (err) {
            console.error('Error exporting CSV:', err);
            setExportError('CSVのエクスポートに失敗しました。');
        } finally {
            setExporting(false);
        }
    };
    
    const returnTop = () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handleRefreshClick = () => {
        fetchData(true);
        returnTop();
    };

    if (loading) return <div className={styles.pageContainer}><h1>読み込み中...</h1></div>;
    if (error) return <div className={styles.pageContainer}><h1>エラー</h1><p>{error}</p></div>;
    
    const tempHumidityChartData = sensorData.map(item => ({
        name: new Date(parseInt(item.timestamp, 10) * 1000).toLocaleTimeString('ja-JP'),
        temperature: item.temperature,
        humidity: item.humidity,
    }));

    const lightChartData = sensorData.map(item => ({
        name: new Date(parseInt(item.timestamp, 10) * 1000).toLocaleTimeString('ja-JP'),
        u_v_light: item.u_v_light,
        i_v_light: item.i_v_light,
    }));
    
    const latestData = sensorData.length > 0 ? sensorData[sensorData.length - 1] : null;

    return (
        <div className={styles.pageContainer}>
            <h1>センサーデータ可視化</h1>

            <div className={styles.resultGrid}>
                <div className={styles.resultCard}>
                    <h3>最新の温度</h3>
                    <p className={styles.resultCardValue}>
                        {latestData ? latestData.temperature.toFixed(2) : '---'} °C
                    </p>
                </div>
                <div className={styles.resultCard}>
                    <h3>最新の湿度</h3>
                    <p className={styles.resultCardValue}>
                        {latestData ? latestData.humidity.toFixed(2) : '---'} %
                    </p>
                </div>
                <div className={styles.resultCard}>
                    <h3>最新の外部照度</h3>
                    <p className={styles.resultCardValue}>
                        {latestData ? latestData.u_v_light : '---'} lx
                    </p>
                </div>
                <div className={styles.resultCard}>
                    <h3>最新の内部照度</h3>
                    <p className={styles.resultCardValue}>
                        {latestData ? latestData.i_v_light : '---'} lx
                    </p>
                </div>
            </div>

            <div className={styles.imageSection} style={{ height: 400, marginBottom: '2rem' }}>
                <h3>温度・湿度変化</h3>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={tempHumidityChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis yAxisId="left" label={{ value: '温度 (°C)', angle: -90, position: 'insideLeft' }} />
                        <YAxis yAxisId="right" orientation="right" label={{ value: '湿度 (%)', angle: -90, position: 'insideRight' }} />
                        <Tooltip />
                        <Legend />
                        <Line yAxisId="left" type="monotone" dataKey="temperature" stroke="#8884d8" name="温度" activeDot={{ r: 8 }} />
                        <Line yAxisId="right" type="monotone" dataKey="humidity" stroke="#82ca9d" name="湿度" />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            <div className={styles.imageSection} style={{ height: 400 }}>
                <h3>照度変化</h3>
                 <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={lightChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis label={{ value: '照度 (lx)', angle: -90, position: 'insideLeft' }}/>
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="u_v_light" stroke="#ffc658" name="外部照度" activeDot={{ r: 8 }} />
                        <Line type="monotone" dataKey="i_v_light" stroke="#ff7300" name="内部照度" />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            <div className={styles.imageSection} style={{ marginBottom: '2rem' }}>
                <h3>CSVエクスポート</h3>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
                    <input 
                        type="text" 
                        value={exportDeviceId} 
                        onChange={(e) => setExportDeviceId(e.target.value)}
                        placeholder="デバイスID"
                    />
                    {/* ★ 変更点: typeを"date"から"datetime-local"へ */}
                    <input 
                        type="datetime-local" 
                        value={startDate} 
                        onChange={(e) => setStartDate(e.target.value)} 
                    />
                    <span>〜</span>
                    {/* ★ 変更点: typeを"date"から"datetime-local"へ */}
                    <input 
                        type="datetime-local" 
                        value={endDate} 
                        onChange={(e) => setEndDate(e.target.value)} 
                    />
                    <button className="button-secondary" onClick={handleExport} disabled={exporting}>
                        {exporting ? 'エクスポート中...' : 'CSVダウンロード'}
                    </button>
                </div>
                <div className={styles.imageSection} style={{ marginBottom: '2rem' }}>
                    <h3>最新の撮影画像</h3>
                    {imageLoading && <p>画像を読み込んでいます...</p>}
                    {!imageLoading && imageUrls.length === 0 && <p>表示できる画像がありません。</p>}
                    <div className={styles.imageGrid}>
                        {imageUrls.map((url, index) => (
                            <div key={index} className={styles.imageContainer}>
                                <img src={url} alt={`Sensor image ${index + 1}`} style={{ width: '100%', borderRadius: '8px' }} />
                            </div>
                        ))}
                    </div>
                </div>

                {exportError && <p style={{ color: 'red', marginTop: '0.5rem' }}>{exportError}</p>}
            </div>

            <div className={styles.actionsContainer}>
                <button className="button-primary" onClick={handleRefreshClick}>
                    最新の情報を取得
                </button>
            </div>
        </div>
    );
};

export default SensorDataPage;