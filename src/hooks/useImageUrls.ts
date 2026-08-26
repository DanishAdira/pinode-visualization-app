import { useEffect, useState } from 'react';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { fetchAuthSession } from 'aws-amplify/auth';

async function generateUrls(keys: string[]): Promise<string[]> {
    const session = await fetchAuthSession();
    if (!session.credentials) return [];
    const s3 = new S3Client({
        region: process.env.REACT_APP_AWS_PROJECT_REGION!,
        credentials: {
            accessKeyId:     session.credentials.accessKeyId,
            secretAccessKey: session.credentials.secretAccessKey,
            sessionToken:    session.credentials.sessionToken,
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
}

export function useImageUrls(imageKeys: string[] | null | undefined, cacheKey: string) {
    const [urls, setUrls]       = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!imageKeys?.length) { setUrls([]); return; }
        let cancelled = false;
        setLoading(true);
        generateUrls(imageKeys)
            .then(us => { if (!cancelled) setUrls(us); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cacheKey]);

    return { urls, loading };
}