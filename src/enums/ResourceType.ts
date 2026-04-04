export const ResourceType = {
    VIDEO: 'video',
    PLAYLIST: 'playlist',
    EXTERNAL_VIDEO: 'external-video',
} as const;

export type ResourceType = typeof ResourceType[keyof typeof ResourceType];
