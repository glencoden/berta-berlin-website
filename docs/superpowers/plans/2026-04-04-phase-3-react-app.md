# Phase 3: React App — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port all React components from the old berta-berlin CRA app to TypeScript with Tailwind CSS, replacing Material UI and the runtime data fetching with static JSON imports.

**Architecture:** Same component tree and state management as the original (Context + useReducer). MUI styled components become inline Tailwind classes and CSS custom properties for dynamic values. Data is imported from `src/data/` JSON files at build time instead of fetched at runtime.

**Tech Stack:** React 18, TypeScript, Tailwind CSS 4, use-query-params, query-string

**Prerequisites:** Phase 1 (scaffolding) and Phase 2 (data pipeline) must be complete, with valid JSON data in `src/data/`.

---

### Task 1: Install remaining frontend dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install dependencies**

```bash
npm install use-query-params query-string
```

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "add use-query-params and query-string dependencies"
```

---

### Task 2: Port helper utilities

**Files:**
- Create: `src/helpers/getTileSize.ts`
- Create: `src/helpers/getVideoGenres.ts`
- Create: `src/helpers/isMobile.ts`
- Create: `src/helpers/isViewportTooSmall.ts`

- [ ] **Step 1: Create helper files**

`src/helpers/getTileSize.ts`:
```ts
import {
    defaultTileWidth,
    laneLeft,
    laneTileOffset,
    minNumRenderedTiles,
    mobileContentMargin,
} from '../variables';

export interface TileSize {
    width: number;
    height: number;
}

export const getTileSize = (): TileSize => {
    const marginRight = Math.max(minNumRenderedTiles - 1.5, 0) * laneTileOffset;

    let width = Math.min(window.innerWidth - laneLeft - marginRight, defaultTileWidth);
    let height = width / 16 * 9;

    const maxHeight = window.innerHeight - 2 * mobileContentMargin;

    if (height > maxHeight) {
        height = maxHeight;
        width = maxHeight / 9 * 16;
    }

    return { width, height };
};
```

`src/helpers/getVideoGenres.ts`:
```ts
import { validGenres } from '../variables';
import type { Video } from '../types/video';

const GENRES = validGenres.map(genre => genre.toLowerCase());

export const getVideoGenres = (video: Video | null | undefined): string[] => {
    if (!Array.isArray(video?.tags)) {
        return [];
    }
    const tagList = video.tags.map(tag => tag.toLowerCase());
    return tagList.filter(tag => GENRES.includes(tag));
};
```

`src/helpers/isMobile.ts`:
```ts
import { maxMobileWidth } from '../variables';

export const isMobile = (): boolean => {
    return window.innerWidth <= maxMobileWidth;
};
```

`src/helpers/isViewportTooSmall.ts`:
```ts
import { minDeviceWidth } from '../variables';

export const isViewportTooSmall = (): boolean => {
    return window.innerWidth < minDeviceWidth;
};
```

- [ ] **Step 2: Commit**

```bash
git add src/helpers/
git commit -m "port helper utilities to TypeScript"
```

---

### Task 3: Port services (editorService, storageService)

**Files:**
- Create: `src/services/editorService.ts`
- Create: `src/services/storageService.ts`

- [ ] **Step 1: Port storageService**

`src/services/storageService.ts`:
```ts
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
        try {
            return JSON.parse(value) as T;
        } catch (err) {
            console.error(err);
            return null;
        }
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
            this._set(STORAGE_KEYS.RECENT_GENRES, {
                updatedAt: currentTimestamp,
                genreList: inputGenreList,
            });
            return;
        }

        const genreListUpdate = [...currentStorage.genreList];
        inputGenreList.forEach(genre => {
            if (!genreListUpdate.includes(genre)) {
                genreListUpdate.push(genre);
            }
        });

        this._set(STORAGE_KEYS.RECENT_GENRES, {
            updatedAt: currentTimestamp,
            genreList: genreListUpdate,
        });
    }
}

export const storageService = new StorageService();
```

Note: The original `storageService` depended on `editorService.getNumVideos()` for the max stored IDs cap. This creates a circular dependency. In the new version, `storageService` exposes a `setNumVideos()` method that `editorService` calls when it sets videos. This breaks the circular import.

- [ ] **Step 2: Port editorService**

`src/services/editorService.ts`:
```ts
import type { Video } from '../types/video';
import type { Playlist } from '../types/playlist';
import { ResourceType } from '../enums/ResourceType';
import { FilterType } from '../enums/FilterType';
import { genreQuotaPercentage, maxVideoListLength, playlistFilterKey } from '../variables';
import { storageService } from './storageService';
import { getVideoGenres } from '../helpers/getVideoGenres';

export interface SelectedConfig {
    filterType: FilterType;
    resourceType: ResourceType;
    selectedPlaylistId: string | null;
}

const sortPopular = (videos: Video[]): Video[] => {
    return videos.toSorted((a, b) => b.statistics.popularity - a.statistics.popularity);
};

const sortTrending = (videos: Video[]): Video[] => {
    const videosByTrend = videos.toSorted((a, b) => b.statistics.trend - a.statistics.trend);
    const videosByGain = videosByTrend.toSorted((a, b) => b.statistics.gain - a.statistics.gain);

    const rankByVideoId: Record<string, number> = {};

    videosByTrend.forEach((video, index) => {
        rankByVideoId[video.id] = index;
    });

    videosByGain.forEach((video, index) => {
        rankByVideoId[video.id] += index;
    });

    return videos.toSorted((a, b) => rankByVideoId[a.id] - rankByVideoId[b.id]);
};

const sortRecent = (videos: Video[]): Video[] => {
    return videos.toSorted((a, b) => new Date(b.publishedAt) > new Date(a.publishedAt) ? 1 : -1);
};

class EditorService {
    private playlists: Playlist[] | null = null;
    private videos: Video[] | null = null;
    private externalVideos: Video[] | null = null;
    private videosByPopularity: Video[] | null = null;
    private videosByTrend: Video[] | null = null;
    private videosByCreatedAt: Video[] | null = null;
    private numProvidedVideoLists = 0;
    private _insertVideo: Video | null = null;

    setPlaylists(playlists: Playlist[]): void {
        this.playlists = playlists.filter(playlist => playlist.description.includes(playlistFilterKey));
    }

    setVideos(videos: Video[]): void {
        this.videos = [];

        videos.forEach(video => {
            if (!this.videos!.find(v => v.id === video.id)) {
                this.videos!.push(video);
            }
        });

        storageService.setNumVideos(this.videos.length);

        this.videosByPopularity = sortPopular(this.videos);
        this.videosByTrend = sortTrending(this.videos);
        this.videosByCreatedAt = sortRecent(this.videos);
    }

    setExternalVideos(videos: Video[]): void {
        this.externalVideos = [];

        videos.forEach(video => {
            if (!this.externalVideos!.find(v => v.id === video.id)) {
                this.externalVideos!.push(video);
            }
        });
    }

    setInsertVideo(id: string): void {
        const insertVideo = this.getAllVideos()?.find(video => video.id === id);
        if (!insertVideo) return;
        this._insertVideo = insertVideo;
    }

    getPlaylists(): Playlist[] | null {
        return this.playlists;
    }

    getAllVideos(): Video[] | null {
        return this.videos;
    }

    getInsertVideo(): Video | null {
        return this._insertVideo;
    }

    getNumVideos(): number {
        if (this.videos === null) return 0;
        return this.videos.length;
    }

    getVideos(config: SelectedConfig): Video[] {
        const selectedVideoList = this._selectVideoList(config.filterType);

        if (selectedVideoList === null) {
            console.warn(`no videos for filter type "${config.filterType}"`);
            return [];
        }

        switch (config.resourceType) {
            case ResourceType.VIDEO: {
                const filteredList = this._filterVideoListForUnseen(selectedVideoList);
                return this._makeResultVideoList(filteredList);
            }
            case ResourceType.PLAYLIST: {
                if (this.playlists === null) {
                    console.warn('no playlists');
                    return [];
                }
                const allPlaylistVideos = Array.isArray(this.externalVideos)
                    ? [...selectedVideoList, ...this.externalVideos]
                    : selectedVideoList;
                const videosForPlaylist = this._getVideosForCurrentPlaylist(config.selectedPlaylistId, allPlaylistVideos);
                return this._makeResultVideoList(videosForPlaylist);
            }
            default:
                console.warn('unsupported resource type');
                return [];
        }
    }

    private _selectVideoList(filterType: FilterType): Video[] | null {
        switch (filterType) {
            case FilterType.POPULAR:
                return this.videosByPopularity;
            case FilterType.TRENDING:
                return this.videosByTrend;
            case FilterType.RECENT:
                return this.videosByCreatedAt?.filter(video => !video.description?.includes('#shorts')) ?? null;
            default:
                console.warn(`unknown filter type "${filterType}"`);
                return this.videosByTrend;
        }
    }

    private _makeResultVideoList(videoList: Video[]): Video[] {
        const numQuotaResults = Math.floor(Math.min(videoList.length, maxVideoListLength) * genreQuotaPercentage / 100);
        const resultVideoList = this._collectQuotaAndTrim(videoList, numQuotaResults);

        this.numProvidedVideoLists++;
        resultVideoList.forEach(video => video.renderKey = `${video.id}_${this.numProvidedVideoLists}`);

        return resultVideoList;
    }

    private _filterVideoListForUnseen(videoList: Video[]): Video[] {
        const seenVideoIds = storageService.getSeenVideoIds();
        if (seenVideoIds === null) return videoList;
        return videoList.filter(video => !seenVideoIds.includes(video.id));
    }

