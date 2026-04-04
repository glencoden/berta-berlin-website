import './burger-icon.css';

interface BurgerIconProps {
    showCancelIcon: boolean;
    strokeWidth?: number;
}

function BurgerIcon({ showCancelIcon, strokeWidth = 4 }: BurgerIconProps) {
    const classNames = ['BurgerIcon'];
    if (showCancelIcon) classNames.push('close');
    return (
        <div className="burger-icon-wrapper">
            <div className={classNames.join(' ')}>
                {Array.from({ length: 6 }).map((_, i) => (
                    <span key={i} style={{ height: `${strokeWidth}px` }} />
                ))}
            </div>
        </div>
    );
}

export default BurgerIcon;
