import { useReducer } from 'react';
import type { ApplicationState } from './initialApplicationState';
import { initialApplicationState } from './initialApplicationState';
import { ApplicationActionType } from './ApplicationActionType';
import type { SelectedConfig } from '../services/editorService';
import type { TransitionType } from '../enums/TransitionType';
import { getTileSize } from '../helpers/getTileSize';
import { isMobile } from '../helpers/isMobile';
import { isViewportTooSmall } from '../helpers/isViewportTooSmall';

export type ApplicationAction =
    | { type: typeof ApplicationActionType.SET_HAS_LOADED; payload: boolean }
    | { type: typeof ApplicationActionType.SET_MENU_OPEN; payload: boolean }
    | { type: typeof ApplicationActionType.SET_SELECTED_CONFIG; payload: SelectedConfig }
    | { type: typeof ApplicationActionType.SET_CURRENT_TRANSITION; payload: TransitionType }
    | { type: typeof ApplicationActionType.SET_VIDEO_STARTED; payload: boolean }
    | { type: typeof ApplicationActionType.CALC_TILE_SIZE }
    | { type: typeof ApplicationActionType.CALC_IS_MOBILE }
    | { type: typeof ApplicationActionType.CALC_IS_VIEWPORT_TOO_SMALL };

function applicationReducer(state: ApplicationState, action: ApplicationAction): ApplicationState {
    switch (action.type) {
        case ApplicationActionType.SET_HAS_LOADED:
            return { ...state, hasLoaded: action.payload };
        case ApplicationActionType.SET_MENU_OPEN:
            return { ...state, menuOpen: action.payload };
        case ApplicationActionType.SET_SELECTED_CONFIG:
            return { ...state, selectedConfig: action.payload };
        case ApplicationActionType.SET_CURRENT_TRANSITION:
            return { ...state, currentTransition: action.payload };
        case ApplicationActionType.SET_VIDEO_STARTED:
            return { ...state, videoStarted: action.payload };
        case ApplicationActionType.CALC_TILE_SIZE:
            return { ...state, tileSize: getTileSize() };
        case ApplicationActionType.CALC_IS_MOBILE:
            return { ...state, isMobile: isMobile() };
        case ApplicationActionType.CALC_IS_VIEWPORT_TOO_SMALL:
            return { ...state, isViewportTooSmall: isViewportTooSmall() };
        default:
            return state;
    }
}

export const useApplicationReducer = () => useReducer(applicationReducer, initialApplicationState);

export type ApplicationDispatch = React.Dispatch<ApplicationAction>;
