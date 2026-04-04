# Phase 2: Data Pipeline — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the berta-bot YouTube scraper to TypeScript build scripts that fetch data from the YouTube API, compute trend metrics, and write JSON files for the React app to import.

**Architecture:** Three TypeScript scripts in `scripts/`: a YouTube API fetcher, a trend computation module, and an orchestrator that calls them in sequence. Run via `tsx` as a pre-build step. Reads/writes `data/trend-history.json` for persistent trend tracking.

**Tech Stack:** googleapis (YouTube Data API v3), tsx, TypeScript, Node.js

**Prerequisites:** Phase 1 must be complete (project scaffolding, types, data placeholders).

---

### Task 1: Install build script dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install dependencies**

```bash
npm install googleapis
npm install -D tsx @types/node
```

- [ ] **Step 2: Add build:data script to package.json**

Add to the `"scripts"` section in `package.json`:
```json
"build:data": "tsx scripts/build-data.ts",
"build:full": "npm run build:data && npm run build"
```

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "add googleapis and tsx dependencies, build:data script"
```

---

### Task 2: Create YouTube data fetcher

**Files:**
- Create: `scripts/config.ts`
- Create: `scripts/fetch-youtube-data.ts`

- [ ] **Step 1: Create script config**

`scripts/config.ts`:
```ts
export const YOUTUBE_CHANNEL_ID = 'UCz74WCGrXmY3On0l96NNaVA';
export const GOOGLE_API_MAX_RESULTS = 50;
export const VIDEO_TREND_PERIOD = 14;
export const MAX_NUM_VIDEO_TREND_STATISTICS = 56;
```

- [ ] **Step 2: Create the fetcher**

`scripts/fetch-youtube-data.ts`:
```ts
import { google } from 'googleapis';
import { YOUTUBE_CHANNEL_ID, GOOGLE_API_MAX_RESULTS } from './config';

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
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    if (!match) return 0;

    const hours = parseInt((match[1] || '').replace('H', '')) || 0;
    const minutes = parseInt((match[2] || '').replace('M', '')) || 0;
    const seconds = parseInt((match[3] || '').replace('S', '')) || 0;

    return hours * 3600 + minutes * 60 + seconds;
}

async function fetchAllVideoIds(): Promise<string[]> {
    const result: string[] = [];
    let pageToken: string | undefined;

    do {
        const response = await youtube.search.list({
            part: ['snippet'],
            order: 'date',
            channelId: YOUTUBE_CHANNEL_ID,
            maxResults: GOOGLE_API_MAX_RESULTS,
            type: ['video'],
            pageToken,
        });

        const items = response.data.items ?? [];
        const ids = items
            .map(item => item.id?.videoId)
            .filter((id): id is string => !!id);

        result.push(...ids);

        console.log(`Fetched ${result.length} video IDs (total: ${response.data.pageInfo?.totalResults})`);

        pageToken = response.data.nextPageToken ?? undefined;
    } while (pageToken);

    return result;
}

async function fetchVideoDetails(videoIds: string[]): Promise<RawVideo[]> {
    const result: RawVideo[] = [];
    const ids = [...videoIds];

    while (ids.length > 0) {
        const batch = ids.splice(0, GOOGLE_API_MAX_RESULTS);

        const response = await youtube.videos.list({
            part: ['snippet', 'statistics', 'contentDetails'],
            id: batch,
        });

        const videos = (response.data.items ?? []).map(video => ({
            id: video.id!,
            title: video.snippet?.title ?? '',
            description: video.snippet?.description ?? '',
            publishedAt: video.snippet?.publishedAt ?? '',
            thumbnails: (video.snippet?.thumbnails ?? {}) as RawVideo['thumbnails'],
            tags: video.snippet?.tags ?? [],
            duration: parseISO8601Duration(video.contentDetails?.duration ?? ''),
            statistics: {
                viewCount: video.statistics?.viewCount ?? '0',
                likeCount: video.statistics?.likeCount ?? '0',
                commentCount: video.statistics?.commentCount ?? '0',
                favoriteCount: video.statistics?.favoriteCount ?? '0',
            },
        }));

        result.push(...videos);
    }

    return result;
}

function removeShorts(videos: RawVideo[]): RawVideo[] {
    return videos.filter(video => {
        if (video.duration > 60) return true;
        console.log('REMOVE SHORT:', video.title);
        return false;
    });
}

