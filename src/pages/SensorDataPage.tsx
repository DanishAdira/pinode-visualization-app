// src/pages/SensorDataPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { generateClient } from 'aws-amplify/api';
import { listSensorData } from '../graphql/queries';
import { createCsvExport } from '../graphql/mutations';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
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
	data?: { listSensorData: { items: (SensorData | null)[] } };
};

type CreateCsvExportResult = {
	data: { createCsvExport: string };
};

const SensorDataPage: React.FC = () => {
	const [sensorData, setSensorData] = useState<SensorData[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const [imageUrls, setImageUrls] = useState<string[]>([]);
	const [imageLoading, setImageLoading] = useState(false);

	const [exporting, setExporting] = useState(false);
	const [exportError, setExportError] = useState<string | null>(null);
	const [exportDeviceId, setExportDeviceId] = useState('22-27');
	const [selectedDeviceId, setSelectedDeviceId] = useState('22-27');
	const availableDevices = ['22-27','22-30'];
	const [startDate, setStartDate] = useState('');
	const [endDate, setEndDate] = useState('');

	// Presigned URL を生成
	const fetchImageUrls = async (keys: string[]) => {
		const session = await fetchAuthSession();
		if (!session.credentials) return [];

		const s3 = new S3Client({
			region: process.env.REACT_APP_AWS_PROJECT_REGION!,
			credentials: {
				accessKeyId: session.credentials.accessKeyId,
				secretAccessKey: session.credentials.secretAccessKey,
				sessionToken: session.credentials.sessionToken,
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

	const fetchData = useCallback(async (isRefreshing = false) => {
		if (!isRefreshing) setLoading(true);
		try {
			const result = (await client.graphql({ 
				query: listSensorData,
				variables: { deviceID: selectedDeviceId }				
			 })) as ListSensorDataQueryResult;
			const items = result.data?.listSensorData?.items ?? [];
			const valid = items.filter((x): x is SensorData => x != null);
			valid.sort((a, b) => parseInt(a.timestamp, 10) - parseInt(b.timestamp, 10));
			setSensorData(valid);

			const latest = valid.at(-1);
			if (latest?.imageKeys?.length) {
				setImageLoading(true);
				const urls = await fetchImageUrls(latest.imageKeys);
				setImageUrls(urls);
			} else {
				setImageUrls([]);
			}
			setError(null);
		} catch (e: any) {
			const msg = e?.errors ? e.errors.map((x: any) => x.message).join(', ') : '詳細不明なエラーが発生しました。';
			setError(`データの取得に失敗しました: ${msg}`);
		} finally {
			setImageLoading(false);
			if (!isRefreshing) setLoading(false);
		}
	}, [selectedDeviceId]);

	// useEffect(() => {
	// 	fetchData();
	// 	const id = setInterval(() => fetchData(true), 30000);
	// 	return () => clearInterval(id);
	// }, [fetchData]);
	// useEffect(() => {
	// 	setExportDeviceId(selectedDeviceId);
	// }, [selectedDeviceId]);	

	useEffect(() => {
        // 1. データをフェッチする
        fetchData();

        // 2. CSVエクスポートのIDを選択中のIDと同期する
        setExportDeviceId(selectedDeviceId);

        // 3. 30秒ごとの自動更新タイマーをセットする
        const id = setInterval(() => fetchData(true), 30000);

        // 4. コンポーネントがアンマウントされる時にタイマーを解除する
        return () => clearInterval(id);

    }, [fetchData, selectedDeviceId]);

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

	const handleRefreshClick = () => {
		fetchData(true);
		window.scrollTo({ top: 0, behavior: 'smooth' });
	};

	if (loading) return <div className={styles.pageContainer}><h1>読み込み中...</h1></div>;
	if (error) return <div className={styles.pageContainer}><h1>エラー</h1><p>{error}</p></div>;

	const tempHumidityChartData = sensorData.map((item) => ({
		name: new Date(parseInt(item.timestamp, 10) * 1000).toLocaleTimeString('ja-JP'),
		temperature: item.temperature,
		humidity: item.humidity,
	}));
	const lightChartData = sensorData.map((item) => ({
		name: new Date(parseInt(item.timestamp, 10) * 1000).toLocaleTimeString('ja-JP'),
		u_v_light: item.u_v_light,
		i_v_light: item.i_v_light,
	}));
	const latest = sensorData.at(-1);

	return (
		<div className={styles.pageContainer}>
			<h1>センサーデータ可視化</h1>

			{/* <div style={{ marginBottom: '1rem', textAlign: 'center' }}>
    	        <strong>表示デバイス: </strong>
        	    <select value={selectedDeviceId} onChange={(e) => setSelectedDeviceId(e.target.value)} style={{ padding: '8px', fontSize: '1rem' }}>
            	    {availableDevices.map(id => (
                	    <option key={id} value={id}>{id}</option>
                	))}
        	    </select>
        	</div> */}

			<div className={styles.selectorContainer}>
				<label htmlFor="device-select" className={styles.selectorLabel}>
					表示デバイス:
				</label>
				<select id="device-select" value={selectedDeviceId} onChange={(e) => setSelectedDeviceId(e.target.value)} className={styles.deviceSelector} >
					{availableDevices.map(id => (
					<option key={id} value={id}>{id}</option>
					))}
				</select>
			</div>

			<div className={styles.resultGrid}>
				<div className={styles.resultCard}><h3>現在の温度</h3><p className={styles.resultCardValue}>{latest?.temperature?.toFixed(2) ?? '---'} °C</p></div>
				<div className={styles.resultCard}><h3>現在の湿度</h3><p className={styles.resultCardValue}>{latest?.humidity?.toFixed(2) ?? '---'} %</p></div>
				<div className={styles.resultCard}><h3>現在の外部照度</h3><p className={styles.resultCardValue}>{latest?.u_v_light ?? '---'} lx</p></div>
				<div className={styles.resultCard}><h3>現在の内部照度</h3><p className={styles.resultCardValue}>{latest?.i_v_light ?? '---'} lx</p></div>
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
						<YAxis label={{ value: '照度 (lx)', angle: -90, position: 'insideLeft' }} />
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
					<input type="text" value={exportDeviceId} onChange={(e) => setExportDeviceId(e.target.value)} placeholder="デバイスID" />
					<input type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
					<span>〜</span>
					<input type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
					<button className="button-secondary" onClick={handleExport} disabled={exporting}>
						{exporting ? 'エクスポート中...' : 'CSVダウンロード'}
					</button>
				</div>
				{exportError && <p style={{ color: 'red', marginTop: '0.5rem' }}>{exportError}</p>}
			</div>

			<div className={styles.imageSection} style={{ marginBottom: '2rem' }}>
				<h3>現在のSPRESENSEカメラ画像</h3>
				{imageLoading && <p>画像を読み込んでいます...</p>}
				{!imageLoading && imageUrls.length === 0 && <p>表示できる画像がありません。</p>}
				<div className={styles.imageGrid}>
					{imageUrls.map((url, i) => (
						<div key={i} className={styles.imageContainer}>
							<img src={url} alt={`Sensor image ${i + 1}`} style={{ width: '100%', borderRadius: 8 }} />
						</div>
					))}
				</div>
			</div>

			<div className={styles.actionsContainer}>
				<button className="button-primary" onClick={handleRefreshClick}>最新の情報を取得</button>
			</div>
		</div>
	);
};

export default SensorDataPage;
