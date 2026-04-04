import type { VideoData, PlaylistData } from '../types/data';
import videoData from './video.json';
import playlistData from './playlist.json';
import externalVideoData from './external-video.json';

export const videos = (videoData as VideoData).videos;
export const playlists = (playlistData as PlaylistData).playlists;
export const externalVideos = (externalVideoData as VideoData).videos;
