import type { Video } from './video';
import type { Playlist } from './playlist';

export interface VideoData {
    updatedAt: number;
    count: number;
    videos: Video[];
}

export interface PlaylistData {
    updatedAt: number;
    count: number;
    playlists: Playlist[];
}

export interface TrendSnapshot {
    timestamp: number;
    statistics: {
        viewCount: string;
        likeCount: string;
        commentCount: string;
        favoriteCount: string;
    };
}

export interface VideoTrendHistory {
    [videoId: string]: TrendSnapshot[];
}

export interface TrendHistoryFile {
    updatedAt: number;
    videos: VideoTrendHistory;
}
