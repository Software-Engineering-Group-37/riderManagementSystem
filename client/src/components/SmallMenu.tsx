import { Link, useLocation } from 'react-router-dom';
import { useSharedValue } from './context/shareValue';
const SmallMenu: React.FC = () => {
    const { sharedValue } = useSharedValue();
    const name = sharedValue?.name;
    console.log("Shared Value in Menu:", sharedValue, name);

    return (
        <div className="flex flex-col items-center p-2 h-screen w-full max-w-14 bg-white shadow">
            <div className="mb-6 flex flex-col items-center">
                <img src="zippy_logo.svg" alt="Logo" className=" mb-2" />
            </div>

            <SmallMenuButton />

            <Link to="/profile" className="mt-auto w-full flex items-center gap-4 pt-4 border-t border-gray-200">
                <div className="w-10 h-10 bg-[#1680E4] text-white rounded-full flex items-center justify-center font-semibold">
                    {name ? name.charAt(0).toUpperCase() : ''}
                </div>
            </Link>
        </div>
    );

}
export default SmallMenu;

import React from 'react';
const SmallMenuButton: React.FC = () => {
    const location = useLocation();
    const button = [
        { icon: "dashboard.png", active: "dashboardA.png", alt: "Dashboard Icon", link: "/dashboard" },
        { icon: "rider.png", active: "riderA.png", alt: "Riders Icon", link: "/riders" },
        { icon: "shifts.png", active: "shiftsA.png", alt: "Shifts Icon", link: "/shifts" },
        { icon: "history.png", active: "historyA.png", alt: "History Icon", link: "/history" },
        { icon: "notifications.png", active: "notificationsA.png", alt: "Notification Icon", link: "/notifications" },
    ]

    return (
        <div className="flex flex-col gap-2 items-start w-full">
            {button.map((item: { icon: string; active: string; alt: string; link: string }, index: number) => (
                console.log("Rendering button:", item.link, index),
                <Link to={item.link} key={index} className={`flex items-center w-full gap-2 px-3 py-2 text-sm rounded
    ${location.pathname === item.link
                        ? "bg-[#1680E4] text-white"
                        : "text-gray-600 hover:bg-[#1680e481]"}
  `}>
                    <img src={location.pathname === item.link ? item.active : item.icon} alt={item.alt} className='w-4 h-4' />
                </Link>
            ))}
        </div>
    );
}
