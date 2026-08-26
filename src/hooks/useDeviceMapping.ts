import { useMemo } from 'react';
import type { Device, Plant, Section } from '../types/device';
import { ALL_SECTIONS, parseSectionID } from '../utils/sectionParser';

export interface DeviceMapping {
    sections: Record<string, Section>;
    plantsByKey: Record<string, Plant>; // key = `${sectionID}#${plantID}`
    devicesByID: Record<string, Device>;
}

export function useDeviceMapping(devices: Device[]): DeviceMapping {
    return useMemo(() => {
        const plantsByKey: Record<string, Plant> = {};
        const devicesByID: Record<string, Device> = {};

        for (const d of devices) {
            devicesByID[d.deviceID] = d;
            const key = `${d.sectionID}#${d.plantID}`;
            if (!plantsByKey[key]) {
                plantsByKey[key] = {
                    plantID: d.plantID,
                    plantNumber: d.plantNumber,
                    sectionID: d.sectionID,
                };
            }
            if (d.deviceType === 'melon') plantsByKey[key].melon = d;
            else plantsByKey[key].wilt = d;
        }

        const sections: Record<string, Section> = {};
        for (const sid of ALL_SECTIONS) {
            const coords = parseSectionID(sid);
            if (!coords) continue;
            sections[sid] = { sectionID: sid, ...coords, plants: [] };
        }
        for (const plant of Object.values(plantsByKey)) {
            sections[plant.sectionID]?.plants.push(plant);
        }
        for (const s of Object.values(sections)) {
            s.plants.sort((a, b) => b.plantNumber - a.plantNumber);
        }

        return { sections, plantsByKey, devicesByID };
    }, [devices]);
}