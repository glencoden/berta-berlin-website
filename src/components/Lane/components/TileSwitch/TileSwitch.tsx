import { useApplicationContext } from '../../../../context';
import { laneTop, progressBarWidth } from '../../../../variables';

interface TileSwitchProps {
    onPrev: () => void;
    onNext: () => void;
    numTiles: number | undefined;
    activeIndex: number;
    visible: boolean;
}

function TileSwitch({ onPrev, onNext, numTiles, activeIndex, visible }: TileSwitchProps) {
    const { state } = useApplicationContext();
    if (numTiles === undefined || isNaN(numTiles)) return null;
    const progressPercent = 100 / (numTiles - 1) * activeIndex;
    const indicatorX = progressBarWidth * (progressPercent / 100);

    return (
        <div className="flex absolute transition-opacity duration-300" style={{
            left: state.tileSize.width / 2, top: -(laneTop / 2), transform: 'translateX(-50%)', opacity: visible ? 1 : 0,
        }}>
            <button onClick={onPrev} className="p-2 text-primary hover:opacity-70">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
            </button>
            <div className="relative mx-4" style={{ width: progressBarWidth }}>
                <div className="absolute top-1/2 -translate-y-1/2 h-1 bg-primary shadow" style={{ width: progressBarWidth }} />
                <div className="absolute top-1/2 w-3 h-3 bg-primary shadow rotate-45 transition-transform duration-300" style={{ transform: `translate(${indicatorX}px, -50%) rotate(45deg)` }} />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary">{activeIndex + 1} / {numTiles}</div>
            </div>
            <button onClick={onNext} className="p-2 text-primary hover:opacity-70">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
            </button>
        </div>
    );
}

export default TileSwitch;
