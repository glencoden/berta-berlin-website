import { useReducer } from 'react';
import type { PlayerState } from './initialPlayerState';
import { initialPlayerState } from './initialPlayerState';
import { PlayerActionType } from './PlayerActionType';
import type { Video } from '../../../types/video';
import type { Playlist } from '../../../types/playlist';
import type { TileSize } from '../../../helpers/getTileSize';
import type { PlayerPosition } from './initialPlayerState';

export type PlayerAction =
    | { type: typeof PlayerActionType.PLAY }
    | { type: typeof PlayerActionType.STOP }
    | { type: typeof PlayerActionType.ON_PLAY }
    | { type: typeof PlayerActionType.ON_STOP }
    | { type: typeof PlayerActionType.SET_VIDEO; payload: Video | null }
    | { type: typeof PlayerActionType.SET_PLAYLIST; payload: Playlist | null }
    | { type: typeof PlayerActionType.SET_SIZE; payload: TileSize }
    | { type: typeof PlayerActionType.SET_POSITION; payload: PlayerPosition };

function playerReducer(state: PlayerState, action: PlayerAction): PlayerState {
    switch (action.type) {
        case PlayerActionType.PLAY:
            return { ...state, shouldPlay: true };
        case PlayerActionType.STOP:
            return { ...state, shouldPlay: false };
        case PlayerActionType.ON_PLAY:
            return { ...state, isPlaying: true };
        case PlayerActionType.ON_STOP:
            return { ...state, isPlaying: false };
        case PlayerActionType.SET_VIDEO:
            return { ...state, video: action.payload };
        case PlayerActionType.SET_PLAYLIST:
            return { ...state, playlist: action.payload };
        case PlayerActionType.SET_SIZE:
            return { ...state, size: action.payload };
        case PlayerActionType.SET_POSITION:
            return { ...state, position: action.payload };
        default:
            return state;
    }
}

export const usePlayerReducer = () => useReducer(playerReducer, initialPlayerState);

export type PlayerDispatch = React.Dispatch<PlayerAction>;
