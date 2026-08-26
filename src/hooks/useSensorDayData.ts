import { useCallback, useEffect, useState } from 'react';
import { generateClient } from 'aws-amplify/api';
import { listSensorDataByDevice } from '../graphql/queries';
import { MAX_PAGES, REFRESH_INTERVAL_MS } from '../constants/sensor';
import type { SensorData } from '../types/sensor';

const client = generateClient();

type QueryResult = {
    data?: {
        listSensorDataByDevice: {
            items: (SensorData | null)[];
            nextToken?: string | null;
        };
    };
};

interface Options {
    deviceID: string | null;
    dayStart: Date;
    dayEnd: Date;
    autoRefresh?: boolean;
}

export function useSensorDayData({ deviceID, dayStart, dayEnd, autoRefresh }: Options) {
    const [data, setData]       = useState<SensorData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError]     = useState<string | null>(null);

    const fetch = useCallback(async (isRefreshing = false) => {
        if (!deviceID) { setData([]); setLoading(false); return; }
        if (!isRefreshing) setLoading(true);
        try {
            const all: SensorData[] = [];
            let nextToken: string | null | undefined = null;
            for (let i = 0; i < MAX_PAGES; i++) {
                const res = (await client.graphql({
                    query: listSensorDataByDevice,
                    variables: {
                        deviceID,
                        startTimestamp: dayStart.toISOString(),
                        endTimestamp:   dayEnd.toISOString(),
                        limit:          500,
                        nextToken,
                    },
                })) as QueryResult;

                const items = res.data?.listSensorDataByDevice?.items ?? [];
                all.push(...items.filter((x): x is SensorData => x != null));
                nextToken = res.data?.listSensorDataByDevice?.nextToken;
                if (!nextToken) break;
            }
            all.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
            setData(all);
            setError(null);
        } catch (e: any) {
            const msg = e?.errors
                ? e.errors.map((x: any) => x.message).join(', ')
                : '詳細不明なエラーが発生しました。';
            setError(`データの取得に失敗しました: ${msg}`);
        } finally {
            if (!isRefreshing) setLoading(false);
        }
    }, [deviceID, dayStart, dayEnd]);

    useEffect(() => {
        fetch();
        if (!autoRefresh) return;
        const id = setInterval(() => fetch(true), REFRESH_INTERVAL_MS);
        return () => clearInterval(id);
    }, [fetch, autoRefresh]);

    return { data, loading, error, refetch: () => fetch(true) };
}