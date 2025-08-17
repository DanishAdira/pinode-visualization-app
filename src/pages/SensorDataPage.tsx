// src/pages/SensorDataPage.tsx (ボタンのスタイルと位置を修正)
import React, { useState, useEffect, useCallback } from 'react';
import { generateClient } from 'aws-amplify/api';
import { listSensorData } from '../graphql/queries';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import styles from './AnalysisResultsPage.module.css';

const client = generateClient();

// センサーデータの型定義
interface SensorData {
    deviceID: string;
    timestamp: string;
    payload: {
        data: {
            fruit_diagram: number;
            humidity: number;
            humidity_hq: number;
            i_v_light: number;
            stem: number;
            temperature: number;
            temperature_hq: number;
            u_v_light: number;
        };
    };
}

// GraphQLのクエリ結果の型を定義
type ListSensorDataQueryResult = {
    data: {
        listSensorData: {
            items: SensorData[];
        };
    };
};

const SensorDataPage = () => {
    const [sensorData, setSensorData] = useState<SensorData[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async (isRefreshing = false) => {
        if (!isRefreshing) {
            setLoading(true);
        }
        try {
            const result = await client.graphql({
                query: listSensorData,
            }) as ListSensorDataQueryResult;

            const items = result.data?.listSensorData?.items || [];
            const validItems = items.filter((item): item is SensorData => item !== null);

            validItems.sort((a, b) => parseInt(a.timestamp, 10) - parseInt(b.timestamp, 10));

            setSensorData(validItems);
            setError(null);
        } catch (err: any) {
            const errorMessage = err.errors ? err.errors.map((e: any) => e.message).join(', ') : '詳細不明なエラーが発生しました。';
            setError(`データの取得に失敗しました: ${errorMessage}`);
            console.error('Error fetching sensor data:', err);
        } finally {
            if (!isRefreshing) {
                setLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        fetchData();

        const intervalId = setInterval(() => {
            fetchData(true);
        }, 30000);

        return () => clearInterval(intervalId);
    }, [fetchData]);

    const returnTop = () => {
        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    };

    const handleRefreshClick = () => {
        fetchData(true);
        returnTop();
    }

    if (loading) {
        return <div className={styles.pageContainer}><h1>読み込み中...</h1></div>;
    }

    if (error) {
        return <div className={styles.pageContainer}><h1>エラー</h1><p>{error}</p></div>;
    }

    const tempHumidityChartData = sensorData.map(item => ({
        name: new Date(parseInt(item.timestamp, 10)).toLocaleTimeString('ja-JP'),
        temperature: item.payload?.data?.temperature,
        humidity: item.payload?.data?.humidity,
    }));

    const lightChartData = sensorData.map(item => ({
        name: new Date(parseInt(item.timestamp, 10)).toLocaleTimeString('ja-JP'),
        u_v_light: item.payload?.data?.u_v_light,
        i_v_light: item.payload?.data?.i_v_light,
    }));
    
    const latestData = sensorData.length > 0 ? sensorData[sensorData.length - 1].payload.data : null;

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

                        {/* ★ 変更点: ボタンのコンテナを追加し、位置を変更 */}
            <div className={styles.actionsContainer}>
                <button className="button-primary" onClick={handleRefreshClick}>
                    最新の情報を取得
                </button>
            </div>

        </div>
    );
};

export default SensorDataPage;
