import { minDeviceWidth } from '../variables';
export const isViewportTooSmall = (): boolean => window.innerWidth < minDeviceWidth;
