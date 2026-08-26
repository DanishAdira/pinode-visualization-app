import React, { useEffect, useState } from 'react';
import type { Device, DeviceType } from '../../types/device';
import { useDeviceMapping } from '../../hooks/useDeviceMapping';
import SectionGrid from './SectionGrid';
import PlantList from './PlantList';
import DeviceTypeToggle from './DeviceTypeToggle';
import styles from './DeviceSelector.module.css';

interface Props {
    devices: Device[];
    onDeviceSelected: (device: Device | null) => void;
}

const DeviceSelector: React.FC<Props> = ({ devices, onDeviceSelected }) => {
    const { sections, plantsByKey } = useDeviceMapping(devices);

    const [sectionID, setSectionID] = useState<string | null>(null);
    const [plantID, setPlantID]     = useState<string | null>(null);
    const [type, setType]           = useState<DeviceType>('melon');

    const section = sectionID ? sections[sectionID] : null;
    const plant   = sectionID && plantID ? plantsByKey[`${sectionID}#${plantID}`] : null;

    // 初期化: 最初の株を自動選択
    // useEffect(() => {
    //     if (sectionID || devices.length === 0) return;
    //     const firstSection = Object.values(sections).find(s => s.plants.length > 0);
    //     if (!firstSection) return;
    //     setSectionID(firstSection.sectionID);
    //     setPlantID(firstSection.plants[0].plantID);
    // }, [devices, sections, sectionID]);
    // 初期化: 最初の株を自動選択（plantNumber が最も若い株）
    useEffect(() => {
        if (sectionID || devices.length === 0) return;
        const firstSection = Object.values(sections).find(s => s.plants.length > 0);
        if (!firstSection) return;
        const firstPlant = firstSection.plants.reduce(
            (min, p) => (p.plantNumber < min.plantNumber ? p : min),
            firstSection.plants[0]
        );
        setSectionID(firstSection.sectionID);
        setPlantID(firstPlant.plantID);
    }, [devices, sections, sectionID]);

    // 株が変わったら、利用不可の種別にいたら自動で切替
    useEffect(() => {
        if (!plant) return;
        if (type === 'melon' && !plant.melon && plant.wilt) setType('wilt');
        else if (type === 'wilt' && !plant.wilt && plant.melon) setType('melon');
    }, [plant, type]);

    // 選択結果を親に通知
    useEffect(() => {
        if (!plant) { onDeviceSelected(null); return; }
        const d = type === 'melon' ? plant.melon : plant.wilt;
        onDeviceSelected(d ?? null);
    }, [plant, type, onDeviceSelected]);

    // const handleSectionSelect = (sid: string) => {
    //     setSectionID(sid);
    //     const s = sections[sid];
    //     setPlantID(s?.plants.length ? s.plants[0].plantID : null);
    // };
    const handleSectionSelect = (sid: string) => {
        setSectionID(sid);
        const s = sections[sid];
        if (!s?.plants.length) { setPlantID(null); return; }
        const firstPlant = s.plants.reduce(
            (min, p) => (p.plantNumber < min.plantNumber ? p : min),
            s.plants[0]
        );
        setPlantID(firstPlant.plantID);
    };

    return (
        <div className={styles.container}>
            <div>
                <h4 className={styles.sectionTitle}>セクション</h4>
                <SectionGrid
                    sections={sections}
                    selectedSectionID={sectionID}
                    onSelect={handleSectionSelect}
                />
            </div>

            {section && (
                <div>
                    <h4 className={styles.sectionTitle}>株（{section.sectionID}）</h4>
                    <PlantList
                        plants={section.plants}
                        selectedPlantID={plantID}
                        onSelect={setPlantID}
                    />
                </div>
            )}

            {plant && (
                <div>
                    <h4 className={styles.sectionTitle}>カメラ種別</h4>
                    <DeviceTypeToggle plant={plant} selectedType={type} onChange={setType} />
                </div>
            )}
        </div>
    );
};

export default DeviceSelector;