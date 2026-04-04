import { google } from 'googleapis';
import { YOUTUBE_CHANNEL_ID, GOOGLE_API_MAX_RESULTS } from './config.js';

const youtube = google.youtube({
    version: 'v3',
    auth: process.env.BERTA_YOUTUBE_API_KEY,
});

export interface RawVideo {
    id: string;
    title: string;
    description: string;
    publishedAt: string;
    thumbnails: Record<string, { url: string; width: number; height: number }>;
    tags: string[];
    duration: number;
    statistics: {
        viewCount: string;
        likeCount: string;
        commentCount: string;
        favoriteCount: string;
    };
}

export interface RawPlaylist {
    id: string;
    title: string;
    description: string;
    thumbnails: Record<string, { url: string; width: number; height: number }>;
    publishedAt: string;
    isPrivate: boolean;
    videoIds: string[];
}

function parseISO8601Duration(duration: string): number {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;
    const hours = parseInt(match[1] || '0', 10);
    const minutes = parseInt(match[2] || '0', 10);
    const seconds = parseInt(match[3] || '0', 10);
    return hours * 3600 + minutes * 60 + seconds;
}

async function searchAllVideos(): Promise<string[]> {
    const ids: string[] = [];
    let pageToken: string | undefined;

    do {
        console.log(`Fetching video search page... (${ids.length} IDs so far)`);
        const res = await youtube.search.list({
            part: ['snippet'],
            channelId: YOUTUBE_CHANNEL_ID,
            maxResults: GOOGLE_API_MAX_RESULTS,
            order: 'date',
            type: ['video'],
            pageToken,
        });

        const items = res.data.items ?? [];
        for (const item of items) {
            if (item.id?.videoId) {
                ids.push(item.id.videoId);
            }
        }

        pageToken = res.data.nextPageToken ?? undefined;
    } while (pageToken);

    return ids;
}

async function getVideoDetails(ids: string[]): Promise<RawVideo[]> {
    const videos: RawVideo[] = [];

    for (let i = 0; i < ids.length; i += GOOGLE_API_MAX_RESULTS) {
        const batch = ids.slice(i, i + GOOGLE_API_MAX_RESULTS);
        console.log(`Fetching video details batch ${Math.floor(i / GOOGLE_API_MAX_RESULTS) + 1}...`);

        const res = await youtube.videos.list({
            part: ['snippet', 'statistics', 'contentDetails'],
            id: batch,
        });

        for (const item of res.data.items ?? []) {
            const duration = parseISO8601Duration(item.contentDetails?.duration ?? '');

            if (duration <= 60) continue;

            videos.push({
                id: item.id!,
                title: item.snippet?.title ?? '',
                description: item.snippet?.description ?? '',
                publishedAt: item.snippet?.publishedAt ?? '',
                thumbnails: (item.snippet?.thumbnails ?? {}) as RawVideo['thumbnails'],
                tags: item.snippet?.tags ?? [],
                duration,
                statistics: {
                    viewCount: item.statistics?.viewCount ?? '0',
                    likeCount: item.statistics?.likeCount ?? '0',
                    commentCount: item.statistics?.commentCount ?? '0',
                    favoriteCount: item.statistics?.favoriteCount ?? '0',
                },
            });
        }
    }

    return videos;
}

export async function fetchVideos(): Promise<{ updatedAt: number; count: number; videos: RawVideo[] }> {
    console.log('Fetching channel videos...');
    const ids = await searchAllVideos();
    console.log(`Found ${ids.length} video IDs, fetching details...`);
    const videos = await getVideoDetails(ids);
    console.log(`Got ${videos.length} videos (shorts excluded)`);

    return {
        updatedAt: Date.now(),
        count: videos.length,
        videos,
    };
}

async function searchAllPlaylists(): Promise<string[]> {
    const ids: string[] = [];
    let pageToken: string | undefined;

    do {
        console.log(`Fetching playlist search page... (${ids.length} IDs so far)`);
        const res = await youtube.search.list({
            part: ['snippet'],
            channelId: YOUTUBE_CHANNEL_ID,
            maxResults: GOOGLE_API_MAX_RESULTS,
            order: 'date',
            type: ['playlist'],
            pageToken,
        });

        const items = res.data.items ?? [];
        for (const item of items) {
            if (item.id?.playlistId) {
                ids.push(item.id.playlistId);
            }
        }

        pageToken = res.data.nextPageToken ?? undefined;
    } while (pageToken);

    return ids;
}

async function getPlaylistDetails(playlistId: string): Promise<RawPlaylist | null> {
    const res = await youtube.playlists.list({
        part: ['snippet', 'status'],
        id: [playlistId],
    });

    const item = res.data.items?.[0];
    if (!item) return null;

    const videoIds = await getPlaylistVideoIds(playlistId);

    return {
        id: item.id!,
        title: item.snippet?.title ?? '',
        description: item.snippet?.description ?? '',
        thumbnails: (item.snippet?.thumbnails ?? {}) as RawPlaylist['thumbnails'],
        publishedAt: item.snippet?.publishedAt ?? '',
        isPrivate: item.status?.privacyStatus !== 'public',
        videoIds,
    };
}

async function getPlaylistVideoIds(playlistId: string): Promise<string[]> {
    const ids: string[] = [];
    let pageToken: string | undefined;

    do {
        const res = await youtube.playlistItems.list({
            part: ['snippet'],
            playlistId,
            maxResults: GOOGLE_API_MAX_RESULTS,
            pageToken,
        });

        for (const item of res.data.items ?? []) {
            const videoId = item.snippet?.resourceId?.videoId;
            if (videoId) {
                ids.push(videoId);
            }
        }

        pageToken = res.data.nextPageToken ?? undefined;
    } while (pageToken);

    return ids;
}

export async function fetchPlaylists(): Promise<{ updatedAt: number; count: number; playlists: RawPlaylist[] }> {
    console.log('Fetching playlists...');
    const ids = await searchAllPlaylists();
    console.log(`Found ${ids.length} playlist IDs, fetching details...`);

    const playlists: RawPlaylist[] = [];
    for (const id of ids) {
        const playlist = await getPlaylistDetails(id);
        if (playlist) {
            playlists.push(playlist);
        }
    }

    console.log(`Got ${playlists.length} playlists`);

    return {
        updatedAt: Date.now(),
        count: playlists.length,
        playlists,
    };
}

export async function fetchExternalVideos(
    channelVideoIds: Set<string>,
    playlists: RawPlaylist[],
): Promise<{ updatedAt: number; count: number; videos: RawVideo[] }> {
    console.log('Finding external videos in playlists...');

    const externalIds = new Set<string>();
    for (const playlist of playlists) {
        for (const videoId of playlist.videoIds) {
            if (!channelVideoIds.has(videoId)) {
                externalIds.add(videoId);
            }
        }
    }

    console.log(`Found ${externalIds.size} external video IDs, fetching details...`);
    const videos = await getVideoDetails([...externalIds]);
    console.log(`Got ${videos.length} external videos`);

    return {
        updatedAt: Date.now(),
        count: videos.length,
        videos,
    };
}
