import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadEnvFile } from 'node:process';
import { fetchVideos, fetchPlaylists, fetchExternalVideos } from './fetch-youtube-data.js';
import { computeTrends } from './compute-trends.js';

const envPath = resolve(import.meta.dirname, '..', '.env');
if (existsSync(envPath)) {
    loadEnvFile(envPath);
}

if (!process.env.BERTA_YOUTUBE_API_KEY) {
    console.error('Missing BERTA_YOUTUBE_API_KEY environment variable');
    process.exit(1);
}

const OUTPUT_DIR = resolve(import.meta.dirname, '..', 'src', 'data');

function stripTrendStatistics<T extends { trendStatistics?: unknown }>(
    items: T[],
): Omit<T, 'trendStatistics'>[] {
    return items.map(({ trendStatistics, ...rest }) => {
        void trendStatistics;
        return rest;
    });
}

async function main() {
    console.log('=== Build Data Pipeline ===\n');

    const videoResult = await fetchVideos();
    const playlistResult = await fetchPlaylists();

    const channelVideoIds = new Set(videoResult.videos.map((v) => v.id));
    const externalResult = await fetchExternalVideos(channelVideoIds, playlistResult.playlists);

    console.log('\nComputing trends for channel videos...');
    const videosWithTrends = computeTrends(videoResult.videos, videoResult.updatedAt);

    console.log('Computing trends for external videos...');
    const externalWithTrends = computeTrends(externalResult.videos, externalResult.updatedAt);

    mkdirSync(OUTPUT_DIR, { recursive: true });

    const videoData = {
        updatedAt: videoResult.updatedAt,
        count: videosWithTrends.length,
        videos: stripTrendStatistics(videosWithTrends),
    };

    const playlistData = {
        updatedAt: playlistResult.updatedAt,
        count: playlistResult.count,
        playlists: playlistResult.playlists,
    };

    const externalVideoData = {
        updatedAt: externalResult.updatedAt,
        count: externalWithTrends.length,
        videos: stripTrendStatistics(externalWithTrends),
    };

    writeFileSync(resolve(OUTPUT_DIR, 'video.json'), JSON.stringify(videoData, null, 4) + '\n');
    writeFileSync(resolve(OUTPUT_DIR, 'playlist.json'), JSON.stringify(playlistData, null, 4) + '\n');
    writeFileSync(resolve(OUTPUT_DIR, 'external-video.json'), JSON.stringify(externalVideoData, null, 4) + '\n');

    console.log('\n=== Summary ===');
    console.log(`Videos: ${videoData.count}`);
    console.log(`Playlists: ${playlistData.count}`);
    console.log(`External videos: ${externalVideoData.count}`);
    console.log(`Output: ${OUTPUT_DIR}`);
}

main().catch((err) => {
    console.error('Build data failed:', err);
    process.exit(1);
});
