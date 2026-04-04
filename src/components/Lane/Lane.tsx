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
    sidebarWidth,
    mobileContentMargin,
} from '../../variables';
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
    const { state, dispatch } = useApplicationContext();

    const [items, setItems] = useState<Video[] | null>(null);
    const [activeIndex, setActiveIndex] = useState(0);

    const onSelectPrev = useCallback(() => {
        if (state.currentTransition !== TransitionType.NONE) return;
        setActiveIndex(prev => Math.max(prev - 1, 0));
    }, [state.currentTransition]);

    const onSelectNext = useCallback(() => {
        if (state.currentTransition !== TransitionType.NONE) return;
        setActiveIndex(prev => Math.min(prev + 1, (items?.length ?? 1) - 1));
    }, [state.currentTransition, items]);

    const activeItem = items?.[activeIndex] ?? null;

    const tiles = items
        ?.slice(0, activeIndex + getNumRenderedTiles(state.tileSize))
        .map(mapItemToTile);

    const transitionTypeRef = useRef(state.currentTransition);
    const isEmptyListRef = useRef(false);

    useEffect(() => {
        if (state.selectedConfig === null) return;
        transitionTypeRef.current = state.currentTransition;

        switch (state.currentTransition) {
            case TransitionType.NONE:
                break;
            case TransitionType.SLIDE_OUT:
                if (isEmptyListRef.current) {
                    dispatch({ type: ApplicationActionType.SET_CURRENT_TRANSITION, payload: TransitionType.SLIDE_IN });
                }
                break;
            case TransitionType.SLIDE_IN: {
                setActiveIndex(0);
                const updatedItems = editorService.getVideos(state.selectedConfig);
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
    }, [state.selectedConfig, state.currentTransition, dispatch]);

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
                    const el = entry.target as HTMLElement;
                    if (
                        entry.isIntersecting
                        && el.dataset.position === TilePosition.FIRST
                        && transitionTypeRef.current === TransitionType.SLIDE_IN
                    ) {
                        dispatch({ type: ApplicationActionType.SET_CURRENT_TRANSITION, payload: TransitionType.NONE });
                        dispatch({ type: ApplicationActionType.SET_HAS_LOADED, payload: true });
                    } else if (
                        !entry.isIntersecting
                        && el.dataset.position === TilePosition.LAST
                        && transitionTypeRef.current === TransitionType.SLIDE_OUT
                    ) {
                        dispatch({ type: ApplicationActionType.SET_CURRENT_TRANSITION, payload: TransitionType.SLIDE_IN });
                    }
                });
            },
            { rootMargin: '0px' },
        );
    }, [dispatch]);

    const showTiles = state.currentTransition !== TransitionType.SLIDE_OUT;
    const showControls = state.currentTransition === TransitionType.NONE;
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
                    width: state.tileSize.width,
                    height: 2 * state.tileSize.height,
                    transform: `translateY(${state.menuOpen ? `${laneTop / 2}px` : '0'})`,
                }}
            >
                <div
                    className="absolute"
                    style={{
                        left: -(mobile ? sidebarWidth + mobileContentMargin : laneLeft),
                        top: state.tileSize.height / 2,
                        width: state.tileSize.width / 3,
                        height: state.tileSize.width / 3,
                        backgroundColor: 'var(--color-primary)',
                        transformOrigin: '0 0',
                        rotate: '45deg',
                        translate: !isPlaylistsLoading ? '0 0' : '-200% 0',
                        animation: !isPlaylistsLoading ? 'slide-in 1s' : 'none',
                    }}
                />
                <div
                    className="absolute bg-white"
                    style={{
                        left: -(mobile ? sidebarWidth + mobileContentMargin : laneLeft),
                        top: 0,
                        width: sidebarWidth + 3,
                        height: 2 * state.tileSize.height,
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
                    const position = index === 0
                        ? TilePosition.FIRST
                        : index === (tiles.length - 1)
                            ? TilePosition.LAST
                            : TilePosition.INTERMEDIATE;
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
                                width={state.tileSize.width}
                                height={state.tileSize.height}
                                title={tile.title}
                            />
                        </Tile>
                    );
                })}

                <VideoDetail
                    activeItem={activeItem}
                    visible={showControls}
                />

                <div className="relative" style={{ zIndex: (tiles?.length ?? 0) + 1 }}>
                    <Player hasVideoStarted={state.videoStarted} />
                </div>

                <PlayerOverlay
                    activeItem={activeItem}
                    visible={showControls}
                    zIndex={(tiles?.length ?? 0) + 2}
                />
            </div>
        </>
    );
}

export default Lane;
