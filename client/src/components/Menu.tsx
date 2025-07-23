import { Link } from 'react-router-dom';
import { useSharedValue } from './context/shareValue';
const Menu: React.FC = () => {
    const { sharedValue } = useSharedValue();
    const name = sharedValue?.name;
    console.log("Shared Value in Menu:", sharedValue, name);

    return (
        <div className="flex flex-col items-center p-4 h-screen w-full max-w-56 bg-white shadow">
            <div className="mb-6 flex flex-col items-center">
                <img src="zippy_logo.svg" alt="Logo" className="h-16 mb-2" />
                <p className="text-lg font-semibold text-gray-700">Rider Management<br />System</p>
            </div>

            <MenuButton />

            <Link to="/profile" className="mt-auto w-full flex items-center gap-4 pt-4 border-t border-gray-200">
                <div className="w-10 h-10 bg-[#1680E4] text-white rounded-full flex items-center justify-center font-semibold">
                    {name ? name.charAt(0).toUpperCase() : ''}
                </div>
                <div>
                    <p className="text-sm font-medium text-gray-800">{`${name}`}</p>
                    <p className="text-xs text-gray-500">Admin</p>
                </div>
            </Link>
        </div>
    );

}
export default Menu;

import React from 'react';
const MenuButton: React.FC = () => {
    const button = [
        { name: "Dashboard", icon: "dashboard.png", active: "dashboardA.png", alt: "Dashboard Icon", link: "/dashboard" },
        { name: "Riders", icon: "rider.png", active: "riderA.png", alt: "Riders Icon", link: "/riders" },
        { name: "Shifts", icon: "shifts.png", active: "shiftsA.png", alt: "Shifts Icon", link: "/shifts" },
        { name: "History", icon: "history.png", active: "historyA.png", alt: "History Icon", link: "/history" },
        { name: "Notification", icon: "notifications.png", active: "notificationsA.png", alt: "Notification Icon", link: "/notifications" },
    ]

    return (
        <div className="flex flex-col gap-2 items-start w-full">
            {button.map((item: { name: string; icon: string; active: string; alt: string; link: string }, index: number) => (
                console.log("Rendering button:", item.link, index),
                <Link to={item.link} key={index} className={`flex items-center w-full gap-2 px-3 py-2 text-sm rounded
    ${location.pathname === item.link
                        ? "bg-[#1680E4] text-white"
                        : "text-gray-600 hover:bg-[#1680e481]"}
  `}>
                    <img src={location.pathname === item.link ? item.active : item.icon} alt={item.alt} className='w-4 h-4' />
                    {item.name}
                </Link>
            ))}
        </div>
    );
}
