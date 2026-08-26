import type { MetricKey, MetricConfig } from '../types/sensor';

// ─── メトリック定義 ───────────────────────
export const METRICS: Record<MetricKey, MetricConfig> = {
    temperature:   { label: '温度',     unit: '°C', color: '#e74c3c', precision: 2 },
    humidity:      { label: '湿度',     unit: '%',  color: '#3498db', precision: 1 },
    u_v_light:     { label: '外部照度', unit: 'lx', color: '#f39c12', precision: 0 },
    i_v_light:     { label: '内部照度', unit: 'lx', color: '#e67e22', precision: 0 },
    stem:          { label: '茎径',     unit: 'V',  color: '#27ae60', precision: 3 },
    fruit_diagram: { label: '果実径',   unit: 'V',  color: '#8e44ad', precision: 3 },
};
export const METRIC_KEYS = Object.keys(METRICS) as MetricKey[];

// ─── ウィンドウ / ページング ─────────────
export const WINDOW_HOURS = 3;
export const WINDOW_MS    = WINDOW_HOURS * 60 * 60 * 1000;
export const HOUR_MS      = 60 * 60 * 1000;
export const DAY_MINUTES  = 24 * 60;
export const MAX_PAGES    = 10;
export const REFRESH_INTERVAL_MS = 30000;