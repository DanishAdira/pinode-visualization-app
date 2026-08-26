import type { Device, DeviceType } from '../types/device';

export function classifyDeviceType(raw: {
    deviceType?: string | null;
    wiltDeviceId?: string | null;
}): DeviceType {
    if (raw.deviceType === 'melon' || raw.deviceType === 'wilt') {
        return raw.deviceType;
    }
    return raw.wiltDeviceId ? 'melon' : 'wilt';
}

export function normalizeDevice(raw: any): Device {
    return {
        deviceID: raw.deviceID,
        fieldID: raw.fieldID,
        sectionID: raw.sectionID,
        plantID: raw.plantID,
        plantNumber: Number(raw.plantNumber),
        deviceType: classifyDeviceType(raw),
        wiltDeviceId: raw.wiltDeviceId ?? undefined,
    };
}