    private _collectQuotaAndTrim(videoList: Video[], numResults: number): Video[] {
        const recentlyWatchedGenres = storageService.getRecentlyWatchedGenres();

        if (recentlyWatchedGenres === null) {
            return videoList.slice(0, maxVideoListLength);
        }

        const currentVideoList = [...videoList];
        const quotaResults: Record<number, Video> = {};
        let currentVideoIndex = 0;

        while (Object.keys(quotaResults).length < numResults && currentVideoIndex < currentVideoList.length) {
            const currentVideo = currentVideoList[currentVideoIndex];
            const currentVideoGenres = getVideoGenres(currentVideo);

            if (
                currentVideoGenres.length > 0
                && currentVideoGenres.some(tag => recentlyWatchedGenres.includes(tag))
            ) {
                const splice = currentVideoList.splice(currentVideoIndex, 1);
                quotaResults[currentVideoIndex] = splice[0];
            } else {
                currentVideoIndex++;
            }
        }

        const quotaResultKeys = Object.keys(quotaResults).map(Number);
        const highestQuotaIndex = quotaResultKeys[quotaResultKeys.length - 1];
        const indexCompression = Math.min((maxVideoListLength - 1) / highestQuotaIndex, 1);

        const numNonQuotaVideos = maxVideoListLength - quotaResultKeys.length;
        const resultVideoList = currentVideoList.slice(0, numNonQuotaVideos);

        Object.entries(quotaResults).forEach(([key, value]) => {
            const insertionIndex = Math.floor(parseInt(key) * indexCompression);
            resultVideoList.splice(insertionIndex, 0, value);
        });

        return resultVideoList;
    }

    private _getVideosForCurrentPlaylist(playlistId: string | null, videos: Video[]): Video[] {
        const currentPlaylist = this.playlists?.find(playlist => playlist.id === playlistId);

        if (!currentPlaylist) {
            console.warn('playlist not found');
            return [];
        }

        return currentPlaylist.videoIds
            .map(videoId => videos.find(video => video.id === videoId))
            .filter((v): v is Video => Boolean(v));
    }
}

export const editorService = new EditorService();
```

- [ ] **Step 3: Commit**

```bash
git add src/services/
git commit -m "port editorService and storageService to TypeScript"
```

---

### Task 4: Port application context (state management)

**Files:**
- Create: `src/context/ApplicationActionType.ts`
- Create: `src/context/initialApplicationState.ts`
- Create: `src/context/reducer.ts`
- Create: `src/context/index.tsx`

- [ ] **Step 1: Create ApplicationActionType**

`src/context/ApplicationActionType.ts`:
```ts
export const ApplicationActionType = {
    SET_HAS_LOADED: 'set-has-loaded',
    SET_MENU_OPEN: 'set-menu-open',
    SET_SELECTED_CONFIG: 'set-selected-config',
    SET_CURRENT_TRANSITION: 'set-current-transition',
    SET_VIDEO_STARTED: 'set-video-started',
    CALC_TILE_SIZE: 'set-tile-size',
    CALC_IS_MOBILE: 'set-is-mobile',
    CALC_IS_VIEWPORT_TOO_SMALL: 'set-is-viewport-too-small',
} as const;

export type ApplicationActionType = typeof ApplicationActionType[keyof typeof ApplicationActionType];
```

- [ ] **Step 2: Create initialApplicationState**

`src/context/initialApplicationState.ts`:
```ts
import type { TileSize } from '../helpers/getTileSize';
import { getTileSize } from '../helpers/getTileSize';
import { isMobile } from '../helpers/isMobile';
import { isViewportTooSmall } from '../helpers/isViewportTooSmall';
import { TransitionType } from '../enums/TransitionType';
import type { SelectedConfig } from '../services/editorService';

export interface ApplicationState {
    hasLoaded: boolean;
    isMenuOpen: boolean;
    selectedConfig: SelectedConfig | null;
    currentTransition: TransitionType;
    hasVideoStarted: boolean;
    tileSize: TileSize;
    isMobile: boolean;
    isViewPortTooSmall: boolean;
}

export const initialApplicationState: ApplicationState = {
    hasLoaded: false,
    isMenuOpen: false,
    selectedConfig: null,
    currentTransition: TransitionType.NONE,
    hasVideoStarted: false,
    tileSize: getTileSize(),
    isMobile: isMobile(),
    isViewPortTooSmall: isViewportTooSmall(),
};
```

- [ ] **Step 3: Create reducer**

`src/context/reducer.ts`:
```ts
import { useReducer } from 'react';
import { ApplicationActionType } from './ApplicationActionType';
import { getTileSize } from '../helpers/getTileSize';
import { isMobile } from '../helpers/isMobile';
import { isViewportTooSmall } from '../helpers/isViewportTooSmall';
import type { ApplicationState } from './initialApplicationState';
import { initialApplicationState } from './initialApplicationState';
import type { SelectedConfig } from '../services/editorService';
import type { TransitionType } from '../enums/TransitionType';

type ApplicationAction =
    | { type: typeof ApplicationActionType.SET_HAS_LOADED; payload: boolean }
    | { type: typeof ApplicationActionType.SET_MENU_OPEN; payload: boolean }
    | { type: typeof ApplicationActionType.SET_SELECTED_CONFIG; payload: SelectedConfig }
    | { type: typeof ApplicationActionType.SET_CURRENT_TRANSITION; payload: TransitionType }
    | { type: typeof ApplicationActionType.SET_VIDEO_STARTED; payload: boolean }
    | { type: typeof ApplicationActionType.CALC_TILE_SIZE }
    | { type: typeof ApplicationActionType.CALC_IS_MOBILE }
    | { type: typeof ApplicationActionType.CALC_IS_VIEWPORT_TOO_SMALL };

function reducer(state: ApplicationState, action: ApplicationAction): ApplicationState {
    switch (action.type) {
        case ApplicationActionType.SET_HAS_LOADED:
            return {
                ...state,
                hasLoaded: action.payload,
                isMenuOpen: !state.isMobile,
            };
        case ApplicationActionType.SET_MENU_OPEN:
            return {
                ...state,
                isMenuOpen: !state.isMobile || action.payload,
            };
        case ApplicationActionType.SET_SELECTED_CONFIG:
            return {
                ...state,
                isMenuOpen: state.isMobile ? false : state.hasLoaded,
                selectedConfig: action.payload,
            };
        case ApplicationActionType.SET_CURRENT_TRANSITION:
            return {
                ...state,
                currentTransition: action.payload,
            };
        case ApplicationActionType.SET_VIDEO_STARTED:
            return {
                ...state,
                hasVideoStarted: action.payload,
            };
        case ApplicationActionType.CALC_TILE_SIZE:
            return {
                ...state,
                tileSize: getTileSize(),
            };
        case ApplicationActionType.CALC_IS_MOBILE:
            return {
                ...state,
                isMobile: isMobile(),
            };
        case ApplicationActionType.CALC_IS_VIEWPORT_TOO_SMALL:
            return {
                ...state,
                isViewPortTooSmall: isViewportTooSmall(),
            };
        default:
            return state;
    }
}

export const useApplicationReducer = () => useReducer(reducer, initialApplicationState);
```

- [ ] **Step 4: Create context provider**

`src/context/index.tsx`:
```tsx
import { createContext, useContext, type ReactNode, type Dispatch } from 'react';
import { useApplicationReducer } from './reducer';
import type { ApplicationState } from './initialApplicationState';
import { initialApplicationState } from './initialApplicationState';

type ApplicationAction = Parameters<ReturnType<typeof useApplicationReducer>[1]>[0];

interface ApplicationContextValue {
    appState: ApplicationState;
    dispatch: Dispatch<ApplicationAction>;
}

const ApplicationContext = createContext<ApplicationContextValue | null>(null);

export const useApplicationContext = () => {
    const context = useContext(ApplicationContext);
    if (!context) throw new Error('useApplicationContext must be used within ApplicationProvider');
    return context;
};

export const ApplicationProvider = ({ children }: { children: ReactNode }) => {
    const [state, dispatch] = useApplicationReducer();

    return (
        <ApplicationContext.Provider value={{ appState: state, dispatch }}>
            {children}
        </ApplicationContext.Provider>
    );
};
```

- [ ] **Step 5: Commit**

```bash
git add src/context/
git commit -m "port application context and state management to TypeScript"
```

---

### Task 5: Port Player context

**Files:**
- Create: `src/components/Player/context/PlayerActionType.ts`
- Create: `src/components/Player/context/initialPlayerState.ts`
- Create: `src/components/Player/context/reducer.ts`
- Create: `src/components/Player/context/index.tsx`
- Create: `src/components/Player/helpers/getPlayer.ts`

- [ ] **Step 1: Create PlayerActionType**

`src/components/Player/context/PlayerActionType.ts`:
```ts
export const PlayerActionType = {
    PLAY: 'play',
    STOP: 'stop',
    ON_PLAY: 'on-play',
    ON_STOP: 'on-stop',
    SET_VIDEO: 'set-video',
    SET_PLAYLIST: 'set-playlist',
    SET_PLAYER_SIZE: 'set-player-size',
    SET_POSITION: 'set-position',
} as const;

export type PlayerActionType = typeof PlayerActionType[keyof typeof PlayerActionType];
```

- [ ] **Step 2: Create initialPlayerState**

`src/components/Player/context/initialPlayerState.ts`:
```ts
import type { Video } from '../../../types/video';
import type { Playlist } from '../../../types/playlist';
import type { TileSize } from '../../../helpers/getTileSize';

export interface PlayerState {
    shouldPlay: boolean;
    isPlaying: boolean;
    video: Video | null;
    playlist: Playlist | null;
    size: TileSize;
    position: { left: number; top: number };
}

