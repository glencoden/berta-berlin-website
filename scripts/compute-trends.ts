import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { VIDEO_TREND_PERIOD, MAX_NUM_VIDEO_TREND_STATISTICS } from './config.js';
import type { RawVideo } from './fetch-youtube-data.js';

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
    videos: { [videoId: string]: TrendSnapshot[] };
}

type VideoWithTrends = RawVideo & {
    trendStatistics: TrendSnapshot[];
    statistics: RawVideo['statistics'] & {
        popularity: number;
        trend: number;
        gain: number;
    };
};

const TREND_HISTORY_PATH = resolve(import.meta.dirname, '..', 'data', 'trend-history.json');

function readTrendHistory(): TrendHistoryFile {
    try {
        const content = readFileSync(TREND_HISTORY_PATH, 'utf-8');
        return JSON.parse(content);
    } catch {
        return { updatedAt: 0, videos: {} };
    }
}

function writeTrendHistory(history: TrendHistoryFile): void {
    mkdirSync(dirname(TREND_HISTORY_PATH), { recursive: true });
    writeFileSync(TREND_HISTORY_PATH, JSON.stringify(history, null, 4) + '\n');
}

function getPopularity(
    statistics: { viewCount: string; likeCount: string },
    likeCountMakeupWeight: number,
): number {
    const viewCount = parseInt(statistics.viewCount) || 0;
    const likeCount = parseInt(statistics.likeCount) || 0;
    return viewCount * VIEW_COUNT_WEIGHT + likeCount * LIKE_COUNT_WEIGHT * likeCountMakeupWeight;
}

export function computeTrends(
    videos: RawVideo[],
    updatedAt: number,
): VideoWithTrends[] {
    const history = readTrendHistory();

    if (videos.length === 0) {
        return [];
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

    const result: VideoWithTrends[] = videos.map((video) => {
        const prevSnapshots = (history.videos[video.id] ?? [])
            .slice(0, MAX_NUM_VIDEO_TREND_STATISTICS);

        const trendStatistics: TrendSnapshot[] = [
            { timestamp: updatedAt, statistics: video.statistics },
            ...prevSnapshots,
        ];

        trendStatistics.sort((a, b) => b.timestamp - a.timestamp);

        const popularity = getPopularity(video.statistics, likeCountMakeupWeight);

        const popularityGainLookingBack: number[] = [];
        let currentPopularity = popularity;
        let index = VIDEO_TREND_PERIOD;

        while (trendStatistics[index]) {
            const previousPopularity = getPopularity(trendStatistics[index].statistics, likeCountMakeupWeight);
            const popularityGain = currentPopularity - previousPopularity;
            const popularityGainPerThousand = (popularityGain / (previousPopularity || 1)) * 1000;
            popularityGainLookingBack.push(popularityGainPerThousand);
            currentPopularity = previousPopularity;
            index += VIDEO_TREND_PERIOD;
        }

        let trend = 0;
        let gain = 0;

        if (popularityGainLookingBack.length > 1) {
            const [currentPopularityGain, ...previousPopularityGains] = popularityGainLookingBack;
            const avg = previousPopularityGains.reduce((sum, g) => sum + g, 0) / previousPopularityGains.length;
            trend = Math.floor(1000 + currentPopularityGain - avg);
            gain = Math.floor(currentPopularityGain);
        }

        return {
            ...video,
            trendStatistics,
            statistics: {
                ...video.statistics,
                popularity,
                trend,
                gain,
            },
        };
    });

    const updatedHistory: TrendHistoryFile = {
        updatedAt,
        videos: { ...history.videos },
    };

    for (const video of result) {
        updatedHistory.videos[video.id] = video.trendStatistics;
    }

    writeTrendHistory(updatedHistory);

    return result;
}
