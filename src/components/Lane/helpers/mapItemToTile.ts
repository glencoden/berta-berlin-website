import type { Video } from '../../../types/video';
import { getMaxThumbnail } from './getMaxThumbnail';

export interface TileData {
    key: string;
    url: string;
    title: string;
}

export const mapItemToTile = (item: Video): TileData => {
    const thumbnail = getMaxThumbnail(item.thumbnails);
    return { key: item.renderKey ?? item.id, url: thumbnail?.url ?? '', title: item.title };
};
