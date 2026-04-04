import { MenuItemType } from '../../../enums/MenuItemType';
import { ResourceType } from '../../../enums/ResourceType';
import { FilterType } from '../../../enums/FilterType';
import type { SelectedConfig } from '../../../services/editorService';
import type { MenuItem } from './getMenuItems';

export const parseMenuItem = (menuItem: MenuItem): SelectedConfig => {
    switch (menuItem.type) {
        case MenuItemType.FILTER:
            return { filterType: menuItem.value as FilterType, resourceType: ResourceType.VIDEO, selectedPlaylistId: null };
        case MenuItemType.DASHBOARD: {
            const val = menuItem.value;
            const playlistId = val !== null && typeof val === 'object' && 'value' in val ? val.value : null;
            return { filterType: FilterType.POPULAR, resourceType: ResourceType.PLAYLIST, selectedPlaylistId: playlistId };
        }
        default:
            return { filterType: FilterType.TRENDING, resourceType: ResourceType.VIDEO, selectedPlaylistId: null };
    }
};
