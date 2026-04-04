import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import type { PlayerState } from './initialPlayerState';
import { initialPlayerState } from './initialPlayerState';
import type { PlayerAction, PlayerDispatch } from './reducer';
import { usePlayerReducer } from './reducer';

interface PlayerContextValue {
    state: PlayerState;
    dispatch: PlayerDispatch;
}

const PlayerContext = createContext<PlayerContextValue>({
    state: initialPlayerState,
    dispatch: (() => undefined) as React.Dispatch<PlayerAction>,
});

export const usePlayerContext = (): PlayerContextValue => useContext(PlayerContext);

export function PlayerProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = usePlayerReducer();
    return (
        <PlayerContext.Provider value={{ state, dispatch }}>
            {children}
        </PlayerContext.Provider>
    );
}
