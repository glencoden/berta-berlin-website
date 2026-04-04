# Phase 1: Project Scaffolding — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up the Vite + React + TypeScript + Tailwind project with all configuration, shared types, enums, constants, and the base app shell.

**Architecture:** A Vite-based React SPA with TypeScript. Tailwind CSS replaces Material UI. The project uses two tsconfigs — one for the browser app, one for Node build scripts. The app reads baked-in JSON data at runtime (placeholder data for now).

**Tech Stack:** Vite 6, React 18, TypeScript 5, Tailwind CSS 4, tsx (for build scripts)

---

### Task 1: Initialize Vite + React + TypeScript project

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `tsconfig.scripts.json`
- Create: `.gitignore`

- [ ] **Step 1: Scaffold Vite project**

Run from the parent directory:
```bash
cd /Users/simonmeyer/glencoden/berta-berlin-website
npm create vite@latest . -- --template react-ts
```

This overwrites the existing directory — the spec file is already committed so it's safe.

- [ ] **Step 2: Install dependencies**

```bash
npm install
```

- [ ] **Step 3: Verify the app runs**

```bash
npm run dev
```

Expected: Vite dev server starts, default React template renders.

- [ ] **Step 4: Clean up template files**

Remove the default template content:
- Delete `src/App.css`
- Delete `src/assets/react.svg`
- Delete `public/vite.svg`
- Clear `src/App.tsx` to a minimal placeholder:

```tsx
function App() {
    return <div>berta-berlin-website</div>;
}

export default App;
```

- Clear `src/index.css` to empty for now.

- [ ] **Step 5: Create tsconfig.scripts.json for Node build scripts**

```json
{
    "compilerOptions": {
        "target": "ES2022",
        "module": "ES2022",
        "moduleResolution": "bundler",
        "esModuleInterop": true,
        "strict": true,
        "skipLibCheck": true,
        "outDir": "./dist-scripts",
        "rootDir": "./scripts",
        "types": ["node"]
    },
    "include": ["scripts/**/*.ts"]
}
```

- [ ] **Step 6: Update .gitignore**

Add these entries to `.gitignore`:
```
src/data/video.json
src/data/playlist.json
src/data/external-video.json
dist-scripts/
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "scaffold Vite + React + TypeScript project"
```

---

### Task 2: Set up Tailwind CSS

**Files:**
- Modify: `package.json`
- Modify: `src/index.css`
- Modify: `vite.config.ts`

- [ ] **Step 1: Install Tailwind CSS v4**

```bash
npm install tailwindcss @tailwindcss/vite
```

- [ ] **Step 2: Add Tailwind plugin to vite.config.ts**

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
    plugins: [
        react(),
        tailwindcss(),
    ],
});
```

- [ ] **Step 3: Import Tailwind in src/index.css**

```css
@import "tailwindcss";
```

- [ ] **Step 4: Add the BebasNeue font**

Copy `src/fonts/BebasNeue-Regular.ttf` from the old project (`/Users/simonmeyer/glencoden/berta-berlin/src/fonts/`) to `src/fonts/` in the new project.

Add to `src/index.css`:
```css
@import "tailwindcss";

@font-face {
    font-family: BebasNeue;
    src: url("./fonts/BebasNeue-Regular.ttf");
}

@theme {
    --font-sans: "BebasNeue", sans-serif;
    --color-primary: #FF8C1A;
    --color-primary-light: #FFB366;
    --color-secondary: #FFC426;
}

@media only screen and (max-width: 900px) {
    :root {
        font-size: 13px;
    }
}

body {
    width: 100vw;
    overflow-x: hidden;
    margin: 0;
    font-size: 16px;
    font-family: BebasNeue, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
}

.scrollbar-hidden::-webkit-scrollbar {
    display: none;
}

.scrollbar-hidden {
    -ms-overflow-style: none;
    scrollbar-width: none;
}
```

- [ ] **Step 5: Verify Tailwind works**

Update `src/App.tsx` to use a Tailwind class:
```tsx
function App() {
    return <div className="text-primary text-4xl p-8">berta-berlin-website</div>;
}

export default App;
```

Run `npm run dev` and verify the text is orange (#FF8C1A) and large.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "add Tailwind CSS v4 with BebasNeue font and theme colors"
```

---

### Task 3: Define shared TypeScript types and enums

**Files:**
- Create: `src/types/video.ts`
- Create: `src/types/playlist.ts`
- Create: `src/types/data.ts`
- Create: `src/enums/FilterType.ts`
- Create: `src/enums/MenuItemType.ts`
- Create: `src/enums/ResourceType.ts`
- Create: `src/enums/TransitionType.ts`
- Create: `src/enums/UrlState.ts`

- [ ] **Step 1: Create type definitions**

`src/types/video.ts`:
```ts
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
```

Note: `viewCount`, `likeCount`, etc. are strings from the YouTube API (they arrive as strings in the existing berta-bot code, and `parseInt` is used when computing metrics). We keep them as strings in the Video type to match the API, and the build scripts parse them to numbers when computing trends.

`src/types/playlist.ts`:
```ts
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
```

`src/types/data.ts`:
```ts
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
```

- [ ] **Step 2: Create enum files**

`src/enums/FilterType.ts`:
```ts
export const FilterType = {
    POPULAR: 'popular',
    TRENDING: 'trending',
    RECENT: 'recent',
} as const;

export type FilterType = typeof FilterType[keyof typeof FilterType];
```

`src/enums/MenuItemType.ts`:
```ts
export const MenuItemType = {
    FILTER: 'filter',
    DASHBOARD: 'dashboard',
} as const;

export type MenuItemType = typeof MenuItemType[keyof typeof MenuItemType];
```

