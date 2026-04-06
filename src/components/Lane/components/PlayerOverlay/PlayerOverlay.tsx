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
    zIndex?: number;
}

function PlayerOverlay({ activeItem, visible, zIndex }: PlayerOverlayProps) {
    const { state, dispatch: appDispatch } = useApplicationContext();
    const { state: playerState, dispatch: playerDispatch } = usePlayerContext();
    const parsedDescription = useParsedDescription(activeItem);

    useEffect(() => {
        playerDispatch({ type: PlayerActionType.SET_SIZE, payload: state.tileSize });
    }, [state.tileSize, playerDispatch]);

    const onPlay = useCallback(() => {
        if (!activeItem) return;
        storageService.setSeenVideoIds(activeItem);
        storageService.setRecentlyWatchedGenres(activeItem);
        playerDispatch({ type: PlayerActionType.SET_VIDEO, payload: activeItem });
        playerDispatch({ type: PlayerActionType.PLAY });
    }, [activeItem, playerDispatch]);

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
    const rightTileAreaWidth = state.tileSize.width - (state.tileSize.width * controlsOverlayWidth / 100);

    return (
        <div className="absolute left-0 top-0 transition-all duration-300" style={{
            width: state.tileSize.width, height: state.tileSize.height,
            opacity: visible ? 1 : 0,
            zIndex,
            ...(state.videoStarted ? { transform: `translateY(${isMobile() ? 150 : 100}%)`, pointerEvents: 'none' as const } : {}),
        }}>
            <div className="absolute left-0 top-0 h-full bg-black overflow-scroll box-border"
                style={{ width: `${controlsOverlayWidth}%`, paddingBottom: `calc(${controlsMargin}rem + 42px)` }}>
                <h4 className="text-white font-sans" style={{ fontSize: '2.125rem', padding: `${controlsMargin}rem` }}>{activeItem.title}</h4>
                <h6 className="text-white font-sans" style={{ fontSize: '1.25rem', padding: `0 ${controlsMargin}rem` }}>{parsedDescription.detail}</h6>
            </div>
            <div className="absolute top-1/2" style={{ right: rightTileAreaWidth / 2, transform: 'translate(50%, -50%)' }}>
                {!state.videoStarted && (
                    <button className="text-2xl font-sans bg-primary text-white px-6 py-3 rounded shadow-lg hover:opacity-90"
                        onClick={(isVideoLoading || playerState.isPlaying) ? onPause : onPlay}>
                        {isVideoLoading
                            ? <span className="inline-block w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            : <>&#9658;</>}
                        &nbsp;Play
                    </button>
                )}
            </div>
        </div>
    );
}

export default PlayerOverlay;
