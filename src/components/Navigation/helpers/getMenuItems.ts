import { FilterType } from '../../../enums/FilterType';
import { MenuItemType } from '../../../enums/MenuItemType';
import { getPlaylistSubmenuItems, type SubmenuItem } from './getPlaylistSubmenuItems';
import { editorService } from '../../../services/editorService';

export interface MenuItem {
    type: MenuItemType;
    label: string;
    value: string | SubmenuItem | null;
    options?: SubmenuItem[];
}

export const getMenuItems = (): MenuItem[] => {
    const playlists = editorService.getPlaylists();
    if (playlists === null) return [];
    return [
        { type: MenuItemType.FILTER, label: FilterType.RECENT, value: FilterType.RECENT },
        { type: MenuItemType.FILTER, label: FilterType.POPULAR, value: FilterType.POPULAR },
        { type: MenuItemType.FILTER, label: FilterType.TRENDING, value: FilterType.TRENDING },
        { type: MenuItemType.DASHBOARD, label: 'playlists', value: null, options: getPlaylistSubmenuItems(playlists) },
    ];
};
