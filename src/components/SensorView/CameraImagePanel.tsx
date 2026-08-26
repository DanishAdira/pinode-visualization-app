import React from 'react';
import { formatHHmm } from '../../utils/dateTime';
import styles from './SensorView.module.css';

interface Props {
    urls: string[];
    loading: boolean;
    timestamp: string | null;
}

const CameraImagePanel: React.FC<Props> = ({ urls, loading, timestamp }) => (
    <section className={styles.section}>
        <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>カメラ画像</h3>
            <span className={styles.sectionMeta}>
                {timestamp ? formatHHmm(new Date(timestamp).getTime()) : '---'}
            </span>
        </div>
        {loading && <p className={styles.mutedText}>読み込み中...</p>}
        {!loading && urls.length === 0 && (
            <p className={styles.mutedText}>この時刻には画像がありません。</p>
        )}
        <div className={styles.imageGrid}>
            {urls.map((url, i) => (
                <img key={i} src={url} alt={`camera ${i + 1}`} className={styles.image} />
            ))}
        </div>
    </section>
);

export default CameraImagePanel;