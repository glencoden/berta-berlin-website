import { useCallback, useEffect, useState } from 'react';
import { useQueryParam, StringParam } from 'use-query-params';
import { useApplicationContext } from '../../context';
import { ApplicationActionType } from '../../context/ApplicationActionType';
import { TransitionType } from '../../enums/TransitionType';
import { MenuItemType } from '../../enums/MenuItemType';
import { FilterType } from '../../enums/FilterType';
import { ResourceType } from '../../enums/ResourceType';
import { UrlState } from '../../enums/UrlState';
import { isMobile } from '../../helpers/isMobile';
import { getMenuItems, type MenuItem } from './helpers/getMenuItems';
import { parseMenuItem } from './helpers/parseMenuItem';
import NavigationTitle from './components/NavigationTitle/NavigationTitle';
import DashboardMenu from './components/DashboardMenu/DashboardMenu';
import SimpleSearch from '../Search/SimpleSearch';
import BurgerIcon from './components/BurgerIcon/BurgerIcon';
import Image from '../Image/Image';
import Imprint from '../Imprint/Imprint';
import { PlayerActionType } from '../Player/context/PlayerActionType';
import { usePlayerContext } from '../Player/context';
import {
    navigationMargin,
    navigationZIndex,
    sidebarWidth,
    laneLeft,
} from '../../variables';

function Navigation() {
    const { state, dispatch: appDispatch } = useApplicationContext();
    const { dispatch: playerDispatch } = usePlayerContext();

    const [menuItems] = useState(() => getMenuItems());
    const [isImprintOpen, setIsImprintOpen] = useState(false);

    const [filter, setFilter] = useQueryParam(UrlState.FILTER, StringParam);
    const [playlist, setPlaylist] = useQueryParam(UrlState.PLAYLIST, StringParam);

    useEffect(() => {
        const filterType = (filter as FilterType) || FilterType.RECENT;
        setFilter(filterType);
        appDispatch({
            type: ApplicationActionType.SET_SELECTED_CONFIG,
            payload: {
                filterType,
                resourceType: !playlist ? ResourceType.VIDEO : ResourceType.PLAYLIST,
                selectedPlaylistId: playlist ?? null,
            },
        });
    }, [filter, playlist]);

    const onMenuItemClick = useCallback((menuItem: MenuItem) => {
        const config = parseMenuItem(menuItem);

        setFilter(config.filterType);
        setPlaylist(config.selectedPlaylistId);

        playerDispatch({ type: PlayerActionType.STOP });
        appDispatch({ type: ApplicationActionType.SET_VIDEO_STARTED, payload: false });
        appDispatch({ type: ApplicationActionType.SET_SELECTED_CONFIG, payload: config });
        appDispatch({ type: ApplicationActionType.SET_CURRENT_TRANSITION, payload: TransitionType.SLIDE_OUT });
    }, [appDispatch, playerDispatch, setFilter, setPlaylist]);

    const mobile = isMobile();

    return (
        <>
            {!mobile && <NavigationTitle />}

            <div
                className="absolute bg-white transition-transform duration-300"
                style={{
                    left: laneLeft,
                    top: `${navigationMargin}rem`,
                    zIndex: navigationZIndex,
                    transform: `translateX(${state.menuOpen ? '0' : `calc(-100% - ${2 * laneLeft}px)`})`,
                }}
            >
                {menuItems.map((menuItem, index) => {
                    switch (menuItem.type) {
                        case MenuItemType.FILTER:
                            return (
                                <button
                                    key={index}
                                    className={`font-sans text-lg mr-[2rem] px-4 py-1 ${
                                        !playlist && menuItem.value === filter
                                            ? 'border border-current rounded'
                                            : ''
                                    }`}
                                    onClick={() => onMenuItemClick(menuItem)}
                                >
                                    {menuItem.label}
                                </button>
                            );
                        case MenuItemType.DASHBOARD:
                            return (
                                <DashboardMenu
                                    key={index}
                                    menuItem={menuItem}
                                    options={menuItem.options ?? []}
                                    selectedOptionValue={playlist}
                                    onMenuItemClick={onMenuItemClick}
                                >
                                    {menuItem.label}
                                </DashboardMenu>
                            );
                        default:
                            return null;
                    }
                })}

                <SimpleSearch />
            </div>

            <div
                className="fixed left-0 top-0"
                style={{
                    width: sidebarWidth,
                    height: mobile ? `${window.innerHeight}px` : '100vh',
                    zIndex: navigationZIndex,
                    backgroundColor: 'var(--color-primary)',
                    animation: 'sidebar-slide-in 0.3s ease',
                }}
            >
                {mobile && (
                    <button
                        className="absolute left-1/2 -translate-x-1/2"
                        style={{ top: `${navigationMargin}rem` }}
                        onClick={() => {
                            window.scroll(0, 0);
                            appDispatch({
                                type: ApplicationActionType.SET_MENU_OPEN,
                                payload: !state.menuOpen,
                            });
                        }}
                    >
                        <BurgerIcon showCancelIcon={state.menuOpen} />
                    </button>
                )}
                <button
                    className="absolute left-1/2 -translate-x-1/2"
                    style={{ bottom: `${navigationMargin}rem` }}
                    onClick={() => setIsImprintOpen(true)}
                    title="imprint"
                >
                    <div className="relative w-12 h-12 rounded overflow-hidden">
                        <Image
                            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                            url="/bertaberlin_logo_2023_black.svg"
                            width={96}
                            height={96}
                            title="berta berlin icon"
                        />
                    </div>
                </button>
            </div>

            <Imprint open={isImprintOpen} onClose={() => setIsImprintOpen(false)} />
        </>
    );
}

export default Navigation;