export const initialPlayerState: PlayerState = {
    shouldPlay: false,
    isPlaying: false,
    video: null,
    playlist: null,
    size: { width: 640, height: 360 },
    position: { left: 0, top: 0 },
};
```

- [ ] **Step 3: Create player reducer**

`src/components/Player/context/reducer.ts`:
```ts
import { useReducer, type Dispatch } from 'react';
import { PlayerActionType } from './PlayerActionType';
import type { PlayerState } from './initialPlayerState';
import { initialPlayerState } from './initialPlayerState';
import type { Video } from '../../../types/video';
import type { Playlist } from '../../../types/playlist';
import type { TileSize } from '../../../helpers/getTileSize';

export type PlayerAction =
    | { type: typeof PlayerActionType.PLAY }
    | { type: typeof PlayerActionType.STOP }
    | { type: typeof PlayerActionType.ON_PLAY }
    | { type: typeof PlayerActionType.ON_STOP }
    | { type: typeof PlayerActionType.SET_VIDEO; payload: Video }
    | { type: typeof PlayerActionType.SET_PLAYLIST; payload: Playlist }
    | { type: typeof PlayerActionType.SET_PLAYER_SIZE; payload: TileSize }
    | { type: typeof PlayerActionType.SET_POSITION; payload: { left: number; top: number } };

function reducer(state: PlayerState, action: PlayerAction): PlayerState {
    switch (action.type) {
        case PlayerActionType.PLAY:
            return { ...state, shouldPlay: true };
        case PlayerActionType.STOP:
            return { ...state, shouldPlay: false };
        case PlayerActionType.ON_PLAY:
            return { ...state, shouldPlay: true, isPlaying: true };
        case PlayerActionType.ON_STOP:
            return { ...state, shouldPlay: false, isPlaying: false };
        case PlayerActionType.SET_VIDEO:
            return { ...state, shouldPlay: true, video: action.payload, playlist: null };
        case PlayerActionType.SET_PLAYLIST:
            return { ...state, shouldPlay: true, video: null, playlist: action.payload };
        case PlayerActionType.SET_PLAYER_SIZE:
            return { ...state, size: action.payload };
        case PlayerActionType.SET_POSITION:
            return { ...state, position: action.payload };
        default:
            return state;
    }
}

export type PlayerDispatch = Dispatch<PlayerAction>;

export const usePlayerReducer = () => useReducer(reducer, initialPlayerState);
```

- [ ] **Step 4: Create player context provider**

`src/components/Player/context/index.tsx`:
```tsx
import { createContext, useContext, type ReactNode } from 'react';
import { usePlayerReducer, type PlayerDispatch } from './reducer';
import type { PlayerState } from './initialPlayerState';
import { initialPlayerState } from './initialPlayerState';

interface PlayerContextValue {
    playerState: PlayerState;
    dispatch: PlayerDispatch;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

export const usePlayerContext = () => {
    const context = useContext(PlayerContext);
    if (!context) throw new Error('usePlayerContext must be used within PlayerProvider');
    return context;
};

export const PlayerProvider = ({ children }: { children: ReactNode }) => {
    const [state, dispatch] = usePlayerReducer();

    return (
        <PlayerContext.Provider value={{ playerState: state, dispatch }}>
            {children}
        </PlayerContext.Provider>
    );
};
```

- [ ] **Step 5: Create getPlayer helper**

`src/components/Player/helpers/getPlayer.ts`:
```ts
import { PlayerActionType } from '../context/PlayerActionType';
import type { PlayerDispatch } from '../context/reducer';

const POLL_INTERVAL = 50;
const ERR_RETRY_TIMEOUT = 5;

let player: YT.Player | null = null;

declare global {
    interface Window {
        YT: typeof YT;
        onYouTubeIframeAPIReady: (() => void) | undefined;
    }
}

export const getPlayer = (dispatch: PlayerDispatch): Promise<YT.Player> => {
    if (player) return Promise.resolve(player);

    if (!window.YT) {
        return new Promise(resolve =>
            setTimeout(() => resolve(getPlayer(dispatch)), POLL_INTERVAL),
        );
    }

    return new Promise(resolve => {
        window.YT.ready(() => {
            player = new window.YT.Player('youtube-player', {
                playerVars: { enablejsapi: 1 },
                events: {
                    onReady: () => resolve(player!),
                    onStateChange,
                    onError,
                },
            });

            let onErrorTimeoutId = 0;

            function onError(err: YT.OnErrorEvent) {
                console.warn(`Player error. Retry in ${ERR_RETRY_TIMEOUT} seconds.`, err);
                clearTimeout(onErrorTimeoutId);
                onErrorTimeoutId = window.setTimeout(() => {
                    dispatch({ type: PlayerActionType.STOP });
                    setTimeout(() => {
                        dispatch({ type: PlayerActionType.PLAY });
                    }, 500);
                }, ERR_RETRY_TIMEOUT * 1000);
            }

            function onStateChange(event: YT.OnStateChangeEvent) {
                switch (event.data) {
                    case window.YT?.PlayerState.ENDED:
                        dispatch({ type: PlayerActionType.ON_STOP });
                        break;
                    case window.YT?.PlayerState.PLAYING:
                        clearTimeout(onErrorTimeoutId);
                        dispatch({ type: PlayerActionType.ON_PLAY });
                        break;
                    case window.YT?.PlayerState.PAUSED:
                        dispatch({ type: PlayerActionType.ON_STOP });
                        break;
                    default:
                        break;
                }
            }
        });
    });
};
```

Note: You'll need YouTube IFrame API types. Install them:
```bash
npm install -D @types/youtube
```

- [ ] **Step 6: Commit**

```bash
git add src/components/Player/
git commit -m "port Player context and helpers to TypeScript"
```

---

### Task 6: Port leaf components (Image, Headline, LoadingMessage, BurgerIcon, Imprint)

**Files:**
- Create: `src/components/Image/Image.tsx`
- Create: `src/components/Headline/Headline.tsx`
- Create: `src/components/LoadingMessage/LoadingMessage.tsx`
- Create: `src/components/Navigation/components/BurgerIcon/BurgerIcon.tsx`
- Create: `src/components/Imprint/Imprint.tsx`

- [ ] **Step 1: Port Image component**

`src/components/Image/Image.tsx`:
```tsx
import { useEffect, useRef, useState } from 'react';

const IMAGE_LOADING_TIMEOUT = 5;

interface ImageProps {
    url: string;
    width: number;
    height: number;
    title: string;
    className?: string;
}

function Image({ url, width, height, title, className }: ImageProps) {
    const imageRef = useRef<HTMLImageElement>(null);
    const [src, setSrc] = useState('');
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        setLoaded(false);
        setSrc(url);
        const timeoutId = setTimeout(() => setLoaded(true), IMAGE_LOADING_TIMEOUT * 1000);
        return () => clearTimeout(timeoutId);
    }, [url]);

    return (
        <div
            className={`overflow-hidden bg-neutral-100 ${className ?? ''}`}
            style={{ width, height }}
        >
            {src && (
                <img
                    ref={imageRef}
                    src={src}
                    alt={title}
                    onLoad={() => setLoaded(true)}
                    className="object-cover transition-opacity duration-200"
                    style={{
                        width,
                        height,
                        opacity: loaded ? 1 : 0,
                        transition: loaded ? undefined : 'none',
                    }}
                />
            )}
        </div>
    );
}

export default Image;
```

- [ ] **Step 2: Port Headline**

`src/components/Headline/Headline.tsx`:
```tsx
function Headline() {
    return <>LIVE&nbsp;FROM&nbsp;BERLIN</>;
}

export default Headline;
```

- [ ] **Step 3: Port LoadingMessage**

`src/components/LoadingMessage/LoadingMessage.tsx`:
```tsx
import type { ReactNode } from 'react';

interface LoadingMessageProps {
    visible: boolean;
    children: ReactNode;
}

function LoadingMessage({ visible, children }: LoadingMessageProps) {
    return (
        <div
            className="absolute left-0 top-1/2 -translate-y-1/2 w-full px-8 box-border opacity-0"
            style={{
                animation: visible
                    ? 'is-loading 0.7s linear infinite alternate'
                    : 'fade-out 1s linear',
            }}
        >
            <h1 className="text-5xl text-center text-primary-light font-sans">
                {children}
            </h1>
        </div>
    );
}

export default LoadingMessage;
```

Note: The `is-loading` and `fade-out` keyframes need to be defined in `src/index.css`:
```css
@keyframes is-loading {
    0% { opacity: 0.3; }
    100% { opacity: 1; }
}

@keyframes fade-out {
    0% { opacity: 0.8; }
    100% { opacity: 0; }
}
```

- [ ] **Step 4: Port BurgerIcon**

`src/components/Navigation/components/BurgerIcon/BurgerIcon.tsx`:
```tsx
interface BurgerIconProps {
    showCancelIcon: boolean;
    strokeWidth?: number;
}

function BurgerIcon({ showCancelIcon, strokeWidth = 4 }: BurgerIconProps) {
    const classNames = ['BurgerIcon'];
    if (showCancelIcon) classNames.push('close');

    return (
        <div className="burger-icon-wrapper">
            <div className={classNames.join(' ')}>
                {Array.from({ length: 6 }).map((_, i) => (
                    <span key={i} style={{ height: `${strokeWidth}px` }} />
                ))}
            </div>
        </div>
    );
}

export default BurgerIcon;
```

Note: The BurgerIcon has complex CSS animations for the hamburger-to-X transition. These are best kept as a CSS file rather than Tailwind utilities. Create `src/components/Navigation/components/BurgerIcon/burger-icon.css` with the CSS from the original `StyledBurgerIcon.js`, replacing theme references with CSS variables. Import it in the component.

`src/components/Navigation/components/BurgerIcon/burger-icon.css`:
```css
.burger-icon-wrapper .BurgerIcon {
    position: relative;
    width: 35px;
    height: 26px;
    transition: transform 0.3s;
}

.burger-icon-wrapper .BurgerIcon span {
    opacity: 1;
    position: absolute;
    display: block;
    width: 55%;
    transition: 0.25s ease;
    transform: rotate(0deg);
    background-color: var(--color-primary-light);
}

