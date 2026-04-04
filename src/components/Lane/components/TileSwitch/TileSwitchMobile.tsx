import { navigationMargin } from '../../../../variables';

interface TileSwitchMobileProps {
    onPrev: () => void;
    onNext: () => void;
    numTiles: number | undefined;
}

function TileSwitchMobile({ onPrev, onNext, numTiles }: TileSwitchMobileProps) {
    if (numTiles === undefined || isNaN(numTiles)) return null;
    return (
        <>
            <div className="fixed z-[10000] top-1/2 -translate-y-1/2" style={{ left: `${navigationMargin}rem` }}>
                <button onClick={onPrev} className="p-3 rounded-full bg-purple-900/50">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
                </button>
            </div>
            <div className="fixed z-[10000] top-1/2 -translate-y-1/2" style={{ right: `${navigationMargin}rem` }}>
                <button onClick={onNext} className="p-3 rounded-full bg-purple-900/50">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
                </button>
            </div>
        </>
    );
}

export default TileSwitchMobile;
