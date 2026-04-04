import type { Playlist } from '../../../types/playlist';

export interface SubmenuItem {
    label: string;
    value: string;
}

export const getPlaylistSubmenuItems = (playlists: Playlist[]): SubmenuItem[] =>
    playlists.map(playlist => ({ label: playlist.title, value: playlist.id }));
