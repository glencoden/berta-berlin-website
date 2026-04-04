import type { Video } from '../types/video';
import { getVideoGenres } from '../helpers/getVideoGenres';
import { genreListStaleTime, minNumUnseenVideos } from '../variables';

const STORAGE_KEYS = {
    WATCHED_VIDEOS: 'BERTA.WATCHED_VIDEOS',
    RECENT_GENRES: 'BERTA.RECENT_GENRES',
} as const;

interface GenreStorage {
    updatedAt: number;
    genreList: string[];
}

class StorageService {
    private _numVideos = 0;

    setNumVideos(count: number): void {
        this._numVideos = count;
    }

    private _get<T>(key: string): T | null {
        const value = localStorage.getItem(key);
        if (value === null) return null;
        try { return JSON.parse(value) as T; }
        catch (err) { console.error(err); return null; }
    }

    private _set(key: string, value: unknown): void {
        localStorage.setItem(key, JSON.stringify(value));
    }

    getSeenVideoIds(): string[] | null {
        return this._get<string[]>(STORAGE_KEYS.WATCHED_VIDEOS);
    }

    setSeenVideoIds(video: Video): void {
        const maxNumStoredIds = this._numVideos - minNumUnseenVideos;
        const currentSeenVideoIds = this.getSeenVideoIds();
        const storageUpdate = [video.id, ...(currentSeenVideoIds ?? [])].slice(0, maxNumStoredIds);
        this._set(STORAGE_KEYS.WATCHED_VIDEOS, storageUpdate);
    }

    getRecentlyWatchedGenres(): string[] | null {
        const storageValue = this._get<GenreStorage>(STORAGE_KEYS.RECENT_GENRES);
        if (storageValue === null) return null;
        return storageValue.genreList;
    }

    setRecentlyWatchedGenres(video: Video): void {
        if (!Array.isArray(video.tags)) return;
        const inputGenreList = getVideoGenres(video);
        const currentStorage = this._get<GenreStorage>(STORAGE_KEYS.RECENT_GENRES);
        const currentTimestamp = Date.now();
        if (currentStorage === null || (currentStorage.updatedAt + genreListStaleTime) < currentTimestamp) {
            this._set(STORAGE_KEYS.RECENT_GENRES, { updatedAt: currentTimestamp, genreList: inputGenreList });
            return;
        }
        const genreListUpdate = [...currentStorage.genreList];
        inputGenreList.forEach(genre => { if (!genreListUpdate.includes(genre)) genreListUpdate.push(genre); });
        this._set(STORAGE_KEYS.RECENT_GENRES, { updatedAt: currentTimestamp, genreList: genreListUpdate });
    }
}

export const storageService = new StorageService();
