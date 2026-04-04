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
    const { state } = useApplicationContext();
    const [showTile, setShowTile] = useState(false);
    const [delayOnMount, setDelayOnMount] = useState(delay + laneTileSlideInDelay);
    const timeoutIdRef = useRef(0);
    const tileElement = useRef<HTMLDivElement>(null);

    useEffect(() => setDelayOnMount(0), []);

    useEffect(() => {
        timeoutIdRef.current = window.setTimeout(() => setShowTile(!hide), hide ? delay : delayOnMount);
        return () => clearTimeout(timeoutIdRef.current);
    }, [hide]);

    useEffect(() => {
        if (!tileElement.current || !observer) return;
        const el = tileElement.current;
        observer.observe(el);
        return () => observer.unobserve(el);
    }, [observer]);

    const hideTransform = !hide && state.currentTransition === TransitionType.NONE
        ? 0 : -(state.tileSize.width + laneLeft + hideTileSafetyOffset);

    return (
        <div
            data-position={position}
            ref={tileElement}
            onClick={setActive}
            className="absolute left-0 top-0 shadow-lg transition-transform duration-300"
            style={{ width: state.tileSize.width, height: state.tileSize.height, zIndex, transform: `translateX(${showTile ? transform : hideTransform}px)` }}
        >
            {children}
        </div>
    );
}

export default Tile;