.burger-icon-wrapper .BurgerIcon span:nth-of-type(even) { left: 50%; }
.burger-icon-wrapper .BurgerIcon span:nth-of-type(odd) { left: 0; }
.burger-icon-wrapper .BurgerIcon span:nth-of-type(1),
.burger-icon-wrapper .BurgerIcon span:nth-of-type(2) { top: 0; }
.burger-icon-wrapper .BurgerIcon span:nth-of-type(3),
.burger-icon-wrapper .BurgerIcon span:nth-of-type(4) { top: 10px; }
.burger-icon-wrapper .BurgerIcon span:nth-of-type(5),
.burger-icon-wrapper .BurgerIcon span:nth-of-type(6) { top: 20px; }

.burger-icon-wrapper .BurgerIcon.close span:nth-of-type(1),
.burger-icon-wrapper .BurgerIcon.close span:nth-of-type(6) { transform: rotate(45deg); }
.burger-icon-wrapper .BurgerIcon.close span:nth-of-type(2),
.burger-icon-wrapper .BurgerIcon.close span:nth-of-type(5) { transform: rotate(-45deg); }
.burger-icon-wrapper .BurgerIcon.close span:nth-of-type(1) { top: 4px; left: 3px; }
.burger-icon-wrapper .BurgerIcon.close span:nth-of-type(2) { top: 4px; left: calc(50% - 3px); }
.burger-icon-wrapper .BurgerIcon.close span:nth-of-type(3) { opacity: 0; left: -50%; }
.burger-icon-wrapper .BurgerIcon.close span:nth-of-type(4) { opacity: 0; left: 100%; }
.burger-icon-wrapper .BurgerIcon.close span:nth-of-type(5) { top: 16px; left: 3px; }
.burger-icon-wrapper .BurgerIcon.close span:nth-of-type(6) { top: 16px; left: calc(50% - 3px); }
```

Update the BurgerIcon component to import the CSS:
```tsx
import './burger-icon.css';
```

- [ ] **Step 5: Port Imprint**

`src/components/Imprint/Imprint.tsx`:
```tsx
import { useEffect, useRef } from 'react';
import { isMobile } from '../../helpers/isMobile';

interface ImprintProps {
    open: boolean;
    onClose: () => void;
}

function Imprint({ open, onClose }: ImprintProps) {
    const dialogRef = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        if (open) {
            dialogRef.current?.showModal();
        } else {
            dialogRef.current?.close();
        }
    }, [open]);

    return (
        <dialog
            ref={dialogRef}
            onClose={onClose}
            onClick={(e) => { if (e.target === dialogRef.current) onClose(); }}
            className="backdrop:bg-black/50 bg-white rounded shadow-lg p-8 whitespace-pre-line"
            style={{
                width: 'min(600px, 80vw)',
                maxHeight: isMobile() ? '50vh' : '90vh',
            }}
        >
            <h2 className="text-xl font-sans mb-4">Imprint</h2>
            <div className="font-sans">
                {getImprintText()}
            </div>
        </dialog>
    );
}

function getImprintText(): string {
    // Copy the full imprint text from the old project's getImprintText.js
    // This is a long legal text string — port it verbatim
    return 'TODO: copy imprint text from old project';
}

export default Imprint;
```

Note: Copy the full `getImprintText()` body from `/Users/simonmeyer/glencoden/berta-berlin/src/components/Imprint/helpers/getImprintText.js`. It contains legal text that must be preserved exactly.

- [ ] **Step 6: Commit**

```bash
git add src/components/Image/ src/components/Headline/ src/components/LoadingMessage/ src/components/Navigation/components/BurgerIcon/ src/components/Imprint/
git commit -m "port leaf components to TypeScript with Tailwind"
```

---

### Task 7: Port Lane sub-components (Tile, TileSwitch, VideoDetail, PlayerOverlay)

**Files:**
- Create: `src/components/Lane/helpers/mapItemToTile.ts`
- Create: `src/components/Lane/helpers/getMaxThumbnail.ts`
- Create: `src/components/Lane/helpers/getNumRenderedTiles.ts`
- Create: `src/components/Lane/hooks/useParsedDescription.ts`
- Create: `src/components/Lane/components/Tile/Tile.tsx`
- Create: `src/components/Lane/components/TileSwitch/TileSwitch.tsx`
- Create: `src/components/Lane/components/TileSwitch/TileSwitchMobile.tsx`
- Create: `src/components/Lane/components/VideoDetail/VideoDetail.tsx`
- Create: `src/components/Lane/components/PlayerOverlay/PlayerOverlay.tsx`

- [ ] **Step 1: Port Lane helpers**

`src/components/Lane/helpers/getMaxThumbnail.ts`:
```ts
import type { Thumbnails, Thumbnail } from '../../../types/video';

const decreasingSizeOrderKeys: (keyof Thumbnails)[] = ['maxres', 'standard', 'high', 'medium', 'default'];

export const getMaxThumbnail = (thumbnails: Thumbnails | undefined): Thumbnail | null => {
    if (!thumbnails) return null;
    for (const key of decreasingSizeOrderKeys) {
        const result = thumbnails[key];
        if (result) return result;
    }
    return null;
};
```

`src/components/Lane/helpers/mapItemToTile.ts`:
```ts
import type { Video } from '../../../types/video';
import { getMaxThumbnail } from './getMaxThumbnail';

export interface TileData {
    key: string;
    url: string;
    title: string;
}

export const mapItemToTile = (item: Video): TileData => {
    const thumbnail = getMaxThumbnail(item.thumbnails);
    return {
        key: item.renderKey ?? item.id,
        url: thumbnail?.url ?? '',
        title: item.title,
    };
};
```

`src/components/Lane/helpers/getNumRenderedTiles.ts`:
```ts
import type { TileSize } from '../../../helpers/getTileSize';
import { defaultTileWidth, laneLeft, laneTileOffset, minNumRenderedTiles } from '../../../variables';

export const getNumRenderedTiles = (tileSize: TileSize): number => {
    if (tileSize.width < defaultTileWidth) {
        return minNumRenderedTiles;
    }
    const remainingSpace = window.innerWidth - laneLeft - defaultTileWidth;
    return Math.max(Math.ceil(remainingSpace / laneTileOffset), minNumRenderedTiles);
};
```

`src/components/Lane/hooks/useParsedDescription.ts`:
```ts
import { useEffect, useState } from 'react';
import type { Video } from '../../../types/video';

interface ParsedDescription {
    titleRepeat: string;
    detail: string;
    rest: string[];
}

export const useParsedDescription = (item: Video | null | undefined): ParsedDescription => {
    const [parsedDescription, setParsedDescription] = useState<ParsedDescription>({
        titleRepeat: '',
        detail: '',
        rest: [],
    });

    useEffect(() => {
        if (!item) return;
        const split = item.description.split('\n\n');
        const titleStart = item.title.split('-')[0];
        split.splice(split.findIndex(part => part.split('-')[0] === titleStart), 1);
        const detail = split.shift() ?? '';
        setParsedDescription({ titleRepeat: '', detail, rest: split });
    }, [item]);

    return parsedDescription;
};
```

- [ ] **Step 2: Port Tile component**

`src/components/Lane/components/Tile/Tile.tsx`:
```tsx
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { hideTileSafetyOffset, laneLeft, laneTileSlideInDelay } from '../../../../variables';
import { useApplicationContext } from '../../../../context';
import { TransitionType } from '../../../../enums/TransitionType';

interface TileProps {
    hide: boolean;
    position: string;
    transform: number;
    zIndex: number;
    delay: number;
    setActive: () => void;
    observer: IntersectionObserver | null;
    children: ReactNode;
}

function Tile({ hide, position, transform, zIndex, delay, setActive, observer, children }: TileProps) {
    const { appState } = useApplicationContext();

    const [showTile, setShowTile] = useState(false);
    const [delayOnMount, setDelayOnMount] = useState(delay + laneTileSlideInDelay);

    const timeoutIdRef = useRef(0);
    const tileElement = useRef<HTMLDivElement>(null);

    useEffect(() => setDelayOnMount(0), []);

    useEffect(() => {
        timeoutIdRef.current = window.setTimeout(
            () => setShowTile(!hide),
            hide ? delay : delayOnMount,
        );
        return () => clearTimeout(timeoutIdRef.current);
    }, [hide]);

    useEffect(() => {
        if (!tileElement.current || !observer) return;
        const el = tileElement.current;
        observer.observe(el);
        return () => observer.unobserve(el);
    }, [observer]);

    const hideTransform = !hide && appState.currentTransition === TransitionType.NONE
        ? 0
        : -(appState.tileSize.width + laneLeft + hideTileSafetyOffset);

    return (
        <div
            data-position={position}
            ref={tileElement}
            onClick={setActive}
            className="absolute left-0 top-0 shadow-lg transition-transform duration-300"
            style={{
                width: appState.tileSize.width,
                height: appState.tileSize.height,
                zIndex,
                transform: `translateX(${showTile ? transform : hideTransform}px)`,
            }}
        >
            {children}
        </div>
    );
}

export default Tile;
```

- [ ] **Step 3: Port TileSwitch and TileSwitchMobile**

`src/components/Lane/components/TileSwitch/TileSwitch.tsx`:
```tsx
import { useApplicationContext } from '../../../../context';
import { laneTop, progressBarWidth } from '../../../../variables';

interface TileSwitchProps {
    onPrev: () => void;
    onNext: () => void;
    numTiles: number | undefined;
    activeIndex: number;
    visible: boolean;
}

