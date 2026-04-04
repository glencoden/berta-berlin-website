import { PlayerActionType } from '../context/PlayerActionType';
import type { PlayerDispatch } from '../context/reducer';

declare global {
    interface Window {
        YT: typeof YT;
        onYouTubeIframeAPIReady: (() => void) | undefined;
    }
}

const POLL_INTERVAL = 100;
const ERROR_RETRY_DELAY = 5000;

export function getPlayer(
    elementId: string,
    videoId: string,
    dispatch: PlayerDispatch,
): Promise<YT.Player> {
    return new Promise((resolve) => {
        const tryCreate = () => {
            if (typeof window.YT === 'undefined' || typeof window.YT.Player === 'undefined') {
                setTimeout(tryCreate, POLL_INTERVAL);
                return;
            }

            const player = new window.YT.Player(elementId, {
                videoId,
                playerVars: {
                    autoplay: 0,
                    controls: 0,
                    modestbranding: 1,
                    rel: 0,
                    showinfo: 0,
                    iv_load_policy: 3,
                    playsinline: 1,
                },
                events: {
                    onReady: () => resolve(player),
                    onStateChange: (event: YT.OnStateChangeEvent) => {
                        switch (event.data) {
                            case YT.PlayerState.ENDED:
                                dispatch({ type: PlayerActionType.ON_STOP });
                                break;
                            case YT.PlayerState.PLAYING:
                                dispatch({ type: PlayerActionType.ON_PLAY });
                                break;
                            case YT.PlayerState.PAUSED:
                                dispatch({ type: PlayerActionType.ON_STOP });
                                break;
                        }
                    },
                    onError: () => {
                        setTimeout(() => {
                            dispatch({ type: PlayerActionType.STOP });
                            dispatch({ type: PlayerActionType.PLAY });
                        }, ERROR_RETRY_DELAY);
                    },
                },
            });
        };

        tryCreate();
    });
}
