export type PageLayoutTheme = 'light' | 'dark';
export type ThemeStorage = Pick<Storage, 'getItem' | 'setItem'>;
export declare function getThemeStorage(): ThemeStorage | null;
export declare function readPageLayoutTheme(storageKey: string, storage?: ThemeStorage | null): PageLayoutTheme;
export declare function savePageLayoutTheme(storageKey: string, theme: PageLayoutTheme, storage?: ThemeStorage | null): boolean;
