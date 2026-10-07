// src/constants/fields.ts
export interface FieldOption {
    id: string;
    label: string;
}

export const FIELD_STORAGE_KEY = 'pinode-viz:selectedFieldID';

const parseFieldIDsFromEnv = (): string[] => {
    const multi = process.env.REACT_APP_FIELD_IDS;
    if (multi && multi.trim().length > 0) {
        return multi
            .split(',')
            .map((s) => s.trim())
            .filter((s) => s.length > 0);
    }

    const single = process.env.REACT_APP_FIELD_ID;
    if (single && single.trim().length > 0) {
        return [single.trim()];
    }

    return [];
};

export const FIELD_OPTIONS: FieldOption[] = parseFieldIDsFromEnv().map((id) => ({
    id,
    label: id,
}));

export const getInitialFieldID = (): string => {
    const validIDs = FIELD_OPTIONS.map((f) => f.id);

    if (validIDs.length === 0) {
        console.warn(
            '[fields] REACT_APP_FIELD_IDS または REACT_APP_FIELD_ID が未設定です。' +
            '.env.development（ローカル）または Amplify Console の環境変数を確認してください。'
        );
        return '';
    }

    try {
        const stored = localStorage.getItem(FIELD_STORAGE_KEY);
        if (stored && validIDs.includes(stored)) return stored;
    } catch {
        // プライベートブラウジング等で localStorage が使えない場合は無視
    }

    const envDefault = process.env.REACT_APP_FIELD_ID?.trim();
    if (envDefault && validIDs.includes(envDefault)) return envDefault;

    return FIELD_OPTIONS[0].id;
};