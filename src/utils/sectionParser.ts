export const ROWS = [1, 2, 3] as const;
export const COLS_DISPLAY = [3, 2, 1] as const;

export const ALL_SECTIONS: string[] = ROWS.flatMap((r) =>
    COLS_DISPLAY.map((c) => `N${r}E${c}`)
);

export function parseSectionID(
    sectionID: string
): { row: number; col: number } | null {
    const m = sectionID.match(/^N([1-3])E([1-3])$/);
    return m ? { row: Number(m[1]), col: Number(m[2]) } : null;
}