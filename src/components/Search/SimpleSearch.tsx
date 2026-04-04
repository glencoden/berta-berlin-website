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

    return (
        <div ref={wrapperRef} className="relative inline-block">
            <button
                className="font-sans text-lg inline-flex items-center gap-1"
                onClick={() => setIsActive(prev => !prev)}
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                </svg>
                search
            </button>
            {isActive && (
                <div className="absolute right-0 top-full mt-1 z-50">
                    <input
                        autoFocus
                        type="text"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Search..."
                        className="w-[250px] px-3 py-2 text-lg font-sans bg-black/90 text-white border border-primary-light rounded outline-none"
                    />
                    {results.length > 0 && (
                        <div className="bg-black/90 rounded shadow-lg mt-1 max-h-[300px] overflow-y-auto">
                            {results.map(video => (
                                <button
                                    key={video.id}
                                    className="block w-full text-left px-3 py-2 text-lg font-sans text-primary-light hover:text-white transition-colors duration-200"
                                    onClick={() => onSelect(video)}
                                >
                                    {video.title}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default SimpleSearch;
