# berta-berlin-website — Design Spec

## Goal

Combine the **berta-berlin** React frontend and the **berta-bot** YouTube scraper into a single, self-contained project. The app is built and deployed once daily via a scheduled GitHub Actions workflow. YouTube data is fetched at build time and baked into the static output — no runtime server required.

## Tech Stack

- **Vite + React 18 + TypeScript** — SPA framework
- **Tailwind CSS** — replaces Material UI
- **googleapis** npm package — YouTube Data API v3 (latest)
- **tsx** — runs TypeScript build scripts in Node
- **GitHub Actions** — scheduled daily builds, deployment

## Project Structure

```
berta-berlin-website/
├── src/
│   ├── app/                  # React entry, providers, layout
│   ├── components/           # Lane, Player, Navigation, Search, Imprint
│   ├── context/              # App state (reducer + context), player context
│   ├── services/             # editorService, storageService
│   ├── types/                # Shared TypeScript types
│   ├── enums/                # FilterType, MenuItemType, etc.
│   └── data/                 # Build-generated JSON (gitignored)
│       ├── video.json
│       ├── playlist.json
│       └── external-video.json
├── scripts/
│   ├── fetch-youtube-data.ts # YouTube API fetcher (ported from berta-bot)
│   ├── compute-trends.ts     # Trend/popularity/gain calculation
│   └── build-data.ts         # Orchestrator: fetch -> compute -> write to src/data/
├── data/
│   └── trend-history.json    # Committed trend snapshots (persistent across builds)
├── .github/
│   └── workflows/
│       ├── deploy-live.yml   # Daily scheduled build + SFTP deploy (main)
│       └── deploy-preview.yml # Push-triggered GitHub Pages deploy (develop)
├── index.html
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── tsconfig.scripts.json     # Separate tsconfig for build scripts (Node target)
└── package.json
```

## Data Pipeline (build-time)

The data pipeline runs as a pre-build step (`scripts/build-data.ts`) before `vite build`.

### Step 1: Fetch YouTube Data

Ported from berta-bot's `getYoutubeData.js`. Uses the `googleapis` npm package (YouTube Data API v3).

- **Channel**: `UCz74WCGrXmY3On0l96NNaVA` (Berta Berlin)
- **Resources fetched**:
  - Videos: channel videos (excluding Shorts < 60s), with statistics, metadata, duration
  - Playlists: all channel playlists, filtered by `berta.berlin` in description
  - External videos: videos referenced in playlists but not from the channel
- **Pagination**: follows `nextPageToken` to fetch all results
- **API key**: `BERTA_YOUTUBE_API_KEY` (GitHub Actions secret)

The tracking/analytics resource from berta-bot is dropped — not needed without a persistent server.

### Step 2: Compute Trends

Ported from berta-bot's `prepareVideoDataForStorage.js`.

- Reads `data/trend-history.json` (committed to repo, persists across builds)
- Appends new snapshot with current statistics
- Computes for each video:
  - **popularity**: `(viewCount * 0.7) + (likeCount * 0.3 * makeupWeight)`
  - **trend**: change in popularity vs. previous periods (1000 = neutral baseline)
  - **gain**: popularity increase over last period
- Maintains up to 56 historical snapshots at 14-day intervals
- Writes updated history back to `data/trend-history.json`

### Step 3: Write Output

Writes processed data to `src/data/`:
- `video.json` — videos with computed popularity/trend/gain (no internal trendStatistics)
- `playlist.json` — playlists with associated video IDs
- `external-video.json` — external videos with computed metrics

These files are gitignored and regenerated on every build. The app imports them as static JSON.

## React App

### Feature Set (identical to current berta-berlin)

- **Lane**: horizontal scrolling carousel of video tiles, lazy-loaded
- **Filters**: Popular (by viewCount/likeCount/commentCount), Trending (by trend + gain), Recent (by publishedAt)
- **Playlists**: dashboard of curated playlists
- **Search**: autocomplete search across video titles and descriptions
- **Player**: embedded YouTube player with overlay details and progress tracking
- **Genre recommendations**: ~10% of results match recently watched genres (localStorage)
- **Watched tracking**: localStorage tracks seen video IDs, filters them from results
- **Responsive**: mobile detection, viewport-based tile sizing (600px–1440px+)

### Key Changes from Current App

- **No requestService** — data is `import`ed directly from `src/data/*.json`
- **MUI replaced by Tailwind** — all components restyled with utility classes
- **JavaScript ported to TypeScript** — full type coverage
- **Same state management** — Context + useReducer, same reducer shape and action types

### Core Types

```typescript
interface Video {
  id: string;
  title: string;
  description: string;
  publishedAt: string;
  thumbnails: Thumbnails;
  tags: string[];
  duration: string;
  statistics: VideoStatistics;
  popularity: number;
  trend: number;
  gain: number;
}

interface VideoStatistics {
  viewCount: number;
  likeCount: number;
  commentCount: number;
  favoriteCount: number;
}

interface Thumbnails {
  default: Thumbnail;
  medium: Thumbnail;
  high: Thumbnail;
  standard?: Thumbnail;
  maxres?: Thumbnail;
}

interface Thumbnail {
  url: string;
  width: number;
  height: number;
}

interface Playlist {
  id: string;
  title: string;
  description: string;
  thumbnails: Thumbnails;
  publishedAt: string;
  videoIds: string[];
}
```

## CI/CD — GitHub Actions

### deploy-live.yml (main branch)

```yaml
on:
  schedule:
    - cron: '0 6 * * *'  # daily at 6am UTC
  workflow_dispatch:        # manual trigger

steps:
  - checkout with full history
  - setup Node.js
  - npm ci
  - run scripts/build-data.ts (env: BERTA_YOUTUBE_API_KEY)
  - commit & push updated data/trend-history.json
  - vite build
  - SFTP deploy to access800891440.webspace-data.io
```

### deploy-preview.yml (develop branch)

```yaml
on:
  push:
    branches: [develop]
  workflow_dispatch:

steps:
  - checkout with full history
  - setup Node.js
  - npm ci
  - run scripts/build-data.ts (env: BERTA_YOUTUBE_API_KEY)
  - vite build (with base path for GitHub Pages)
  - deploy to GitHub Pages
```

## Migration Phases

### Phase 1: Project Scaffolding
Vite + React + TypeScript + Tailwind setup, directory structure, tsconfig files, package.json with all dependencies.

### Phase 2: Data Pipeline
Port berta-bot scraper to TypeScript. Implement fetch-youtube-data, compute-trends, and build-data orchestrator. Seed initial trend-history.json from existing berta-bot data if available.

### Phase 3: React App
Port all components from JavaScript to TypeScript. Replace MUI with Tailwind. Replace requestService with static JSON imports. Preserve all existing features and behavior.

### Phase 4: CI/CD
GitHub Actions workflows for daily scheduled build, SFTP deployment (prod), GitHub Pages deployment (preview), and trend-history commit-back.
