export const FilterType = {
    POPULAR: 'popular',
    TRENDING: 'trending',
    RECENT: 'recent',
} as const;

export type FilterType = typeof FilterType[keyof typeof FilterType];
