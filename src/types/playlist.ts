import type { Thumbnails } from './video';

export interface Playlist {
    id: string;
    title: string;
    description: string;
    thumbnails: Thumbnails;
    publishedAt: string;
    isPrivate: boolean;
    videoIds: string[];
}
