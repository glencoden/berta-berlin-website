import Headline from '../../../Headline/Headline';
import { useApplicationContext } from '../../../../context';
import { fullDeviceWidth, laneLeft, navigationMargin } from '../../../../variables';

function NavigationTitle() {
    const { state } = useApplicationContext();
    return (
        <div className="absolute transition-transform duration-300" style={{
            right: window.innerWidth >= fullDeviceWidth ? laneLeft : `${navigationMargin}rem`,
            top: `${navigationMargin}rem`,
            transform: state.menuOpen ? 'none' : `translate(0, calc(-${navigationMargin}rem - 100%))`,
        }}>
            <h1 className="text-4xl text-secondary font-sans"><Headline /></h1>
        </div>
    );
}

export default NavigationTitle;