function TileSwitch({ onPrev, onNext, numTiles, activeIndex, visible }: TileSwitchProps) {
    const { appState } = useApplicationContext();

    if (numTiles === undefined || isNaN(numTiles)) return null;

    const progressPercent = 100 / (numTiles - 1) * activeIndex;
    const indicatorX = progressBarWidth * (progressPercent / 100);

    return (
        <div
            className="flex absolute transition-opacity duration-300"
            style={{
                left: appState.tileSize.width / 2,
                top: -(laneTop / 2),
                transform: 'translateX(-50%)',
                opacity: visible ? 1 : 0,
            }}
        >
            <button onClick={onPrev} className="p-2 text-primary hover:opacity-70">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
                </svg>
            </button>

            <div className="relative mx-4" style={{ width: progressBarWidth }}>
                <div
                    className="absolute top-1/2 -translate-y-1/2 h-1 bg-primary shadow"
                    style={{ width: progressBarWidth }}
                />
                <div
                    className="absolute top-1/2 w-3 h-3 bg-primary shadow rotate-45 transition-transform duration-300"
                    style={{ transform: `translate(${indicatorX}px, -50%) rotate(45deg)` }}
                />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary">
                    {activeIndex + 1} / {numTiles}
                </div>
            </div>

            <button onClick={onNext} className="p-2 text-primary hover:opacity-70">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                </svg>
            </button>
        </div>
    );
}

export default TileSwitch;
```

`src/components/Lane/components/TileSwitch/TileSwitchMobile.tsx`:
```tsx
import { navigationMargin } from '../../../../variables';

interface TileSwitchMobileProps {
    onPrev: () => void;
    onNext: () => void;
    numTiles: number | undefined;
}

function TileSwitchMobile({ onPrev, onNext, numTiles }: TileSwitchMobileProps) {
    if (numTiles === undefined || isNaN(numTiles)) return null;

    return (
        <>
            <div
                className="fixed z-[10000] top-1/2 -translate-y-1/2"
                style={{ left: `${navigationMargin}rem` }}
            >
                <button onClick={onPrev} className="p-3 rounded-full bg-purple-900/50">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                        <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
                    </svg>
                </button>
            </div>
            <div
                className="fixed z-[10000] top-1/2 -translate-y-1/2"
                style={{ right: `${navigationMargin}rem` }}
            >
                <button onClick={onNext} className="p-3 rounded-full bg-purple-900/50">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                        <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                    </svg>
                </button>
            </div>
        </>
    );
}

export default TileSwitchMobile;
```

- [ ] **Step 4: Port VideoDetail**

`src/components/Lane/components/VideoDetail/VideoDetail.tsx`:
```tsx
import { useParsedDescription } from '../../hooks/useParsedDescription';
import { useApplicationContext } from '../../../../context';
import { controlsMargin, controlsOverlayWidth } from '../../../../variables';
import type { Video } from '../../../../types/video';

function parseLinks(str: string): string {
    const urlRegex = /(https?:\/\/.[^\s]+)/g;
    const urls = str.match(urlRegex) || [];
    let result = str;
    urls.forEach(url => {
        result = result.replace(url, `<a href='${url}' rel='noopener noreferrer' target='_blank' class='text-secondary no-underline'>${url}</a>`);
    });
    return result;
}

interface VideoDetailProps {
    activeItem: Video | null;
    visible: boolean;
}

function VideoDetail({ activeItem, visible }: VideoDetailProps) {
    const { appState } = useApplicationContext();
    const parsedDescription = useParsedDescription(activeItem);

    return (
        <div
            className="scrollbar-hidden absolute right-0 top-0 whitespace-pre-line box-border text-primary bg-white overflow-scroll transition-all duration-300"
            style={{
                width: appState.tileSize.width * (100 - controlsOverlayWidth) / 100,
                height: appState.tileSize.height,
                padding: `${controlsMargin}rem`,
                opacity: visible ? 1 : 0,
                transform: `translateY(${appState.hasVideoStarted ? '100%' : '0'})`,
            }}
        >
            {parsedDescription.rest.map((part, index) => (
                <p
                    key={index}
                    className="font-sans"
                    style={{ paddingBottom: `${controlsMargin}rem` }}
                    dangerouslySetInnerHTML={{ __html: parseLinks(part) }}
                />
            ))}
        </div>
    );
}

export default VideoDetail;
```

- [ ] **Step 5: Port PlayerOverlay**

`src/components/Lane/components/PlayerOverlay/PlayerOverlay.tsx`:
```tsx
import { useCallback, useEffect } from 'react';
import { PlayerActionType } from '../../../Player/context/PlayerActionType';
import { usePlayerContext } from '../../../Player/context';
import { useParsedDescription } from '../../hooks/useParsedDescription';
import { useApplicationContext } from '../../../../context';
import { ApplicationActionType } from '../../../../context/ApplicationActionType';
import { storageService } from '../../../../services/storageService';
import { controlsMargin, controlsOverlayWidth } from '../../../../variables';
import { isMobile } from '../../../../helpers/isMobile';
import type { Video } from '../../../../types/video';

interface PlayerOverlayProps {
    activeItem: Video | null;
    visible: boolean;
}

function PlayerOverlay({ activeItem, visible }: PlayerOverlayProps) {
    const { appState, dispatch: appDispatch } = useApplicationContext();
    const { playerState, dispatch: playerDispatch } = usePlayerContext();
    const parsedDescription = useParsedDescription(activeItem);

    useEffect(() => {
        playerDispatch({
            type: PlayerActionType.SET_PLAYER_SIZE,
            payload: appState.tileSize,
        });
    }, [appState.tileSize, playerDispatch]);

    const onPlay = useCallback(() => {
        if (!activeItem) return;
        storageService.setSeenVideoIds(activeItem);
        storageService.setRecentlyWatchedGenres(activeItem);
        playerDispatch({ type: PlayerActionType.SET_VIDEO, payload: activeItem });
    }, [appState.selectedConfig, activeItem, playerDispatch]);

    const onPause = useCallback(() => {
        playerDispatch({ type: PlayerActionType.STOP });
    }, [playerDispatch]);

    useEffect(() => {
        if (activeItem === null) return;
        appDispatch({ type: ApplicationActionType.SET_VIDEO_STARTED, payload: false });
        onPause();
    }, [activeItem, onPause, appDispatch]);

    useEffect(() => {
        if (!playerState.isPlaying) return;
        appDispatch({ type: ApplicationActionType.SET_VIDEO_STARTED, payload: true });
    }, [playerState.isPlaying, appDispatch]);

    if (!activeItem) return null;

    const isVideoLoading = playerState.shouldPlay !== playerState.isPlaying;
    const rightTileAreaWidth = appState.tileSize.width - (appState.tileSize.width * controlsOverlayWidth / 100);

    return (
        <div
            className="absolute left-0 top-0 transition-all duration-300"
            style={{
                width: appState.tileSize.width,
                height: appState.tileSize.height,
                opacity: visible ? 1 : 0,
                ...(appState.hasVideoStarted ? {
                    transform: `translateY(${isMobile() ? 150 : 100}%)`,
                    pointerEvents: 'none' as const,
                } : {}),
            }}
        >
            <div
                className="absolute left-0 top-0 h-full bg-black overflow-scroll box-border"
                style={{
                    width: `${controlsOverlayWidth}%`,
                    paddingBottom: `calc(${controlsMargin}rem + 42px)`,
                }}
            >
                <h4 className="text-2xl text-white font-sans" style={{ padding: `${controlsMargin}rem` }}>
                    {activeItem.title}
                </h4>
                <h6 className="text-lg text-white font-sans" style={{ padding: `0 ${controlsMargin}rem` }}>
                    {parsedDescription.detail}
                </h6>
            </div>

            <div
                className="absolute top-1/2"
                style={{
                    right: rightTileAreaWidth / 2,
                    transform: 'translate(50%, -50%)',
                }}
            >
                {!appState.hasVideoStarted && (
                    <button
                        className="text-2xl font-sans bg-primary text-white px-6 py-3 rounded shadow-lg hover:opacity-90"
                        onClick={(isVideoLoading || playerState.isPlaying) ? onPause : onPlay}
                    >
                        {isVideoLoading ? (
                            <span className="inline-block w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <>&#9658;</>
                        )}
                        &nbsp;Play
                    </button>
                )}
            </div>
        </div>
    );
}

export default PlayerOverlay;
```

- [ ] **Step 6: Commit**

```bash
git add src/components/Lane/
git commit -m "port Lane sub-components (Tile, TileSwitch, VideoDetail, PlayerOverlay) to TypeScript"
```

---

### Task 8: Port Lane component

**Files:**
- Create: `src/components/Lane/Lane.tsx`

- [ ] **Step 1: Port Lane**

`src/components/Lane/Lane.tsx`:
```tsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Player from '../Player/Player';
import PlayerOverlay from './components/PlayerOverlay/PlayerOverlay';
import { mapItemToTile } from './helpers/mapItemToTile';
import { laneTileAnimationOffset, laneTileOffset, laneLeft, laneTop, sidebarWidth, mobileContentMargin } from '../../variables';
import Image from '../Image/Image';
import Tile from './components/Tile/Tile';
import VideoDetail from './components/VideoDetail/VideoDetail';
import TileSwitch from './components/TileSwitch/TileSwitch';
import TileSwitchMobile from './components/TileSwitch/TileSwitchMobile';
import { editorService } from '../../services/editorService';
import { useApplicationContext } from '../../context';
import { ApplicationActionType } from '../../context/ApplicationActionType';
import { TransitionType } from '../../enums/TransitionType';
import { getNumRenderedTiles } from './helpers/getNumRenderedTiles';
import { isMobile } from '../../helpers/isMobile';
import type { Video } from '../../types/video';

const TilePosition = {
    INTERMEDIATE: 'intermediate',
    FIRST: 'first',
    LAST: 'last',
} as const;

interface LaneProps {
    isPlaylistsLoading: boolean;
}