`src/enums/ResourceType.ts`:
```ts
export const ResourceType = {
    VIDEO: 'video',
    PLAYLIST: 'playlist',
    EXTERNAL_VIDEO: 'external-video',
} as const;

export type ResourceType = typeof ResourceType[keyof typeof ResourceType];
```

`src/enums/TransitionType.ts`:
```ts
export const TransitionType = {
    NONE: 'none',
    SLIDE_OUT: 'slide-out',
    SLIDE_IN: 'slide-in',
    INSERT: 'insert',
} as const;

export type TransitionType = typeof TransitionType[keyof typeof TransitionType];
```

`src/enums/UrlState.ts`:
```ts
export const UrlState = {
    FILTER: 'filter',
    PLAYLIST: 'playlist',
} as const;

export type UrlState = typeof UrlState[keyof typeof UrlState];
```

- [ ] **Step 3: Commit**

```bash
git add src/types/ src/enums/
git commit -m "add shared TypeScript types and enums"
```

---

### Task 4: Create variables/constants file

**Files:**
- Create: `src/variables.ts`

- [ ] **Step 1: Port variables from the old project**

`src/variables.ts`:
```ts
export const appVersion = '2.0.0';

export const validGenres = ['Jazz', 'Pop', 'Rock', 'Electronic', 'HipHop', 'World'];
export const minNumRenderedTiles = 3;

export const playlistFilterKey = 'berta.berlin';
export const maxVideoListLength = Infinity;
export const genreQuotaPercentage = 10;

export const minNumUnseenVideos = 50;
export const genreListStaleTime = 1000 * 60 * 60 * 24 * 7;

export const defaultTileWidth = 1280;
export const minDeviceWidth = 600;
export const fullDeviceWidth = 1440;
export const maxMobileWidth = 900;
export const mobileContentMargin = 14;

export const navigationMargin = 2;
export const navigationZIndex = 1000;
export const sidebarWidth = 80;

export const laneLeft = 110;
export const laneTop = 110;
export const laneTileOffset = 50;
export const hideTileSafetyOffset = 50;

export const progressBarWidth = 274;

export const controlsMargin = 2;
export const controlsOverlayWidth = 38;

export const laneTileSlideInDelay = 200;
export const laneTileAnimationOffset = 50;
```

- [ ] **Step 2: Commit**

```bash
git add src/variables.ts
git commit -m "add application constants and variables"
```

---

### Task 5: Create placeholder data files and data loading

**Files:**
- Create: `src/data/video.json`
- Create: `src/data/playlist.json`
- Create: `src/data/external-video.json`
- Create: `src/data/index.ts`

- [ ] **Step 1: Create placeholder JSON files**

`src/data/video.json`:
```json
{
    "updatedAt": 0,
    "count": 0,
    "videos": []
}
```

`src/data/playlist.json`:
```json
{
    "updatedAt": 0,
    "count": 0,
    "playlists": []
}
```

`src/data/external-video.json`:
```json
{
    "updatedAt": 0,
    "count": 0,
    "videos": []
}
```

- [ ] **Step 2: Create data loading module**

`src/data/index.ts`:
```ts
import type { VideoData, PlaylistData } from '../types/data';
import videoData from './video.json';
import playlistData from './playlist.json';
import externalVideoData from './external-video.json';

export const videos = (videoData as VideoData).videos;
export const playlists = (playlistData as PlaylistData).playlists;
export const externalVideos = (externalVideoData as VideoData).videos;
```

- [ ] **Step 3: Enable JSON imports in tsconfig.json**

Ensure `tsconfig.json` has `"resolveJsonModule": true` in `compilerOptions` (Vite's React-TS template should include this by default — verify and add if missing).

- [ ] **Step 4: Commit**

```bash
git add src/data/
git commit -m "add placeholder data files and data loading module"
```

---

### Task 6: Create data directory and initial trend history

**Files:**
- Create: `data/trend-history.json`

- [ ] **Step 1: Create the persistent data directory with initial file**

`data/trend-history.json`:
```json
{
    "updatedAt": 0,
    "videos": {}
}
```

- [ ] **Step 2: Commit**

```bash
git add data/
git commit -m "add initial trend history data file"
```

---

### Task 7: Copy static assets

**Files:**
- Copy: `public/bertaberlin_logo_2023_black.svg` (from old project)
- Copy: `public/logo192.png` (from old project)
- Copy: `public/logo512.png` (from old project)
- Modify: `index.html`

- [ ] **Step 1: Copy assets from old project**

```bash
cp /Users/simonmeyer/glencoden/berta-berlin/public/bertaberlin_logo_2023_black.svg /Users/simonmeyer/glencoden/berta-berlin-website/public/
cp /Users/simonmeyer/glencoden/berta-berlin/public/logo192.png /Users/simonmeyer/glencoden/berta-berlin-website/public/
cp /Users/simonmeyer/glencoden/berta-berlin/public/logo512.png /Users/simonmeyer/glencoden/berta-berlin-website/public/
```

- [ ] **Step 2: Update index.html**

Update `index.html` to set the page title and favicon:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/bertaberlin_logo_2023_black.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>BERTA BERLIN - Live From Berlin</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 3: Commit**

```bash
git add public/ index.html
git commit -m "add static assets and update index.html"
```

---

### Task 8: Verify full build works

- [ ] **Step 1: Run production build**

```bash
npm run build
```

Expected: Build succeeds, `dist/` directory is created.

- [ ] **Step 2: Preview the build**

```bash
npm run preview
```

Expected: App loads in browser showing the placeholder text with Tailwind styling.

- [ ] **Step 3: Commit any remaining changes**

If any files need adjustment to pass the build, fix them and commit:
```bash
git add -A
git commit -m "verify production build works"
```
