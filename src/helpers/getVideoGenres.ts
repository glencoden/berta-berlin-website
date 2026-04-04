import { validGenres } from '../variables';
import type { Video } from '../types/video';

const GENRES = validGenres.map(genre => genre.toLowerCase());

export const getVideoGenres = (video: Video | null | undefined): string[] => {
    if (!Array.isArray(video?.tags)) return [];
    const tagList = video.tags.map(tag => tag.toLowerCase());
    return tagList.filter(tag => GENRES.includes(tag));
};
