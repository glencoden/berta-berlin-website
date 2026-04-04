export const TransitionType = {
    NONE: 'none',
    SLIDE_OUT: 'slide-out',
    SLIDE_IN: 'slide-in',
    INSERT: 'insert',
} as const;

export type TransitionType = typeof TransitionType[keyof typeof TransitionType];
