import { useCallback, useEffect, useState } from 'react';
import { generateClient } from 'aws-amplify/api';
import { listDevices } from '../graphql/queries';
import { normalizeDevice } from '../utils/deviceClassifier';
import type { Device } from '../types/device';

const client = generateClient();

type ListDevicesResult = { data?: { listDevices: any[] } };

export function useDevices(fieldID: string) {
    const [devices, setDevices] = useState<Device[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError]     = useState<string | null>(null);

    const fetch = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = (await client.graphql({
                query: listDevices,
                variables: { fieldID },
            })) as ListDevicesResult;
            const raw = res.data?.listDevices ?? [];
            setDevices(raw.map(normalizeDevice));
        } catch (e: any) {
            const msg = e?.errors
                ? e.errors.map((x: any) => x.message).join(', ')
                : e?.message ?? 'デバイス一覧の取得に失敗しました';
            setError(msg);
        } finally {
            setLoading(false);
        }
    }, [fieldID]);

    useEffect(() => { fetch(); }, [fetch]);

    return { devices, loading, error, refetch: fetch };
}