async function fetchAllPlaylistIds(): Promise<string[]> {
    const result: string[] = [];
    let pageToken: string | undefined;

    do {
        const response = await youtube.search.list({
            part: ['snippet'],
            order: 'date',
            channelId: YOUTUBE_CHANNEL_ID,
            maxResults: GOOGLE_API_MAX_RESULTS,
            type: ['playlist'],
            pageToken,
        });

        const ids = (response.data.items ?? [])
            .map(item => item.id?.playlistId)
            .filter((id): id is string => !!id);

        result.push(...ids);

        pageToken = response.data.nextPageToken ?? undefined;
    } while (pageToken);

    return result;
}

async function fetchPlaylistVideoIds(playlistId: string): Promise<string[]> {
    const result: string[] = [];
    let pageToken: string | undefined;

    do {
        const response = await youtube.playlistItems.list({
            part: ['snippet'],
            playlistId,
            maxResults: GOOGLE_API_MAX_RESULTS,
            pageToken,
        });

        const ids = (response.data.items ?? [])
            .map(item => item.snippet?.resourceId?.videoId)
            .filter((id): id is string => !!id);

        result.push(...ids);

        pageToken = response.data.nextPageToken ?? undefined;
    } while (pageToken);

    return result;
}

async function fetchPlaylistDetails(playlistIds: string[]): Promise<RawPlaylist[]> {
    const result: RawPlaylist[] = [];

    for (const playlistId of playlistIds) {
        const response = await youtube.playlists.list({
            part: ['snippet', 'status'],
            id: [playlistId],
        });

        const playlist = response.data.items?.[0];
        if (!playlist) continue;

        const videoIds = await fetchPlaylistVideoIds(playlistId);

        result.push({
            id: playlist.id!,
            title: playlist.snippet?.title ?? '',
            description: playlist.snippet?.description ?? '',
            thumbnails: (playlist.snippet?.thumbnails ?? {}) as RawPlaylist['thumbnails'],
            publishedAt: playlist.snippet?.publishedAt ?? '',
            isPrivate: playlist.status?.privacyStatus !== 'public',
            videoIds,
        });
    }

    return result;
}

export async function fetchVideos(): Promise<{ updatedAt: number; count: number; videos: RawVideo[] }> {
    console.log('Fetching channel videos...');
    const videoIds = await fetchAllVideoIds();
    const videos = await fetchVideoDetails(videoIds);
    const filtered = removeShorts(videos);

    console.log(`Fetched ${filtered.length} videos (${videos.length - filtered.length} shorts removed)`);

    return {
        updatedAt: Date.now(),
        count: filtered.length,
        videos: filtered,
    };
}

export async function fetchPlaylists(): Promise<{ updatedAt: number; count: number; playlists: RawPlaylist[] }> {
    console.log('Fetching playlists...');
    const playlistIds = await fetchAllPlaylistIds();
    const playlists = await fetchPlaylistDetails(playlistIds);

    console.log(`Fetched ${playlists.length} playlists`);

    return {
        updatedAt: Date.now(),
        count: playlists.length,
        playlists,
    };
}

