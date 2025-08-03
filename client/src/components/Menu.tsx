import { useEffect, useState } from 'react';
import { FiChevronUp, FiLogOut, FiUser } from 'react-icons/fi';
import { Link, useLocation } from 'react-router-dom';
import { logout } from '../utils/auth';
import ConfirmDialog from './ConfirmDialog';
import { useSharedValue } from './context/shareValue';

// Sidebar menu for navigation and user info
const Menu: React.FC = () => {
    const { user } = useSharedValue();
    const name = user?.name;
    const photoUrl = user?.photo_url;
    const [showDropdown, setShowDropdown] = useState(false);
    const [showLogoutDialog, setShowLogoutDialog] = useState(false);
    const location = useLocation();

    const handleLogout = async () => {
        setShowDropdown(false);
        setShowLogoutDialog(true);
    };

    const confirmLogout = async () => {
        setShowLogoutDialog(false);
        await logout();
    };

    const cancelLogout = () => {
        setShowLogoutDialog(false);
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (showDropdown && !(event.target as Element).closest('.profile-section')) {
                setShowDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showDropdown]);

    // Define menu items with icon images
    const menuItems = [
        {
            id: 'dashboard',
            label: 'Dashboard',
            icon: "dashboard.png",
            active: "dashboardA.png",
            path: '/dashboard',
            roles: ['superadmin', 'admin']
        },
        {
            id: 'shifts',
            label: 'Shifts',
            icon: "shifts.png",
            active: "shiftsA.png",
            path: '/shifts',
            roles: ['superadmin', 'admin']
        },
        {
            id: 'riders',
            label: 'Riders',
            icon: "rider.png",
            active: "riderA.png",
            path: '/riders',
            roles: ['superadmin', 'admin']
        },
        {
            id: 'admins',
            label: 'Admins',
            icon: "admin.png",
            active: "adminA.png",
            path: '/admins',
            roles: ['superadmin']
        },
        {
            id: 'history',
            label: 'History',
            icon: "history.png",
            active: "historyA.png",
            path: '/history',
            roles: ['superadmin', 'admin']
        },
        {
            id: 'settings',
            label: 'System Settings',
            icon: "systemsetting.png",
            active: "systemsettingA.png",
            path: '/system-settings',
            roles: ['superadmin']
        },
        {
            id: 'notifications',
            label: 'Notifications',
            icon: "notifications.png",
            active: "notificationsA.png",
            path: '/notifications',
            roles: ['superadmin', 'admin']
        }
    ];

    // Filter menu items based on user role
    const normalizedRole = user?.role_name?.toLowerCase() || '';
    const availableMenuItems = menuItems.filter(item =>
        item.roles.some(role =>
            role === 'superadmin'
                ? normalizedRole === 'superadmin'
                : normalizedRole !== 'superadmin'
        )
    );

    return (
        <>
            <div className="flex flex-col items-center p-4 h-screen w-full max-w-56 bg-white shadow">
                {/* Logo and system title */}
                <div className="mb-6 flex flex-col items-center">
                    <img src="zippy_logo.svg" alt="Logo" className="h-16 mb-2" />
                    <p className="text-lg font-semibold text-gray-700">Rider Management<br />System</p>
                </div>

                {/* Navigation buttons */}
                <div className="flex flex-col gap-2 items-start w-full">
                    {availableMenuItems.map((item) => (
                        <Link
                            to={item.path}
                            key={item.id}
                            className={`flex items-center w-full gap-3 px-3 py-2 text-sm rounded relative
                                ${location.pathname === item.path
                                    ? "bg-[#1680E4] text-white"
                                    : "text-gray-600 hover:bg-[#1680e481]"}
                            `}
                        >
                            <img
                                src={location.pathname === item.path ? item.active : item.icon}
                                alt={item.label + " Icon"}
                                className="w-5 h-5"
                            />
                            <span className="flex-1">{item.label}</span>
                        </Link>
                    ))}
                </div>

                {/* User profile section at the bottom */}
                <div className="mt-auto w-full pt-4 border-t border-gray-200 relative profile-section">
                    <button
                        onClick={() => setShowDropdown(!showDropdown)}
                        className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        {photoUrl ? (
                            <img
                                src={photoUrl}
                                alt="Profile"
                                className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                                onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                }}
                            />
                        ) : null}
                        <div className={`w-10 h-10 bg-[#1680E4] text-white rounded-full flex items-center justify-center font-semibold ${photoUrl ? 'hidden' : ''}`}>
                            {name ? name.charAt(0).toUpperCase() : ''}
                        </div>
                        <div className="flex-1 text-left">
                            <p className="text-sm font-medium text-gray-800">{name}</p>
                            <p className="text-xs text-gray-500">{user?.role_name}</p>
                        </div>
                        <FiChevronUp
                            className={`w-4 h-4 text-gray-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`}
                        />
                    </button>

                    {/* Dropdown Menu */}
                    {showDropdown && (
                        <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg py-2">
                            <Link
                                to="/profile"
                                className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                onClick={() => setShowDropdown(false)}
                            >
                                <FiUser className="w-4 h-4" />
                                View Profile
                            </Link>
                            <hr className="my-1" />
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                            >
                                <FiLogOut className="w-4 h-4" />
                                Logout
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Custom Logout Confirmation Dialog */}
            <ConfirmDialog
                isOpen={showLogoutDialog}
                title="Confirm Logout"
                message="Are you sure you want to logout? You will need to sign in again to access your account."
                confirmText="Logout"
                cancelText="Cancel"
                onConfirm={confirmLogout}
                onCancel={cancelLogout}
                type="danger"
            />
        </>
    );
};

export default Menu;
