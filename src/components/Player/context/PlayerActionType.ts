export const PlayerActionType = {
    PLAY: 'play',
    STOP: 'stop',
    ON_PLAY: 'on-play',
    ON_STOP: 'on-stop',
    SET_VIDEO: 'set-video',
    SET_PLAYLIST: 'set-playlist',
    SET_SIZE: 'set-size',
    SET_POSITION: 'set-position',
} as const;

export type PlayerActionType = typeof PlayerActionType[keyof typeof PlayerActionType];