function Lane({ isPlaylistsLoading }: LaneProps) {
    const { appState, dispatch } = useApplicationContext();

    const [items, setItems] = useState<Video[] | null>(null);
    const [activeIndex, setActiveIndex] = useState(0);

    const onSelectPrev = useCallback(() => {
        if (appState.currentTransition !== TransitionType.NONE) return;
        setActiveIndex(prev => Math.max(prev - 1, 0));
    }, [appState.currentTransition]);

    const onSelectNext = useCallback(() => {
        if (appState.currentTransition !== TransitionType.NONE) return;
        setActiveIndex(prev => Math.min(prev + 1, (items?.length ?? 1) - 1));
    }, [appState.currentTransition, items]);

    const activeItem = items?.[activeIndex] ?? null;

    const tiles = items
        ?.slice(0, activeIndex + getNumRenderedTiles(appState.tileSize))
        .map(mapItemToTile);

    const transitionTypeRef = useRef(appState.currentTransition);
    const isEmptyListRef = useRef(false);

    useEffect(() => {
        if (appState.selectedConfig === null) return;
        transitionTypeRef.current = appState.currentTransition;

        switch (appState.currentTransition) {
            case TransitionType.NONE:
                break;
            case TransitionType.SLIDE_OUT:
                if (isEmptyListRef.current) {
                    dispatch({ type: ApplicationActionType.SET_CURRENT_TRANSITION, payload: TransitionType.SLIDE_IN });
                }
                break;
            case TransitionType.SLIDE_IN: {
                setActiveIndex(0);
                const updatedItems = editorService.getVideos(appState.selectedConfig);
                isEmptyListRef.current = updatedItems.length === 0;
                setItems(updatedItems.length === 0 ? null : updatedItems);
                break;
            }
            case TransitionType.INSERT: {
                const insertVideo = editorService.getInsertVideo();
                setItems(prevItems => {
                    if (insertVideo === null) return prevItems;
                    if (prevItems === null) return [insertVideo];
                    const currentItemList = [...prevItems];
                    const insertVideoIndex = currentItemList.findIndex(item => item.id === insertVideo.id);
                    if (insertVideoIndex > -1) currentItemList.splice(insertVideoIndex, 1);
                    setActiveIndex(0);
                    return [insertVideo, ...currentItemList];
                });
                setTimeout(() => {
                    dispatch({ type: ApplicationActionType.SET_CURRENT_TRANSITION, payload: TransitionType.NONE });
                }, 0);
                break;
            }
        }
    }, [appState.selectedConfig, appState.currentTransition, dispatch]);

    useEffect(() => {
        const onKeydown = (event: KeyboardEvent) => {
            if (event.key === 'ArrowLeft') onSelectPrev();
            else if (event.key === 'ArrowRight') onSelectNext();
        };
        window.addEventListener('keydown', onKeydown);
        return () => window.removeEventListener('keydown', onKeydown);
    }, [onSelectPrev, onSelectNext]);

    const tileObserver = useMemo(() => {
        if (typeof IntersectionObserver === 'undefined') return null;
        return new IntersectionObserver(
            entries => {
                entries.forEach(entry => {
                    if (
                        entry.isIntersecting
                        && (entry.target as HTMLElement).dataset.position === TilePosition.FIRST
                        && transitionTypeRef.current === TransitionType.SLIDE_IN
                    ) {
                        dispatch({ type: ApplicationActionType.SET_CURRENT_TRANSITION, payload: TransitionType.NONE });
                        dispatch({ type: ApplicationActionType.SET_HAS_LOADED, payload: true });
                    } else if (
                        !entry.isIntersecting
                        && (entry.target as HTMLElement).dataset.position === TilePosition.LAST
                        && transitionTypeRef.current === TransitionType.SLIDE_OUT
                    ) {
                        dispatch({ type: ApplicationActionType.SET_CURRENT_TRANSITION, payload: TransitionType.SLIDE_IN });
                    }
                });
            },
            { rootMargin: '0px' },
        );
    }, [dispatch]);

    const showTiles = appState.currentTransition !== TransitionType.SLIDE_OUT;
    const showControls = appState.currentTransition === TransitionType.NONE;
    const mobile = isMobile();

    return (
        <>
            {mobile && (
                <TileSwitchMobile onPrev={onSelectPrev} onNext={onSelectNext} numTiles={tiles?.length} />
            )}
            <div
                className="transition-transform duration-300"
                style={{
                    position: mobile ? 'fixed' : 'absolute',
                    left: mobile ? sidebarWidth + mobileContentMargin : laneLeft,
                    top: mobile ? mobileContentMargin : laneTop,
                    width: appState.tileSize.width,
                    height: 2 * appState.tileSize.height,
                    transform: `translateY(${appState.isMenuOpen ? `${laneTop / 2}px` : '0'})`,
                }}
            >
                <div
                    className="absolute"
                    style={{
                        left: -(mobile ? sidebarWidth + mobileContentMargin : laneLeft),
                        top: appState.tileSize.height / 2,
                        width: appState.tileSize.width / 3,
                        height: appState.tileSize.width / 3,
                        backgroundColor: 'var(--color-primary)',
                        transformOrigin: '0 0',
                        rotate: '45deg',
                        translate: isPlaylistsLoading ? '-200% 0' : '0 0',
                        animation: !isPlaylistsLoading ? 'slide-in 1s' : 'none',
                    }}
                />
                <div
                    className="absolute bg-white"
                    style={{
                        left: -(mobile ? sidebarWidth + mobileContentMargin : laneLeft),
                        top: 0,
                        width: sidebarWidth + 3,
                        height: 2 * appState.tileSize.height,
                    }}
                />

                {!mobile && (
                    <TileSwitch
                        onPrev={onSelectPrev}
                        onNext={onSelectNext}
                        numTiles={items?.length}
                        activeIndex={activeIndex}
                        visible={showControls}
                    />
                )}

                {tiles?.map((tile, index) => {
                    const displayIndex = index - activeIndex;
                    const hideTile = !showTiles || displayIndex < 0;
                    const position = index === 0 ? TilePosition.FIRST : index === (tiles.length - 1) ? TilePosition.LAST : TilePosition.INTERMEDIATE;
                    const transform = displayIndex * laneTileOffset;
                    const zIndex = tiles.length - displayIndex;
                    const delay = (hideTile ? displayIndex : (tiles.length - 1 - index)) * laneTileAnimationOffset;

                    return (
                        <Tile
                            key={tile.key}
                            hide={hideTile}
                            position={position}
                            transform={transform}
                            zIndex={zIndex}
                            delay={delay}
                            setActive={() => setActiveIndex(index)}
                            observer={tileObserver}
                        >
                            <Image
                                url={tile.url}
                                width={appState.tileSize.width}
                                height={appState.tileSize.height}
                                title={tile.title}
                            />
                        </Tile>
                    );
                })}

                <div style={{ zIndex: (tiles?.length ?? 0) - 1 }}>
                    <VideoDetail activeItem={activeItem} visible={showControls} />
                </div>

                <div className="relative transition-opacity duration-200" style={{
                    zIndex: (tiles?.length ?? 0) + 1,
                    opacity: appState.hasVideoStarted ? 1 : 0,
                }}>
                    <Player hasVideoStarted={appState.hasVideoStarted} />
                </div>

                <div style={{ zIndex: (tiles?.length ?? 0) + 2 }}>
                    <PlayerOverlay activeItem={activeItem} visible={showControls} />
                </div>
            </div>
        </>
    );
}

export default Lane;
```

- [ ] **Step 2: Add slide-in keyframe to index.css**

Append to `src/index.css`:
```css
@keyframes slide-in {
    0% { translate: -200% 0; }
    100% { translate: 0 0; }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/Lane/ src/index.css
git commit -m "port Lane component to TypeScript with Tailwind"
```

---

### Task 9: Port Player component

**Files:**
- Create: `src/components/Player/Player.tsx`

- [ ] **Step 1: Port Player**

`src/components/Player/Player.tsx`:
```tsx
import { useEffect, useRef, useState } from 'react';
import { getPlayer } from './helpers/getPlayer';
import { usePlayerContext } from './context';

let PLAYER_INITIATED = false;

interface PlayerProps {
    hasVideoStarted: boolean;
}

function Player({ hasVideoStarted }: PlayerProps) {
    const { playerState, dispatch } = usePlayerContext();
    const [player, setPlayer] = useState<YT.Player | null>(null);
    const playerElement = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (PLAYER_INITIATED) return;
        PLAYER_INITIATED = true;

        const playerScript = document.createElement('script');
        playerScript.src = 'https://www.youtube.com/iframe_api';
        document.body.appendChild(playerScript);

        getPlayer(dispatch).then(setPlayer);
    }, [dispatch]);

    useEffect(() => {
        if (!player) return;
        playerState.shouldPlay ? player.playVideo() : player.pauseVideo();
    }, [playerState.shouldPlay, player]);

    useEffect(() => {
        if (!playerState.video || !player) return;
        player.loadVideoById(playerState.video.id);
    }, [playerState.video, player]);

    useEffect(() => {
        if (!playerState.playlist || !player) return;
        player.loadPlaylist({ listType: 'playlist', list: playerState.playlist.id });
    }, [playerState.playlist, player]);

    useEffect(() => {
        if (!player) return;
        player.setSize(playerState.size.width, playerState.size.height);
    }, [playerState.size, player]);

    return (
        <div
            className="transition-opacity duration-200"
            style={{ opacity: hasVideoStarted ? 1 : 0 }}
        >
            <div id="youtube-player" ref={playerElement} />
        </div>
    );
}

