import { useCallback, useEffect, useState } from 'react';
import { QueryParamProvider } from 'use-query-params';
import { WindowHistoryAdapter } from 'use-query-params/adapters/window';
import { useApplicationContext } from './context';
import { ApplicationActionType } from './context/ApplicationActionType';
import { TransitionType } from './enums/TransitionType';
import { editorService } from './services/editorService';
import { videos, playlists, externalVideos } from './data';
import { PlayerProvider } from './components/Player/context';
import Lane from './components/Lane/Lane';
import Navigation from './components/Navigation/Navigation';
import LoadingMessage from './components/LoadingMessage/LoadingMessage';

function AppContent() {
    const { state, dispatch } = useApplicationContext();
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        if (import.meta.env.PROD && window.location.protocol !== 'https:') {
            window.location.href = window.location.href.replace('http:', 'https:');
        }
    }, []);

    useEffect(() => {
        editorService.setPlaylists(playlists);
        editorService.setExternalVideos(externalVideos);
        editorService.setVideos(videos);
        dispatch({ type: ApplicationActionType.SET_HAS_LOADED, payload: true });
        dispatch({ type: ApplicationActionType.SET_CURRENT_TRANSITION, payload: TransitionType.SLIDE_IN });
        setIsReady(true);
    }, [dispatch]);

    const onResize = useCallback(() => {
        dispatch({ type: ApplicationActionType.CALC_TILE_SIZE });
        dispatch({ type: ApplicationActionType.CALC_IS_MOBILE });
        dispatch({ type: ApplicationActionType.CALC_IS_VIEWPORT_TOO_SMALL });
    }, [dispatch]);

    useEffect(() => {
        let timeoutId: number;
        const handleResize = () => {
            clearTimeout(timeoutId);
            timeoutId = window.setTimeout(onResize, 200);
        };
        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
            clearTimeout(timeoutId);
        };
    }, [onResize]);

    if (state.isViewportTooSmall) {
        return (
            <LoadingMessage visible={true}>
                Please increase your browser window size
            </LoadingMessage>
        );
    }

    return (
        <PlayerProvider>
            <LoadingMessage visible={!state.hasLoaded}>loading...</LoadingMessage>
            {state.hasLoaded && <Navigation />}
            {isReady && <Lane />}
        </PlayerProvider>
    );
}

function App() {
    return (
        <QueryParamProvider adapter={WindowHistoryAdapter}>
            <AppContent />
        </QueryParamProvider>
    );
}

export default App;
