import type { Video } from '../../../types/video';
import type { Playlist } from '../../../types/playlist';
import type { TileSize } from '../../../helpers/getTileSize';

export interface PlayerPosition {
    top: number;
    left: number;
}

export interface PlayerState {
    shouldPlay: boolean;
    isPlaying: boolean;
    video: Video | null;
    playlist: Playlist | null;
    size: TileSize;
    position: PlayerPosition;
}

export const initialPlayerState: PlayerState = {
    shouldPlay: false,
    isPlaying: false,
    video: null,
    playlist: null,
    size: { width: 0, height: 0 },
    position: { top: 0, left: 0 },
};
