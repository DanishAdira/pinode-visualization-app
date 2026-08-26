export const yDomainMin = (dataMin: number): number => {
    if (dataMin === undefined || dataMin === null || Number.isNaN(dataMin)) return 0;
    const pad = Math.max(Math.abs(dataMin) * 0.05, 0.5);
    return Math.floor((dataMin - pad) * 10) / 10;
};

export const yDomainMax = (dataMax: number): number => {
    if (dataMax === undefined || dataMax === null || Number.isNaN(dataMax)) return 1;
    const pad = Math.max(Math.abs(dataMax) * 0.05, 0.5);
    return Math.ceil((dataMax + pad) * 10) / 10;
};