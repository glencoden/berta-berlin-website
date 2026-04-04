import { maxMobileWidth } from '../variables';
export const isMobile = (): boolean => window.innerWidth <= maxMobileWidth;