export default Player;
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Player/Player.tsx
git commit -m "port Player component to TypeScript"
```

---

### Task 10: Port Navigation component

**Files:**
- Create: `src/components/Navigation/helpers/getMenuItems.ts`
- Create: `src/components/Navigation/helpers/getPlaylistSubmenuItems.ts`
- Create: `src/components/Navigation/helpers/parseMenuItem.ts`
- Create: `src/components/Navigation/components/NavigationTitle/NavigationTitle.tsx`
- Create: `src/components/Navigation/components/DashboardMenu/DashboardMenu.tsx`
- Create: `src/components/Search/SimpleSearch.tsx`
- Create: `src/components/Navigation/Navigation.tsx`

- [ ] **Step 1: Port Navigation helpers**

`src/components/Navigation/helpers/getPlaylistSubmenuItems.ts`:
```ts
import type { Playlist } from '../../../types/playlist';

export interface SubmenuItem {
    label: string;
    value: string;
}

export const getPlaylistSubmenuItems = (playlists: Playlist[]): SubmenuItem[] => {
    return playlists.map(playlist => ({
        label: playlist.title,
        value: playlist.id,
    }));
};
```

`src/components/Navigation/helpers/getMenuItems.ts`:
```ts
import { FilterType } from '../../../enums/FilterType';
import { MenuItemType } from '../../../enums/MenuItemType';
import { getPlaylistSubmenuItems, type SubmenuItem } from './getPlaylistSubmenuItems';
import { editorService } from '../../../services/editorService';

export interface MenuItem {
    type: MenuItemType;
    label: string;
    value: string | null;
    options?: SubmenuItem[];
}

export const getMenuItems = (): MenuItem[] => {
    const playlists = editorService.getPlaylists();
    if (playlists === null) return [];

    return [
        { type: MenuItemType.FILTER, label: FilterType.RECENT, value: FilterType.RECENT },
        { type: MenuItemType.FILTER, label: FilterType.POPULAR, value: FilterType.POPULAR },
        { type: MenuItemType.FILTER, label: FilterType.TRENDING, value: FilterType.TRENDING },
        { type: MenuItemType.DASHBOARD, label: 'playlists', value: null, options: getPlaylistSubmenuItems(playlists) },
    ];
};
```

`src/components/Navigation/helpers/parseMenuItem.ts`:
```ts
import { MenuItemType } from '../../../enums/MenuItemType';
import { ResourceType } from '../../../enums/ResourceType';
import { FilterType } from '../../../enums/FilterType';
import type { SelectedConfig } from '../../../services/editorService';
import type { MenuItem } from './getMenuItems';

export const parseMenuItem = (menuItem: MenuItem & { value: unknown }): SelectedConfig => {
    switch (menuItem.type) {
        case MenuItemType.FILTER:
            return {
                filterType: menuItem.value as FilterType,
                resourceType: ResourceType.VIDEO,
                selectedPlaylistId: null,
            };
        case MenuItemType.DASHBOARD:
            return {
                filterType: FilterType.POPULAR,
                resourceType: ResourceType.PLAYLIST,
                selectedPlaylistId: (menuItem.value as { value?: string } | null)?.value ?? null,
            };
        default:
            console.warn('unknown menu item type');
            return { filterType: FilterType.TRENDING, resourceType: ResourceType.VIDEO, selectedPlaylistId: null };
    }
};
```

- [ ] **Step 2: Port NavigationTitle**

`src/components/Navigation/components/NavigationTitle/NavigationTitle.tsx`:
```tsx
import Headline from '../../../Headline/Headline';
import { useApplicationContext } from '../../../../context';
import { fullDeviceWidth, laneLeft, navigationMargin } from '../../../../variables';

function NavigationTitle() {
    const { appState } = useApplicationContext();

    return (
        <div
            className="absolute transition-transform duration-300"
            style={{
                right: window.innerWidth >= fullDeviceWidth ? laneLeft : `${navigationMargin}rem`,
                top: `${navigationMargin}rem`,
                transform: appState.isMenuOpen ? 'none' : `translate(0, calc(-${navigationMargin}rem - 100%))`,
            }}
        >
            <h1 className="text-4xl text-secondary font-sans">
                <Headline />
            </h1>
        </div>
    );
}

export default NavigationTitle;
```

- [ ] **Step 3: Port DashboardMenu**

`src/components/Navigation/components/DashboardMenu/DashboardMenu.tsx`:
```tsx
import { useState, useRef, useEffect, type ReactNode } from 'react';
import { useApplicationContext } from '../../../../context';
import { ApplicationActionType } from '../../../../context/ApplicationActionType';
import type { MenuItem } from '../../helpers/getMenuItems';
import type { SubmenuItem } from '../../helpers/getPlaylistSubmenuItems';

interface DashboardMenuProps {
    menuItem: MenuItem;
    options: SubmenuItem[];
    selectedOptionValue: string | undefined;
    onMenuItemClick: (menuItem: MenuItem & { value: unknown }) => void;
    children: ReactNode;
}

