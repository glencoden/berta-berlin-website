import type { Video } from '../types/video';
import type { Playlist } from '../types/playlist';
import { FilterType } from '../enums/FilterType';
import { ResourceType } from '../enums/ResourceType';
import { storageService } from './storageService';
import { getVideoGenres } from '../helpers/getVideoGenres';
import { playlistFilterKey, maxVideoListLength, genreQuotaPercentage } from '../variables';

export interface SelectedConfig {
    filterType: FilterType;
    resourceType: ResourceType;
    selectedPlaylistId: string | null;
}

function sortPopular(a: Video, b: Video): number {
    return b.statistics.popularity - a.statistics.popularity;
}

function sortTrending(a: Video, b: Video): number {
    const aRankTrend = a.statistics.trend;
    const bRankTrend = b.statistics.trend;
    const aRankGain = a.statistics.gain;
    const bRankGain = b.statistics.gain;
    const aCombined = aRankTrend + aRankGain;
    const bCombined = bRankTrend + bRankGain;
    return bCombined - aCombined;
}

function sortRecent(a: Video, b: Video): number {
    return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
}

class EditorService {
    private _playlists: Playlist[] = [];
    private _videos: Video[] = [];
    private _externalVideos: Video[] = [];
    private _insertVideoId: string | null = null;

    private _sortedPopular: Video[] = [];
    private _sortedTrending: Video[] = [];
    private _sortedRecent: Video[] = [];

    setPlaylists(playlists: Playlist[]): void {
        this._playlists = playlists.filter(p => p.title.toLowerCase().includes(playlistFilterKey));
    }

    setVideos(videos: Video[]): void {
        const seen = new Set<string>();
        this._videos = videos.filter(v => {
            if (seen.has(v.id)) return false;
            seen.add(v.id);
            return true;
        });
        storageService.setNumVideos(this._videos.length);
        this._sortedPopular = [...this._videos].sort(sortPopular);
        this._sortedTrending = [...this._videos].sort(sortTrending);
        this._sortedRecent = [...this._videos].sort(sortRecent);
    }

    setExternalVideos(videos: Video[]): void {
        const seen = new Set<string>();
        this._externalVideos = videos.filter(v => {
            if (seen.has(v.id)) return false;
            seen.add(v.id);
            return true;
        });
    }

    setInsertVideo(id: string | null): void {
        this._insertVideoId = id;
    }

    getPlaylists(): Playlist[] {
        return this._playlists;
    }

    getAllVideos(): Video[] {
        return this._videos;
    }

    getInsertVideo(): Video | null {
        if (this._insertVideoId === null) return null;
        return this._videos.find(v => v.id === this._insertVideoId) ?? null;
    }

    getNumVideos(): number {
        return this._videos.length;
    }

    getVideos(config: SelectedConfig): Video[] {
        if (config.resourceType === ResourceType.PLAYLIST) {
            return this._getVideosForCurrentPlaylist(config.selectedPlaylistId);
        }
        if (config.resourceType === ResourceType.EXTERNAL_VIDEO) {
            return this._externalVideos;
        }
        const videoList = this._selectVideoList(config.filterType);
        return this._makeResultVideoList(videoList);
    }

    private _selectVideoList(filterType: FilterType): Video[] {
        switch (filterType) {
            case FilterType.POPULAR:
                return this._sortedPopular;
            case FilterType.TRENDING:
                return this._sortedTrending;
            case FilterType.RECENT:
                return this._sortedRecent;
            default:
                return this._sortedPopular;
        }
    }

    private _makeResultVideoList(videoList: Video[]): Video[] {
        const unseenList = this._filterVideoListForUnseen(videoList);
        const resultList = this._collectQuotaAndTrim(unseenList);
        return resultList;
    }

    private _filterVideoListForUnseen(videoList: Video[]): Video[] {
        const seenIds = storageService.getSeenVideoIds();
        if (seenIds === null) return videoList;
        return videoList.filter(v => !seenIds.includes(v.id));
    }

    private _collectQuotaAndTrim(videoList: Video[]): Video[] {
        const recentGenres = storageService.getRecentlyWatchedGenres();
        if (recentGenres === null || recentGenres.length === 0) {
            return videoList.slice(0, maxVideoListLength);
        }
        const quotaSize = Math.max(1, Math.floor(videoList.length * genreQuotaPercentage / 100));
        const quotaVideos: Video[] = [];
        const remainingVideos: Video[] = [];

        for (const video of videoList) {
            const genres = getVideoGenres(video);
            const isRecentGenre = genres.some(g => recentGenres.includes(g));
            if (isRecentGenre && quotaVideos.length < quotaSize) {
                quotaVideos.push(video);
            } else {
                remainingVideos.push(video);
            }
        }

        return [...quotaVideos, ...remainingVideos].slice(0, maxVideoListLength);
    }

    private _getVideosForCurrentPlaylist(playlistId: string | null): Video[] {
        if (playlistId === null) return [];
        const playlist = this._playlists.find(p => p.id === playlistId);
        if (!playlist) return [];
        return playlist.videoIds
            .map(id => this._videos.find(v => v.id === id))
            .filter((v): v is Video => v !== undefined);
    }
}

export const editorService = new EditorService();
