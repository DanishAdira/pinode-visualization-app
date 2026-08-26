import React, { useState, useEffect } from 'react';
import { generateClient } from 'aws-amplify/api';
import { createCsvExport } from '../../graphql/mutations';
import { nowLocalDatetimeStr } from '../../utils/dateTime';
import styles from './SensorView.module.css';

const client = generateClient();

type CreateCsvExportResult = { data: { createCsvExport: string } };

interface Props {
    defaultDeviceId: string;
}

const CsvExportPanel: React.FC<Props> = ({ defaultDeviceId }) => {
    const [deviceId, setDeviceId] = useState(defaultDeviceId);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate]     = useState('');
    const [exporting, setExporting] = useState(false);
    const [error, setError]         = useState<string | null>(null);

    // 選択デバイスが変わったら自動で追随
    useEffect(() => { setDeviceId(defaultDeviceId); }, [defaultDeviceId]);

    const maxLocal = nowLocalDatetimeStr();

    const handleExport = async () => {
        if (!startDate || !endDate || !deviceId) {
            setError('デバイスIDと期間の両方を指定してください。');
            return;
        }
        setExporting(true);
        setError(null);
        try {
            const startTimestamp = new Date(startDate).toISOString();
            const endTimestamp   = new Date(endDate).toISOString();
            const result = (await client.graphql({
                query: createCsvExport,
                variables: { deviceID: deviceId, startTimestamp, endTimestamp },
            })) as CreateCsvExportResult;
            const url = result.data.createCsvExport;
            if (url) {
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', `export_${deviceId}_${Date.now()}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } else {
                setError('エクスポートするデータが見つかりませんでした。');
            }
        } catch {
            setError('CSVのエクスポートに失敗しました。');
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className={styles.csvBlock}>
            <h3 className={styles.csvTitle}>CSVエクスポート</h3>
            <div className={styles.csvForm}>
                <input
                    type="text"
                    value={deviceId}
                    onChange={(e) => setDeviceId(e.target.value)}
                    placeholder="デバイスID"
                    className={styles.csvInput}
                />
                <div className={styles.csvRow}>
                    <input
                        type="datetime-local"
                        value={startDate}
                        max={maxLocal}
                        step="60"
                        onChange={(e) => setStartDate(e.target.value)}
                        className={styles.csvInput}
                    />
                    <span>〜</span>
                    <input
                        type="datetime-local"
                        value={endDate}
                        max={maxLocal}
                        step="60"
                        onChange={(e) => setEndDate(e.target.value)}
                        className={styles.csvInput}
                    />
                </div>
                <button onClick={handleExport} disabled={exporting} className={styles.csvBtn}>
                    {exporting ? 'エクスポート中...' : 'CSVダウンロード'}
                </button>
            </div>
            {error && <p className={styles.csvError}>{error}</p>}
        </div>
    );
};

export default CsvExportPanel;