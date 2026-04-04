export interface Thumbnail {
    url: string;
    width: number;
    height: number;
}

export interface Thumbnails {
    default: Thumbnail;
    medium: Thumbnail;
    high: Thumbnail;
    standard?: Thumbnail;
    maxres?: Thumbnail;
}

export interface VideoStatistics {
    viewCount: string;
    likeCount: string;
    commentCount: string;
    favoriteCount: string;
    popularity: number;
    trend: number;
    gain: number;
}

export interface Video {
    id: string;
    title: string;
    description: string;
    publishedAt: string;
    thumbnails: Thumbnails;
    tags: string[];
    duration: number;
    statistics: VideoStatistics;
    renderKey?: string;
}
