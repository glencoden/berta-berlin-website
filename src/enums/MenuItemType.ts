export const MenuItemType = {
    FILTER: 'filter',
    DASHBOARD: 'dashboard',
} as const;

export type MenuItemType = typeof MenuItemType[keyof typeof MenuItemType];
