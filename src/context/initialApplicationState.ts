import type { TileSize } from '../helpers/getTileSize';
import { getTileSize } from '../helpers/getTileSize';
import { isMobile } from '../helpers/isMobile';
import { isViewportTooSmall } from '../helpers/isViewportTooSmall';
import type { SelectedConfig } from '../services/editorService';
import { FilterType } from '../enums/FilterType';
import { ResourceType } from '../enums/ResourceType';
import { TransitionType } from '../enums/TransitionType';

export interface ApplicationState {
    hasLoaded: boolean;
    menuOpen: boolean;
    selectedConfig: SelectedConfig;
    currentTransition: TransitionType;
    videoStarted: boolean;
    tileSize: TileSize;
    isMobile: boolean;
    isViewportTooSmall: boolean;
}

export const initialApplicationState: ApplicationState = {
    hasLoaded: false,
    menuOpen: false,
    selectedConfig: {
        filterType: FilterType.POPULAR,
        resourceType: ResourceType.VIDEO,
        selectedPlaylistId: null,
    },
    currentTransition: TransitionType.NONE,
    videoStarted: false,
    tileSize: getTileSize(),
    isMobile: isMobile(),
    isViewportTooSmall: isViewportTooSmall(),
};