export async function fetchExternalVideos(
    channelVideoIds: string[],
    playlists: RawPlaylist[],
): Promise<{ updatedAt: number; count: number; videos: RawVideo[] }> {
    console.log('Fetching external videos...');
    const playlistVideoIds = playlists.flatMap(p => p.videoIds);
    const externalIds = [...new Set(playlistVideoIds.filter(id => !channelVideoIds.includes(id)))];

    if (externalIds.length === 0) {
        return { updatedAt: Date.now(), count: 0, videos: [] };
    }

    const videos = await fetchVideoDetails(externalIds);
    const filtered = removeShorts(videos);

    console.log(`Fetched ${filtered.length} external videos`);

    return {
        updatedAt: Date.now(),
        count: filtered.length,
        videos: filtered,
    };
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit -p tsconfig.scripts.json
```

Expected: No errors (or only minor type issues to fix).

Note: If `tsconfig.scripts.json` doesn't include `scripts/` properly yet, ensure it has `"include": ["scripts/**/*.ts"]` and `"types": ["node"]` in `compilerOptions`.

- [ ] **Step 4: Commit**

```bash
git add scripts/config.ts scripts/fetch-youtube-data.ts
git commit -m "add YouTube data fetcher script"
```

---

### Task 3: Create trend computation module

**Files:**
- Create: `scripts/compute-trends.ts`

- [ ] **Step 1: Write the trend computation module**

`scripts/compute-trends.ts`:
```ts
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { VIDEO_TREND_PERIOD, MAX_NUM_VIDEO_TREND_STATISTICS } from './config';
import type { RawVideo } from './fetch-youtube-data';

const VIEW_COUNT_WEIGHT = 0.7;
const LIKE_COUNT_WEIGHT = 0.3;

interface TrendSnapshot {
    timestamp: number;
    statistics: {
        viewCount: string;
        likeCount: string;
        commentCount: string;
        favoriteCount: string;
    };
}

interface TrendHistoryFile {
    updatedAt: number;
    videos: Record<string, TrendSnapshot[]>;
}

const TREND_HISTORY_PATH = resolve('data', 'trend-history.json');

function readTrendHistory(): TrendHistoryFile {
    const raw = readFileSync(TREND_HISTORY_PATH, 'utf-8');
    return JSON.parse(raw);
}

function writeTrendHistory(history: TrendHistoryFile): void {
    writeFileSync(TREND_HISTORY_PATH, JSON.stringify(history, null, 4));
}

function getPopularity(
    statistics: { viewCount: string; likeCount: string },
    likeCountMakeupWeight: number,
): number {
    let viewCount = parseInt(statistics.viewCount);
    let likeCount = parseInt(statistics.likeCount);

    if (Number.isNaN(viewCount)) viewCount = 0;
    if (Number.isNaN(likeCount)) likeCount = 0;

    const viewCountTerm = viewCount * VIEW_COUNT_WEIGHT;
    const likeCountTerm = likeCount * LIKE_COUNT_WEIGHT * likeCountMakeupWeight;

    return Math.floor(viewCountTerm + likeCountTerm);
}

export interface VideoWithTrends extends RawVideo {
    statistics: RawVideo['statistics'] & {
        popularity: number;
        trend: number;
        gain: number;
    };
}

export function computeTrends(
    videos: RawVideo[],
    updatedAt: number,
): VideoWithTrends[] {
    const history = readTrendHistory();
    const prevVideos = history.videos;

    if (Object.keys(prevVideos).length === 0) {
        const newHistory: TrendHistoryFile = {
            updatedAt,
            videos: {},
        };

        const result = videos.map(video => {
            newHistory.videos[video.id] = [{
                timestamp: updatedAt,
                statistics: {
                    viewCount: video.statistics.viewCount,
                    likeCount: video.statistics.likeCount,
                    commentCount: video.statistics.commentCount,
                    favoriteCount: video.statistics.favoriteCount,
                },
            }];

            return {
                ...video,
                statistics: {
                    ...video.statistics,
                    popularity: 0,
                    trend: 0,
                    gain: 0,
                },
            };
        });

        writeTrendHistory(newHistory);
        return result;
    }

    let totalViewCount = 0;
    let totalLikeCount = 0;

    for (const video of videos) {
        const viewCount = parseInt(video.statistics.viewCount);
        const likeCount = parseInt(video.statistics.likeCount);
        if (!Number.isNaN(viewCount)) totalViewCount += viewCount;
        if (!Number.isNaN(likeCount)) totalLikeCount += likeCount;
    }

    const likeCountMakeupWeight = totalViewCount / (totalLikeCount || 1);

    const newHistory: TrendHistoryFile = {
        updatedAt,
        videos: {},
    };

    const result = videos.map(video => {
        const prevSnapshots = (prevVideos[video.id] ?? []).slice(0, MAX_NUM_VIDEO_TREND_STATISTICS);

        const trendStatistics = [...prevSnapshots]
            .sort((a, b) => b.timestamp - a.timestamp);

        trendStatistics.unshift({
            timestamp: updatedAt,
            statistics: {
                viewCount: video.statistics.viewCount,
                likeCount: video.statistics.likeCount,
                commentCount: video.statistics.commentCount,
                favoriteCount: video.statistics.favoriteCount,
            },
        });

        newHistory.videos[video.id] = trendStatistics;

        const popularity = getPopularity(video.statistics, likeCountMakeupWeight);

        const popularityGainLookingBack: number[] = [];

        let currentPopularity = popularity;
        let index = VIDEO_TREND_PERIOD;

        while (trendStatistics[index]) {
            const previousPopularity = getPopularity(trendStatistics[index].statistics, likeCountMakeupWeight);
            const popularityGain = currentPopularity - previousPopularity;
            const popularityGainPerThousand = popularityGain / previousPopularity * 1000;

            popularityGainLookingBack.push(popularityGainPerThousand);

            currentPopularity = previousPopularity;
            index += VIDEO_TREND_PERIOD;
        }

        let trend = 0;
        let gain = 0;

        if (popularityGainLookingBack.length > 1) {
            const [currentPopularityGain, ...previousPopularityGains] = popularityGainLookingBack;
            const averagePreviousPopularityGain = previousPopularityGains.reduce((sum, g) => sum + g, 0) / previousPopularityGains.length;

            trend = Math.floor(1000 + currentPopularityGain - averagePreviousPopularityGain);
            gain = Math.floor(currentPopularityGain);
        }

        return {
            ...video,
            statistics: {
                ...video.statistics,
                popularity,
                trend,
                gain,
            },
        };
    });

    writeTrendHistory(newHistory);

    console.log(`Computed trends for ${result.length} videos, history updated`);

    return result;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit -p tsconfig.scripts.json
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add scripts/compute-trends.ts
git commit -m "add trend computation module"
```

---

### Task 4: Create build-data orchestrator

**Files:**
- Create: `scripts/build-data.ts`

- [ ] **Step 1: Write the orchestrator**

`scripts/build-data.ts`:
```ts
import { writeFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';
import { fetchVideos, fetchPlaylists, fetchExternalVideos } from './fetch-youtube-data';
import { computeTrends } from './compute-trends';

const OUTPUT_DIR = resolve('src', 'data');

function stripTrendStatistics(video: Record<string, unknown>) {
    const { trendStatistics, ...rest } = video;
    return rest;
}

async function main() {
    const apiKey = process.env.BERTA_YOUTUBE_API_KEY;
    if (!apiKey) {
        console.error('BERTA_YOUTUBE_API_KEY environment variable is required');
        process.exit(1);
    }

    console.log('=== Building YouTube data ===\n');

    mkdirSync(OUTPUT_DIR, { recursive: true });

    const videoResult = await fetchVideos();
    const playlistResult = await fetchPlaylists();
    const externalVideoResult = await fetchExternalVideos(
        videoResult.videos.map(v => v.id),
        playlistResult.playlists,
    );

    console.log('\nComputing trends for channel videos...');
    const videosWithTrends = computeTrends(videoResult.videos, videoResult.updatedAt);

    console.log('Computing trends for external videos...');
    const externalVideosWithTrends = computeTrends(externalVideoResult.videos, externalVideoResult.updatedAt);

    const videoOutput = {
        updatedAt: videoResult.updatedAt,
        count: videosWithTrends.length,
        videos: videosWithTrends.map(stripTrendStatistics),
    };

    const playlistOutput = {
        updatedAt: playlistResult.updatedAt,
        count: playlistResult.playlists.length,
        playlists: playlistResult.playlists,
    };

    const externalVideoOutput = {
        updatedAt: externalVideoResult.updatedAt,
        count: externalVideosWithTrends.length,
        videos: externalVideosWithTrends.map(stripTrendStatistics),
    };

    writeFileSync(resolve(OUTPUT_DIR, 'video.json'), JSON.stringify(videoOutput, null, 2));
    writeFileSync(resolve(OUTPUT_DIR, 'playlist.json'), JSON.stringify(playlistOutput, null, 2));
    writeFileSync(resolve(OUTPUT_DIR, 'external-video.json'), JSON.stringify(externalVideoOutput, null, 2));

    console.log('\n=== Data build complete ===');
    console.log(`  Videos: ${videoOutput.count}`);
    console.log(`  Playlists: ${playlistOutput.count}`);
    console.log(`  External videos: ${externalVideoOutput.count}`);
}

main().catch(err => {
    console.error('Data build failed:', err);
    process.exit(1);
});
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit -p tsconfig.scripts.json
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add scripts/build-data.ts
git commit -m "add build-data orchestrator script"
```

---

### Task 5: Test the full data pipeline

- [ ] **Step 1: Run the data build with a real API key**

The API key is in the old project's `.env` file. Run:

```bash
cd /Users/simonmeyer/glencoden/berta-berlin-website
BERTA_YOUTUBE_API_KEY=<key-from-berta-bot/.env> npm run build:data
```

Expected output:
```
=== Building YouTube data ===

Fetched N video IDs (total: X)
Fetched N videos (M shorts removed)
Fetching playlists...
Fetched N playlists
Fetching external videos...
Fetched N external videos

Computing trends for channel videos...
Computing trends for external videos...

=== Data build complete ===
  Videos: N
  Playlists: N
  External videos: N
```

- [ ] **Step 2: Verify output files**

Check that `src/data/video.json`, `src/data/playlist.json`, and `src/data/external-video.json` contain valid data with the expected structure.

Check that `data/trend-history.json` was updated with video trend snapshots.

- [ ] **Step 3: Run the full build**

```bash
BERTA_YOUTUBE_API_KEY=<key> npm run build:full
```

Expected: Data scripts run, then Vite builds successfully.

- [ ] **Step 4: Fix any issues found during testing**

If there are type mismatches, API response format differences, or other issues, fix them in the relevant script files.

- [ ] **Step 5: Commit**

Do NOT commit the generated `src/data/*.json` files (they're gitignored). Only commit any script fixes:

```bash
git add scripts/
git commit -m "fix data pipeline issues from integration test"
```

If no fixes were needed, skip this step.
