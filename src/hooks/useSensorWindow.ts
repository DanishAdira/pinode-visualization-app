import { useMemo } from 'react';
import type { SensorData } from '../types/sensor';
import { WINDOW_MS, HOUR_MS } from '../constants/sensor';

interface Options {
    data: SensorData[];
    selectedDate: string;   // "YYYY-MM-DD"
    endTimeMinutes: number; // 0..1440
}

export function useSensorWindow({ data, selectedDate, endTimeMinutes }: Options) {
    const dayStart = useMemo(() => new Date(`${selectedDate}T00:00:00`), [selectedDate]);
    const dayEnd   = useMemo(() => {
        const d = new Date(dayStart);
        d.setDate(d.getDate() + 1);
        return d;
    }, [dayStart]);

    const windowEnd = useMemo(() => {
        const d = new Date(dayStart);
        d.setMinutes(endTimeMinutes);
        return d;
    }, [dayStart, endTimeMinutes]);

    const windowStart = useMemo(
        () => new Date(windowEnd.getTime() - WINDOW_MS),
        [windowEnd]
    );

    const windowData = useMemo(() => {
        const s = windowStart.getTime();
        const e = windowEnd.getTime();
        return data.filter(d => {
            const t = new Date(d.timestamp).getTime();
            return t >= s && t <= e;
        });
    }, [data, windowStart, windowEnd]);

    const selectedItem = windowData.length > 0
        ? windowData[windowData.length - 1]
        : null;

    // 1時間刻み tick（詳細）
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

    // 6時間刻み tick（オーバービュー）
    const dayTicks = useMemo(() => {
        const ticks: number[] = [];
        for (let h = 0; h <= 24; h += 6) {
            const t = new Date(dayStart);
            t.setHours(h);
            ticks.push(t.getTime());
        }
        return ticks;
    }, [dayStart]);

    return {
        dayStart, dayEnd,
        windowStart, windowEnd,
        windowData, selectedItem,
        hourlyTicks, dayTicks,
    };
}