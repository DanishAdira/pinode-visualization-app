export type SensorData = {
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

export type MetricKey =
    | 'temperature' | 'humidity'
    | 'u_v_light'   | 'i_v_light'
    | 'stem'        | 'fruit_diagram';

export type MetricConfig = {
    label: string;
    unit: string;
    color: string;
    precision: number;
};