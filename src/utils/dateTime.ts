export const toLocalDateStr = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

export const formatHHmm = (ts: number): string => {
    const d = new Date(ts);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export const nowMinutesOfDay = (): number => {
    const n = new Date();
    return n.getHours() * 60 + n.getMinutes();
};

export const nowLocalDatetimeStr = (): string =>
    new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);

export const formatDateLabel = (dateStr: string): string =>
    new Date(`${dateStr}T00:00:00`).toLocaleDateString('ja-JP', {
        year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
    });