function DashboardMenu({ menuItem, options, selectedOptionValue, onMenuItemClick, children }: DashboardMenuProps) {
    const { dispatch } = useApplicationContext();
    const [open, setOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        if (open) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [open]);

    const handleClose = (selectedOption: SubmenuItem | null) => {
        if (selectedOption === null) {
            dispatch({ type: ApplicationActionType.SET_MENU_OPEN, payload: false });
            setOpen(false);
            return;
        }
        onMenuItemClick({ ...menuItem, value: selectedOption });
        setOpen(false);
    };

    return (
        <div className="inline-block mr-[2rem] relative" ref={menuRef}>
            <button
                className={`font-sans text-lg px-4 py-1 ${selectedOptionValue ? 'border border-primary rounded' : ''}`}
                onClick={() => setOpen(!open)}
            >
                {children}
            </button>
            {open && (
                <div className="absolute left-0 top-full bg-white shadow-lg rounded mt-1 z-50 min-w-[200px]">
                    {options.map((item, index) => (
                        <button
                            key={`${item.label}${index}`}
                            className={`block w-full text-left font-sans text-base px-4 py-2 hover:bg-neutral-100 ${item.value === selectedOptionValue ? 'bg-neutral-200' : ''}`}
                            onClick={() => handleClose(item)}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

export default DashboardMenu;
```

- [ ] **Step 4: Port SimpleSearch**

`src/components/Search/SimpleSearch.tsx`:
```tsx
import { useMemo, useState, useRef, useEffect } from 'react';
import { editorService } from '../../services/editorService';
import { useApplicationContext } from '../../context';
import { ApplicationActionType } from '../../context/ApplicationActionType';
import { TransitionType } from '../../enums/TransitionType';
import { isMobile } from '../../helpers/isMobile';

interface SearchOption {
    label: string;
    id: string;
    description: string;
}

function SimpleSearch() {
    const { dispatch } = useApplicationContext();
    const [searchActive, setSearchActive] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [filteredOptions, setFilteredOptions] = useState<SearchOption[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);

    const options = useMemo(() => {
        const completeVideoList = editorService.getAllVideos();
        return (completeVideoList ?? []).map(entry => ({
            label: entry.title,
            id: entry.id,
            description: entry.description,
        }));
    }, []);

    useEffect(() => {
        if (searchActive && inputRef.current) inputRef.current.focus();
    }, [searchActive]);

    useEffect(() => {
        if (!inputValue) {
            setFilteredOptions([]);
            return;
        }
        const query = inputValue.toLowerCase();
        setFilteredOptions(
            options.filter(o =>
                o.label.toLowerCase().includes(query) || o.description.toLowerCase().includes(query),
            ).slice(0, 10),
        );
    }, [inputValue, options]);

    const handleSelect = (option: SearchOption) => {
        editorService.setInsertVideo(option.id);
        dispatch({ type: ApplicationActionType.SET_CURRENT_TRANSITION, payload: TransitionType.INSERT });
        if (isMobile()) {
            dispatch({ type: ApplicationActionType.SET_MENU_OPEN, payload: false });
        }
        setSearchActive(false);
        setInputValue('');
    };

    if (!searchActive) {
        return (
            <button className="font-sans text-lg px-4 py-1 flex items-center gap-2" onClick={() => setSearchActive(true)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                </svg>
                search
            </button>
        );
    }

    return (
        <div className="inline-block relative" style={{ width: isMobile() ? 180 : 240 }}>
            <input
                ref={inputRef}
                type="text"
                className="w-full font-sans text-base border border-neutral-300 rounded px-3 py-1.5 outline-none focus:border-primary"
                placeholder="search"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onBlur={() => setTimeout(() => { setSearchActive(false); setInputValue(''); }, 200)}
                onKeyDown={e => { if (e.key === 'Escape') { setSearchActive(false); setInputValue(''); }}}
            />
            {filteredOptions.length > 0 && (
                <div className="absolute left-0 top-full w-full bg-white shadow-lg rounded mt-1 z-50 max-h-60 overflow-y-auto">
                    {filteredOptions.map(option => (
                        <button
                            key={option.id}
                            className="block w-full text-left font-sans text-sm px-3 py-2 hover:bg-neutral-100 truncate"
                            onMouseDown={() => handleSelect(option)}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

export default SimpleSearch;
```

- [ ] **Step 5: Port Navigation**

`src/components/Navigation/Navigation.tsx`:
```tsx
import { useQueryParam } from 'use-query-params';
import { useCallback, useEffect, useState } from 'react';
import BurgerIcon from './components/BurgerIcon/BurgerIcon';
import Image from '../Image/Image';
import { UrlState } from '../../enums/UrlState';
import { getMenuItems, type MenuItem } from './helpers/getMenuItems';
import { MenuItemType } from '../../enums/MenuItemType';
import { FilterType } from '../../enums/FilterType';
import DashboardMenu from './components/DashboardMenu/DashboardMenu';
import Imprint from '../Imprint/Imprint';
import NavigationTitle from './components/NavigationTitle/NavigationTitle';
import { useApplicationContext } from '../../context';
import { ApplicationActionType } from '../../context/ApplicationActionType';
import { parseMenuItem } from './helpers/parseMenuItem';
import { ResourceType } from '../../enums/ResourceType';
import { TransitionType } from '../../enums/TransitionType';
import { PlayerActionType } from '../Player/context/PlayerActionType';
import { usePlayerContext } from '../Player/context';
import SimpleSearch from '../Search/SimpleSearch';
import { laneLeft, navigationMargin, navigationZIndex, sidebarWidth } from '../../variables';
import { isMobile } from '../../helpers/isMobile';

function Navigation() {
    const { appState, dispatch: appDispatch } = useApplicationContext();
    const { dispatch: playerDispatch } = usePlayerContext();

    const [menuItems] = useState(() => getMenuItems());
    const [isImprintOpen, setIsImprintOpen] = useState(false);

    const [filter, setFilter] = useQueryParam(UrlState.FILTER);
    const [playlist, setPlaylist] = useQueryParam(UrlState.PLAYLIST);

    useEffect(() => {
        const filterType = (filter as FilterType) || FilterType.RECENT;
        setFilter(filterType);
        appDispatch({
            type: ApplicationActionType.SET_SELECTED_CONFIG,
            payload: {
                filterType,
                resourceType: !playlist ? ResourceType.VIDEO : ResourceType.PLAYLIST,
                selectedPlaylistId: (playlist as string) ?? null,
            },
        });
    }, [filter, playlist]);

    const onMenuItemClick = useCallback((menuItem: MenuItem & { value: unknown }) => {
        const config = parseMenuItem(menuItem);
        setFilter(config.filterType);
        setPlaylist(config.selectedPlaylistId);
        playerDispatch({ type: PlayerActionType.STOP });
        appDispatch({ type: ApplicationActionType.SET_VIDEO_STARTED, payload: false });
        appDispatch({ type: ApplicationActionType.SET_SELECTED_CONFIG, payload: config });
        appDispatch({ type: ApplicationActionType.SET_CURRENT_TRANSITION, payload: TransitionType.SLIDE_OUT });
    }, [appDispatch, playerDispatch, setFilter, setPlaylist]);

    const mobile = isMobile();

    return (
        <>
            {!mobile && <NavigationTitle />}

            <div
                className="absolute bg-white transition-transform duration-300"
                style={{
                    left: laneLeft,
                    top: `${navigationMargin}rem`,
                    zIndex: navigationZIndex,
                    transform: `translateX(${appState.isMenuOpen ? '0' : `calc(-100% - ${2 * laneLeft}px)`})`,
                }}
            >
                {menuItems.map((menuItem, index) => {
                    switch (menuItem.type) {
                        case MenuItemType.FILTER:
                            return (
                                <button
                                    key={index}
                                    className={`font-sans text-lg px-4 py-1 mr-[2rem] ${!playlist && menuItem.value === filter ? 'border border-primary rounded' : ''}`}
                                    onClick={() => onMenuItemClick(menuItem)}
                                >
                                    {menuItem.label}
                                </button>
                            );
                        case MenuItemType.DASHBOARD:
                            return (
                                <DashboardMenu
                                    key={index}
                                    menuItem={menuItem}
                                    options={menuItem.options ?? []}
                                    selectedOptionValue={playlist as string | undefined}
                                    onMenuItemClick={onMenuItemClick}
                                >
                                    {menuItem.label}
                                </DashboardMenu>
                            );
                        default:
                            return <div key={index}>unknown menu item type</div>;
                    }
                })}
                <SimpleSearch />
            </div>

            <div
                className="fixed left-0 top-0 bg-primary"
                style={{
                    width: sidebarWidth,
                    height: mobile ? window.innerHeight : '100vh',
                    zIndex: navigationZIndex,
                    animation: `sidebar-slide-in 0.3s ease`,
                }}
            >
                {mobile && (
                    <button
                        className="absolute left-1/2 -translate-x-1/2"
                        style={{ top: `${navigationMargin}rem` }}
                        onClick={() => {
                            window.scroll(0, 0);
                            appDispatch({ type: ApplicationActionType.SET_MENU_OPEN, payload: !appState.isMenuOpen });
                        }}
                    >
                        <BurgerIcon showCancelIcon={appState.isMenuOpen} />
                    </button>
                )}
                <button
                    className="absolute left-1/2 -translate-x-1/2"
                    style={{ bottom: `${navigationMargin}rem` }}
                    onClick={() => setIsImprintOpen(true)}
                    title="imprint"
                >
                    <div className="relative w-12 h-12 rounded overflow-hidden">
                        <Image
                            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                            url="/bertaberlin_logo_2023_black.svg"
                            width={96}
                            height={96}
                            title="berta berlin icon"
                        />
                    </div>
                </button>
            </div>

            <Imprint open={isImprintOpen} onClose={() => setIsImprintOpen(false)} />
        </>
    );
}

export default Navigation;
```

- [ ] **Step 6: Add sidebar slide-in keyframe to index.css**

```css
@keyframes sidebar-slide-in {
    0% { transform: translateX(-80px); }
    100% { transform: translateX(0); }
}
```

- [ ] **Step 7: Commit**

```bash
git add src/components/Navigation/ src/components/Search/ src/index.css
git commit -m "port Navigation, DashboardMenu, SimpleSearch to TypeScript with Tailwind"
```

---

### Task 11: Wire up App.tsx and main.tsx

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/main.tsx`

- [ ] **Step 1: Write App.tsx**

`src/App.tsx`:
```tsx
import { useEffect, useState } from 'react';
import { PlayerProvider } from './components/Player/context';
import Lane from './components/Lane/Lane';
import Navigation from './components/Navigation/Navigation';
import { minDeviceWidth } from './variables';
import LoadingMessage from './components/LoadingMessage/LoadingMessage';
import Headline from './components/Headline/Headline';
import { useApplicationContext } from './context';
import { ApplicationActionType } from './context/ApplicationActionType';
import { TransitionType } from './enums/TransitionType';
import { editorService } from './services/editorService';
import { videos, playlists, externalVideos } from './data';
import { QueryParamProvider } from 'use-query-params';

function App() {
    if (import.meta.env.PROD) {
        const currentLocation = window.location.href;
        if (currentLocation.startsWith('http://')) {
            window.location.href = currentLocation.replace('http://', 'https://');
        }
    }

    const { appState, dispatch } = useApplicationContext();

    const [isVideosLoading, setIsVideosLoading] = useState(true);
    const [isPlaylistsLoading, setIsPlaylistsLoading] = useState(true);

    useEffect(() => {
        editorService.setVideos(videos);
        setIsVideosLoading(false);

        dispatch({
            type: ApplicationActionType.SET_CURRENT_TRANSITION,
            payload: TransitionType.SLIDE_IN,
        });

        editorService.setPlaylists(playlists);
        editorService.setExternalVideos(externalVideos);
        setIsPlaylistsLoading(false);

        let debounceTimeoutId: number;
        const onResize = () => {
            clearTimeout(debounceTimeoutId);
            debounceTimeoutId = window.setTimeout(() => {
                dispatch({ type: ApplicationActionType.CALC_TILE_SIZE });
                dispatch({ type: ApplicationActionType.CALC_IS_MOBILE });
                dispatch({ type: ApplicationActionType.CALC_IS_VIEWPORT_TOO_SMALL });
            }, 200);
        };

        const onOrientationChange = () => window.location.reload();

        window.addEventListener('resize', onResize);
        window.addEventListener('orientationchange', onOrientationChange);

        return () => {
            window.removeEventListener('resize', onResize);
            window.removeEventListener('orientationchange', onOrientationChange);
        };
    }, [dispatch]);

    return (
        <QueryParamProvider>
            <PlayerProvider>
                {appState.isViewPortTooSmall ? (
                    <LoadingMessage visible>
                        <>Please turn device or view on a larger screen<br />(min width {minDeviceWidth}px)</>
                    </LoadingMessage>
                ) : (
                    <>
                        <LoadingMessage visible={isPlaylistsLoading}>
                            <Headline />
                        </LoadingMessage>

                        {!isPlaylistsLoading && <Navigation />}

                        {!isVideosLoading && <Lane isPlaylistsLoading={isPlaylistsLoading} />}
                    </>
                )}
            </PlayerProvider>
        </QueryParamProvider>
    );
}

export default App;
```

Note: The key change here is that instead of async fetching via `requestService`, we directly import the data from `src/data/` and load it synchronously into `editorService`. The loading states could even be removed, but we keep them for the same transition behavior.

- [ ] **Step 2: Write main.tsx**

`src/main.tsx`:
```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { ApplicationProvider } from './context';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root')!);

root.render(
    <React.StrictMode>
        <ApplicationProvider>
            <App />
        </ApplicationProvider>
    </React.StrictMode>,
);

console.log(
    '%cglencoden - berta-berlin-website v2.0.0',
    'font-size: 1rem; padding: 1rem; margin: 1rem 0; border-radius: 0.5rem; color: white; background: linear-gradient(#E66465, #9198E5);',
);
```

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx src/main.tsx
git commit -m "wire up App and main with static data imports"
```

---

### Task 12: Integration test

- [ ] **Step 1: Build data (if not already available)**

```bash
BERTA_YOUTUBE_API_KEY=<key> npm run build:data
```

- [ ] **Step 2: Run dev server**

```bash
npm run dev
```

Test all features:
- Videos display in the lane with correct thumbnails
- Arrow keys and buttons navigate between tiles
- Filter buttons (Recent, Popular, Trending) switch video lists
- Playlists submenu works
- Search finds videos by title/description
- Player plays selected video
- Imprint modal opens and closes
- Mobile responsive layout (resize browser)

- [ ] **Step 3: Fix any issues**

Address TypeScript errors, styling mismatches, missing functionality, or broken interactions.

- [ ] **Step 4: Run production build**

```bash
npm run build:full
npm run preview
```

Verify the production build works correctly.

- [ ] **Step 5: Commit fixes**

```bash
git add -A
git commit -m "fix integration issues from testing"
```
