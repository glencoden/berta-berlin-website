import { MenuItemType } from '../../../enums/MenuItemType';
import { ResourceType } from '../../../enums/ResourceType';
import { FilterType } from '../../../enums/FilterType';
import type { SelectedConfig } from '../../../services/editorService';
import type { MenuItem } from './getMenuItems';

export const parseMenuItem = (menuItem: MenuItem & { value: unknown }): SelectedConfig => {
    switch (menuItem.type) {
        case MenuItemType.FILTER:
            return { filterType: menuItem.value as FilterType, resourceType: ResourceType.VIDEO, selectedPlaylistId: null };
        case MenuItemType.DASHBOARD:
            return { filterType: FilterType.POPULAR, resourceType: ResourceType.PLAYLIST, selectedPlaylistId: (menuItem.value as { value?: string } | null)?.value ?? null };
        default:
            return { filterType: FilterType.TRENDING, resourceType: ResourceType.VIDEO, selectedPlaylistId: null };
    }
};
