import type { Thumbnails, Thumbnail } from '../../../types/video';

const decreasingSizeOrderKeys: (keyof Thumbnails)[] = ['maxres', 'standard', 'high', 'medium', 'default'];

export const getMaxThumbnail = (thumbnails: Thumbnails | undefined): Thumbnail | null => {
    if (!thumbnails) return null;
    for (const key of decreasingSizeOrderKeys) {
        const result = thumbnails[key];
        if (result) return result;
    }
    return null;
};
