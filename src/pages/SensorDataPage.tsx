// src/pages/SensorDataPage.tsx (最終修正版)

import React, { useState, useEffect } from 'react';
import { generateClient } from 'aws-amplify/api';
import { listSensorData } from '../graphql/queries';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import styles from './AnalysisResultsPage.module.css'; // melon-appからコピーしたCSSを再利用

const client = generateClient();

// センサーデータの型定義
interface SensorData {
    deviceId: string;
    timestamp: string;
    payload: {
        data: {
            temperature: number;
            humidity: number;
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

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                
                // ★ 修正点：client.graphqlの結果を明示的に型付けする
                const result = await client.graphql({ 
                    query: listSensorData,
                }) as ListSensorDataQueryResult;
                
                const data = result.data.listSensorData.items;
                
                // タイムスタンプでソート（昇順）
                data.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

                setSensorData(data);
            } catch (err) {
                setError('データの取得に失敗しました。');
                console.error('Error fetching sensor data:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading) {
        return <div className={styles.pageContainer}><h1>読み込み中...</h1></div>;
    }

    if (error) {
        return <div className={styles.pageContainer}><h1>エラー</h1><p>{error}</p></div>;
    }

    const chartData = sensorData.map(item => ({
        name: new Date(item.timestamp).toLocaleTimeString('ja-JP'),
        temperature: item.payload?.data?.temperature,
        humidity: item.payload?.data?.humidity,
    }));

    return (
        <div className={styles.pageContainer}>
            <h1>センサーデータ可視化</h1>

            <div className={styles.resultGrid}>
                <div className={styles.resultCard}>
                    <h3>最新の温度</h3>
                    <p className={styles.resultCardValue}>{sensorData.length > 0 ? sensorData[sensorData.length - 1].payload.data.temperature.toFixed(2) : '---'} °C</p>
                </div>
                <div className={styles.resultCard}>
                    <h3>最新の湿度</h3>
                    <p className={styles.resultCardValue}>{sensorData.length > 0 ? sensorData[sensorData.length - 1].payload.data.humidity.toFixed(2) : '---'} %</p>
                </div>
            </div>

            <div className={styles.imageSection} style={{ height: 400 }}>
                <h3>温度・湿度変化</h3>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis yAxisId="left" label={{ value: '温度 (°C)', angle: -90, position: 'insideLeft' }} />
                        <YAxis yAxisId="right" orientation="right" label={{ value: '湿度 (%)', angle: -90, position: 'insideRight' }} />
                        <Tooltip />
                        <Legend />
                        <Line yAxisId="left" type="monotone" dataKey="temperature" stroke="#8884d8" activeDot={{ r: 8 }} />
                        <Line yAxisId="right" type="monotone" dataKey="humidity" stroke="#82ca9d" />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default SensorDataPage;