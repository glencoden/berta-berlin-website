import { useEffect, useRef, useState } from 'react';
import { getPlayer } from './helpers/getPlayer';
import { usePlayerContext } from './context';

let PLAYER_INITIATED = false;

interface PlayerProps {
    hasVideoStarted: boolean;
}

function Player({ hasVideoStarted }: PlayerProps) {
    const { state: playerState, dispatch } = usePlayerContext();
    const [player, setPlayer] = useState<YT.Player | null>(null);
    const playerElement = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (PLAYER_INITIATED) return;
        PLAYER_INITIATED = true;
        const playerScript = document.createElement('script');
        playerScript.src = 'https://www.youtube.com/iframe_api';
        document.body.appendChild(playerScript);
        getPlayer('youtube-player', '', dispatch).then(setPlayer);
    }, [dispatch]);

    useEffect(() => {
        if (!player) return;
        playerState.shouldPlay ? player.playVideo() : player.pauseVideo();
    }, [playerState.shouldPlay, player]);

    useEffect(() => {
        if (!playerState.video || !player) return;
        player.loadVideoById(playerState.video.id);
    }, [playerState.video, player]);

    useEffect(() => {
        if (!playerState.playlist || !player) return;
        player.loadPlaylist({ listType: 'playlist', list: playerState.playlist.id });
    }, [playerState.playlist, player]);

    useEffect(() => {
        if (!player) return;
        player.setSize(playerState.size.width, playerState.size.height);
    }, [playerState.size, player]);

    return (
        <div className="transition-opacity duration-200" style={{ opacity: hasVideoStarted ? 1 : 0 }}>
            <div id="youtube-player" ref={playerElement} />
        </div>
    );
}

export default Player;
