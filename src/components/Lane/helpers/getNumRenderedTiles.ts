import type { TileSize } from '../../../helpers/getTileSize';
import { defaultTileWidth, laneLeft, laneTileOffset, minNumRenderedTiles } from '../../../variables';

export const getNumRenderedTiles = (tileSize: TileSize): number => {
    if (tileSize.width < defaultTileWidth) return minNumRenderedTiles;
    const remainingSpace = window.innerWidth - laneLeft - defaultTileWidth;
    return Math.max(Math.ceil(remainingSpace / laneTileOffset), minNumRenderedTiles);
};
