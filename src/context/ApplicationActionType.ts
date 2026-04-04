export const ApplicationActionType = {
    SET_HAS_LOADED: 'set-has-loaded',
    SET_MENU_OPEN: 'set-menu-open',
    SET_SELECTED_CONFIG: 'set-selected-config',
    SET_CURRENT_TRANSITION: 'set-current-transition',
    SET_VIDEO_STARTED: 'set-video-started',
    CALC_TILE_SIZE: 'set-tile-size',
    CALC_IS_MOBILE: 'set-is-mobile',
    CALC_IS_VIEWPORT_TOO_SMALL: 'set-is-viewport-too-small',
} as const;

export type ApplicationActionType = typeof ApplicationActionType[keyof typeof ApplicationActionType];
