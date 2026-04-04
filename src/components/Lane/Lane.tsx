import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Player from '../Player/Player';
import PlayerOverlay from './components/PlayerOverlay/PlayerOverlay';
import { mapItemToTile } from './helpers/mapItemToTile';
import Tile from './components/Tile/Tile';
import TileSwitch from './components/TileSwitch/TileSwitch';
import TileSwitchMobile from './components/TileSwitch/TileSwitchMobile';
import VideoDetail from './components/VideoDetail/VideoDetail';
import Image from '../Image/Image';
import { editorService } from '../../services/editorService';
import { useApplicationContext } from '../../context';
import { ApplicationActionType } from '../../context/ApplicationActionType';
import { TransitionType } from '../../enums/TransitionType';
import { getNumRenderedTiles } from './helpers/getNumRenderedTiles';
import { isMobile } from '../../helpers/isMobile';
import {
    laneLeft,
    laneTop,
    laneTileOffset,
    laneTileAnimationOffset,
    mobileContentMargin,
    fullDeviceWidth,
} from '../../variables';
import type { Video } from '../../types/video';

function Lane() {
    const { state, dispatch } = useApplicationContext();
    const [items, setItems] = useState<Video[] | null>(null);
    const [activeIndex, setActiveIndex] = useState(0);
    const observerRef = useRef<IntersectionObserver | null>(null);
    const laneRef = useRef<HTMLDivElement>(null);

    const numRenderedTiles = useMemo(() => getNumRenderedTiles(state.tileSize), [state.tileSize]);

    const onSelectPrev = useCallback(() => {
        if (state.currentTransition !== TransitionType.NONE) return;
        setActiveIndex(prev => Math.max(0, prev - 1));
    }, [state.currentTransition]);

    const onSelectNext = useCallback(() => {
        if (state.currentTransition !== TransitionType.NONE || !items) return;
        setActiveIndex(prev => Math.min(items.length - 1, prev + 1));
    }, [state.currentTransition, items]);

    useEffect(() => {
        if (!state.selectedConfig) return;

        switch (state.currentTransition) {
            case TransitionType.SLIDE_OUT: {
                const videos = editorService.getVideos(state.selectedConfig);
                if (videos.length === 0) {
                    dispatch({ type: ApplicationActionType.SET_CURRENT_TRANSITION, payload: TransitionType.SLIDE_IN });
                    return;
                }
                break;
            }
            case TransitionType.SLIDE_IN: {
                const videos = editorService.getVideos(state.selectedConfig);
                setItems(videos);
                setActiveIndex(0);
                break;
            }
            case TransitionType.INSERT: {
                const insertVideo = editorService.getInsertVideo();
                if (insertVideo) {
                    setItems(prev => {
                        if (!prev) return [insertVideo];
                        return [{ ...insertVideo, renderKey: `${insertVideo.id}-${Date.now()}` }, ...prev];
                    });
                    setActiveIndex(0);
                }
                editorService.setInsertVideo(null);
                dispatch({ type: ApplicationActionType.SET_CURRENT_TRANSITION, payload: TransitionType.NONE });
                break;
            }
        }
    }, [state.selectedConfig, state.currentTransition, dispatch]);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') onSelectPrev();
            if (e.key === 'ArrowRight') onSelectNext();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [onSelectPrev, onSelectNext]);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    const position = (entry.target as HTMLElement).dataset.position;
                    if (position === 'first' && entry.isIntersecting && state.currentTransition === TransitionType.SLIDE_IN) {
                        dispatch({ type: ApplicationActionType.SET_CURRENT_TRANSITION, payload: TransitionType.NONE });
                    }
                    if (position === 'last' && !entry.isIntersecting && state.currentTransition === TransitionType.SLIDE_OUT) {
                        dispatch({ type: ApplicationActionType.SET_CURRENT_TRANSITION, payload: TransitionType.SLIDE_IN });
                    }
                }
            },
            { threshold: 0 },
        );
        observerRef.current = observer;
        return () => observer.disconnect();
    }, [state.currentTransition, dispatch]);

    if (!items) return null;

    const mobile = isMobile();
    const tileWidth = state.tileSize.width;
    const tileHeight = state.tileSize.height;
    const left = mobile ? mobileContentMargin : laneLeft;
    const top = mobile ? mobileContentMargin : laneTop;
    const tileOffset = mobile ? 0 : laneTileOffset;
    const laneWidth = tileWidth + (numRenderedTiles - 1) * tileOffset;

    return (
        <>
            {mobile && (
                <TileSwitchMobile
                    onPrev={onSelectPrev}
                    onNext={onSelectNext}
                    numTiles={items.length}
                />
            )}
            <div
                ref={laneRef}
                className="absolute"
                style={{ left, top, width: laneWidth, height: tileHeight }}
            >
                <div
                    className="absolute w-3 h-3 bg-primary rotate-45"
                    style={{
                        left: tileWidth / 2,
                        top: -(laneTop / 2),
                        transform: 'translate(-50%, -50%) rotate(45deg)',
                    }}
                />
                <div
                    className="absolute bg-white"
                    style={{
                        left: 0,
                        top: tileHeight,
                        width: window.innerWidth >= fullDeviceWidth ? tileWidth : '100vw',
                        height: 4,
                    }}
                />
                {!mobile && (
                    <TileSwitch
                        onPrev={onSelectPrev}
                        onNext={onSelectNext}
                        numTiles={items.length}
                        activeIndex={activeIndex}
                        visible={state.currentTransition === TransitionType.NONE}
                    />
                )}
                {items.slice(0, numRenderedTiles).map((item, index) => {
                    const tile = mapItemToTile(item);
                    const transform = index * tileOffset - activeIndex * tileOffset;
                    const position = index === 0 ? 'first' : index === numRenderedTiles - 1 ? 'last' : 'middle';
                    const hide = state.currentTransition === TransitionType.SLIDE_OUT;
                    const delay = index * laneTileAnimationOffset;

                    return (
                        <Tile
                            key={tile.key}
                            hide={hide}
                            position={position}
                            transform={transform}
                            zIndex={numRenderedTiles - index}
                            delay={delay}
                            setActive={() => setActiveIndex(index)}
                            observer={observerRef.current}
                        >
                            <Image
                                url={tile.url}
                                width={tileWidth}
                                height={tileHeight}
                                title={tile.title}
                            />
                        </Tile>
                    );
                })}
                <VideoDetail
                    activeItem={items[activeIndex] ?? null}
                    visible={state.currentTransition === TransitionType.NONE}
                />
                <Player hasVideoStarted={state.videoStarted} />
                <PlayerOverlay
                    activeItem={items[activeIndex] ?? null}
                    visible={state.currentTransition === TransitionType.NONE}
                />
            </div>
        </>
    );
}

export default Lane;
