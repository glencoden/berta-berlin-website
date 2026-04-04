export const UrlState = {
    FILTER: 'filter',
    PLAYLIST: 'playlist',
} as const;

export type UrlState = typeof UrlState[keyof typeof UrlState];
