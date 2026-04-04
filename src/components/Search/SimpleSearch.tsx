import { useCallback, useEffect, useRef, useState } from 'react';
import { editorService } from '../../services/editorService';
import { useApplicationContext } from '../../context';
import { ApplicationActionType } from '../../context/ApplicationActionType';
import { TransitionType } from '../../enums/TransitionType';
import { isMobile } from '../../helpers/isMobile';
import type { Video } from '../../types/video';

function SimpleSearch() {
    const { dispatch } = useApplicationContext();
    const [isActive, setIsActive] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Video[]>([]);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setIsActive(false);
                setQuery('');
                setResults([]);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (!query.trim()) {
            setResults([]);
            return;
        }
        const lowerQuery = query.toLowerCase();
        const allVideos = editorService.getAllVideos();
        setResults(
            allVideos.filter(v =>
                v.title.toLowerCase().includes(lowerQuery) ||
                v.description.toLowerCase().includes(lowerQuery)
            ).slice(0, 10)
        );
    }, [query]);

    const onSelect = useCallback((video: Video) => {
        editorService.setInsertVideo(video.id);
        dispatch({ type: ApplicationActionType.SET_CURRENT_TRANSITION, payload: TransitionType.INSERT });
        if (isMobile()) {
            dispatch({ type: ApplicationActionType.SET_MENU_OPEN, payload: false });
        }
        setIsActive(false);
        setQuery('');
        setResults([]);
    }, [dispatch]);

    if (!isActive) {
        return (
            <button
                className="font-sans text-lg uppercase px-4 py-1"
                onClick={() => setIsActive(true)}
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="inline-block align-middle mr-1">
                    <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                </svg>
                search
            </button>
        );
    }

    return (
        <div ref={wrapperRef} className="relative inline-block">
            <input
                autoFocus
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="search"
                style={{ width: isMobile() ? 180 : 240, fontSize: '16px' }}
                className="px-3 py-1 font-sans border border-neutral-300 rounded outline-none focus:border-primary"
            />
            {results.length > 0 && (
                <div className="absolute left-0 top-full mt-1 w-full bg-white rounded shadow-lg z-50 max-h-[300px] overflow-y-auto">
                    {results.map(video => (
                        <button
                            key={video.id}
                            className="block w-full text-left px-3 py-2 text-sm font-sans hover:bg-neutral-100 truncate"
                            onMouseDown={() => onSelect(video)}
                        >
                            {video.title}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

export default SimpleSearch;
