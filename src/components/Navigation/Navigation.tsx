import { useCallback, useEffect, useMemo } from 'react';
import { useQueryParam, StringParam } from 'use-query-params';
import { useApplicationContext } from '../../context';
import { ApplicationActionType } from '../../context/ApplicationActionType';
import { TransitionType } from '../../enums/TransitionType';
import { FilterType } from '../../enums/FilterType';
import { MenuItemType } from '../../enums/MenuItemType';
import { UrlState } from '../../enums/UrlState';
import { isMobile } from '../../helpers/isMobile';
import { getMenuItems, type MenuItem } from './helpers/getMenuItems';
import { parseMenuItem } from './helpers/parseMenuItem';
import NavigationTitle from './components/NavigationTitle/NavigationTitle';
import DashboardMenu from './components/DashboardMenu/DashboardMenu';
import SimpleSearch from '../Search/SimpleSearch';
import BurgerIcon from './components/BurgerIcon/BurgerIcon';
import Imprint from '../Imprint/Imprint';
import {
    navigationMargin,
    navigationZIndex,
    sidebarWidth,
    laneLeft,
    fullDeviceWidth,
} from '../../variables';

function Navigation() {
    const { state, dispatch } = useApplicationContext();
    const [filterParam, setFilterParam] = useQueryParam(UrlState.FILTER, StringParam);
    const [playlistParam, setPlaylistParam] = useQueryParam(UrlState.PLAYLIST, StringParam);

    const menuItems = useMemo(() => getMenuItems(), []);

    useEffect(() => {
        if (!filterParam && !playlistParam) return;
        const matchingItem = menuItems.find(item => {
            if (playlistParam && item.type === MenuItemType.DASHBOARD) return true;
            if (filterParam && item.type === MenuItemType.FILTER && item.value === filterParam) return true;
            return false;
        });
        if (!matchingItem) return;

        if (playlistParam && matchingItem.type === MenuItemType.DASHBOARD) {
            const option = matchingItem.options?.find(o => o.value === playlistParam);
            if (option) {
                handleMenuItemClick({ ...matchingItem, value: option });
                return;
            }
        }
        handleMenuItemClick(matchingItem);
    }, []);

    const handleMenuItemClick = useCallback((menuItem: MenuItem & { value: unknown }) => {
        const config = parseMenuItem(menuItem);
        dispatch({ type: ApplicationActionType.SET_SELECTED_CONFIG, payload: config });

        if (menuItem.type === MenuItemType.FILTER) {
            setFilterParam(menuItem.value as string);
            setPlaylistParam(undefined);
        } else if (menuItem.type === MenuItemType.DASHBOARD) {
            const optionValue = (menuItem.value as { value?: string } | null)?.value ?? null;
            setPlaylistParam(optionValue);
            setFilterParam(undefined);
        }

        if (state.currentTransition === TransitionType.NONE) {
            dispatch({ type: ApplicationActionType.SET_CURRENT_TRANSITION, payload: TransitionType.SLIDE_OUT });
        }

        if (isMobile()) {
            dispatch({ type: ApplicationActionType.SET_MENU_OPEN, payload: false });
        }
    }, [dispatch, state.currentTransition, setFilterParam, setPlaylistParam]);

    const toggleMenu = useCallback(() => {
        dispatch({ type: ApplicationActionType.SET_MENU_OPEN, payload: !state.menuOpen });
    }, [dispatch, state.menuOpen]);

    const mobile = isMobile();
    const menuLeft = mobile ? sidebarWidth : laneLeft;

    return (
        <>
            <div
                className="fixed top-0 left-0 h-full flex flex-col items-center justify-between py-4 bg-black"
                style={{
                    width: sidebarWidth,
                    zIndex: navigationZIndex + 1,
                    animation: 'sidebar-slide-in 0.5s ease-out',
                }}
            >
                {mobile && (
                    <button className="p-2" onClick={toggleMenu}>
                        <BurgerIcon showCancelIcon={state.menuOpen} />
                    </button>
                )}
                <div className="flex-1" />
                <Imprint />
            </div>

            <div
                className="fixed top-0 left-0 h-full transition-transform duration-300"
                style={{
                    width: mobile ? '100vw' : `calc(100vw - ${laneLeft}px)`,
                    left: menuLeft,
                    zIndex: navigationZIndex,
                    transform: state.menuOpen || !mobile ? 'translateX(0)' : `translateX(-100vw)`,
                    backgroundColor: mobile ? 'rgba(0,0,0,0.95)' : 'transparent',
                    pointerEvents: state.menuOpen ? 'auto' : 'none',
                }}
            >
                <NavigationTitle />

                <div
                    className="absolute flex flex-wrap gap-6 items-center"
                    style={{
                        left: window.innerWidth >= fullDeviceWidth ? 0 : `${navigationMargin}rem`,
                        bottom: `${navigationMargin}rem`,
                    }}
                >
                    {menuItems.map(item => {
                        if (item.type === MenuItemType.DASHBOARD && item.options) {
                            return (
                                <DashboardMenu
                                    key={item.label}
                                    menuItem={item}
                                    options={item.options}
                                    selectedOptionValue={state.selectedConfig.selectedPlaylistId}
                                    onMenuItemClick={handleMenuItemClick}
                                >
                                    {item.label}
                                </DashboardMenu>
                            );
                        }
                        const isActive = state.selectedConfig.filterType === item.value &&
                            state.selectedConfig.selectedPlaylistId === null;
                        return (
                            <button
                                key={item.label}
                                className={`text-2xl font-sans uppercase transition-colors duration-200 ${
                                    isActive ? 'text-secondary' : 'text-primary-light hover:text-white'
                                }`}
                                style={{ pointerEvents: 'auto' }}
                                onClick={() => handleMenuItemClick(item)}
                            >
                                {item.label}
                            </button>
                        );
                    })}
                    <SimpleSearch />
                </div>
            </div>
        </>
    );
}

export default Navigation;
