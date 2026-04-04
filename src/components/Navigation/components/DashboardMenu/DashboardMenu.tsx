import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { MenuItem } from '../../helpers/getMenuItems';
import type { SubmenuItem } from '../../helpers/getPlaylistSubmenuItems';

interface DashboardMenuProps {
    menuItem: MenuItem;
    options: SubmenuItem[];
    selectedOptionValue: string | null | undefined;
    onMenuItemClick: (menuItem: MenuItem) => void;
    children: ReactNode;
}

function DashboardMenu({ menuItem, options, selectedOptionValue, onMenuItemClick, children }: DashboardMenuProps) {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div ref={menuRef} className="relative inline-block mr-[2rem]">
            <button
                className="text-2xl font-sans text-primary-light hover:text-white transition-colors duration-200 uppercase"
                onClick={() => setIsOpen(prev => !prev)}
            >
                {children}
            </button>
            {isOpen && (
                <div className="absolute left-0 top-full mt-1 bg-black/90 rounded shadow-lg min-w-[200px] z-50">
                    {options.map(option => (
                        <button
                            key={option.value}
                            className={`block w-full text-left px-4 py-2 text-lg font-sans transition-colors duration-200 ${
                                option.value === selectedOptionValue ? 'text-secondary' : 'text-primary-light hover:text-white'
                            }`}
                            onClick={() => {
                                onMenuItemClick({ ...menuItem, value: option });
                                setIsOpen(false);
                            }}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

export default DashboardMenu;
