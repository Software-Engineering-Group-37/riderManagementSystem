import { useEffect, useState } from 'react';
import { FiLogOut, FiUser } from 'react-icons/fi';
import { Link, useLocation } from 'react-router-dom';
import ConfirmDialog from './ConfirmDialog';
import { useSharedValue } from './context/shareValue';

// Compact sidebar menu for small screens
const SmallMenu: React.FC = () => {
    const { user, logout } = useSharedValue();
    const name = user?.name;
    const photoUrl = user?.photo_url;
    const [showDropdown, setShowDropdown] = useState(false);
    const [showLogoutDialog, setShowLogoutDialog] = useState(false);

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
            if (showDropdown && !(event.target as Element).closest('.profile-dropdown')) {
                setShowDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showDropdown]);

    // Define menu items with role requirements
    const menuItems = [
        {
            icon: "dashboard.png",
            active: "dashboardA.png",
            alt: "Dashboard Icon",
            link: "/dashboard",
            roles: ['superadmin', 'admin']
        },
        {
            icon: "shifts.png",
            active: "shiftsA.png",
            alt: "Shifts Icon",
            link: "/shifts",
            roles: ['superadmin', 'admin']
        },
        {
            icon: "rider.png",
            active: "riderA.png",
            alt: "Riders Icon",
            link: "/riders",
            roles: ['superadmin', 'admin']
        },
        {
            icon: "admin.png",
            active: "adminA.png",
            alt: "Admins Icon",
            link: "/admins",
            roles: ['superadmin']
        },
        {
            icon: "history.png",
            active: "historyA.png",
            alt: "History Icon",
            link: "/history",
            roles: ['superadmin', 'admin']
        },
        {
            icon: "systemsetting.png",
            active: "systemsettingA.png",
            alt: "System Settings Icon",
            link: "/system-settings",
            roles: ['superadmin']
        },
        {
            icon: "notifications.png",
            active: "notificationsA.png",
            alt: "Notification Icon",
            link: "/notifications",
            hasNotification: true,
            roles: ['superadmin', 'admin']
        },
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
            <div className="flex flex-col items-center p-2 h-screen w-full max-w-14 bg-white shadow">
                {/* Logo */}
                <div className="mb-6 flex flex-col items-center">
                    <img src="zippy_logo.svg" alt="Logo" className="mb-2" />
                </div>

                {/* Navigation buttons */}
                <SmallMenuButton menuItems={availableMenuItems} />

                {/* User profile with dropdown at the bottom */}
                <div className="mt-auto w-full pt-4 border-t border-gray-200 relative profile-dropdown">
                    <button
                        onClick={() => setShowDropdown(!showDropdown)}
                        className="w-full h-full flex items-center justify-center p-0 rounded-lg hover:bg-gray-50 transition-colors relative"
                    >
                        {photoUrl ? (
                            <img
                                src={photoUrl}
                                alt="Profile"
                                className="w-full h-10 rounded-full object-cover border-1 border-gray-200"
                                onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                }}
                            />
                        ) : null}
                        <div className={`w-10 h-10 bg-[#1680E4] text-white rounded-full flex items-center justify-center font-semibold ${photoUrl ? 'hidden' : ''}`}>
                            {name ? name.charAt(0).toUpperCase() : ''}
                        </div>
                    </button>

                    {/* Dropdown Menu */}
                    {showDropdown && (
                        <div className="absolute bottom-full left-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg py-2 min-w-[150px] z-50">
                            <Link
                                to="/profile"
                                className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                onClick={() => setShowDropdown(false)}
                            >
                                <FiUser className="w-4 h-4" />
                                Profile
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

export default SmallMenu;

// Renders icon-only navigation buttons for the compact sidebar
interface SmallMenuButtonProps {
    menuItems: Array<{
        icon: string;
        active: string;
        alt: string;
        link: string;
        hasNotification?: boolean;
    }>;
}

const SmallMenuButton: React.FC<SmallMenuButtonProps> = ({ menuItems }) => {
    const location = useLocation();
    const [unreadCount, setUnreadCount] = useState(0);
    const { user } = useSharedValue();

    // Fetch unread notification count (announcements + rider alerts)
    // Define Notification type
    interface Notification {
        id: string | number;
        is_active: boolean;
        expires_at?: string;
    }

    useEffect(() => {
        const fetchUnreadCount = async () => {
            if (!user) return;

            let unreadNotifications = 0;
            let unreadRiderAlerts = 0;

            try {
                // Announcements
                const notifRes = await fetch(`${import.meta.env.VITE_API_URL}/admin/announcements`, { credentials: 'include' });
                if (notifRes.ok) {
                    const notifications: Notification[] = await notifRes.json();
                    const readNotifications = JSON.parse(localStorage.getItem('readNotifications') || '[]');
                    const now = new Date();
                    unreadNotifications = notifications.filter((notification: Notification) =>
                        notification.is_active &&
                        !readNotifications.includes(notification.id) &&
                        (!notification.expires_at || new Date(notification.expires_at) > now)
                    ).length;
                }

                // Rider Alerts
                const alertRes = await fetch(`${import.meta.env.VITE_API_URL}/admin/notifications/rider-alerts`, { credentials: 'include' });
                if (alertRes.ok) {
                    type RiderAlert = { is_read: boolean;[key: string]: unknown };
                    const riderAlerts: RiderAlert[] = await alertRes.json();
                    unreadRiderAlerts = riderAlerts.filter((alert: RiderAlert) => !alert.is_read).length;
                }

                setUnreadCount(unreadNotifications + unreadRiderAlerts);
            } catch {
                setUnreadCount(unreadNotifications + unreadRiderAlerts);
            }
        };

        fetchUnreadCount();

        // Update every minute
        const interval = setInterval(fetchUnreadCount, 60000);

        // Listen for storage changes
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'readNotifications') {
                fetchUnreadCount();
            }
        };

        window.addEventListener('storage', handleStorageChange);

        return () => {
            clearInterval(interval);
            window.removeEventListener('storage', handleStorageChange);
        };
    }, [user]);

    return (
        <div className="flex flex-col gap-2 items-start w-full">
            {menuItems.map((item, index) => (
                <Link
                    to={item.link}
                    key={index}
                    className={`flex items-center w-full gap-2 px-3 py-2 text-sm rounded relative
                        ${location.pathname === item.link
                            ? "bg-[#1680E4] text-white"
                            : "text-gray-600 hover:bg-[#1680e481]"
                        }
                    `}
                >
                    <img
                        src={location.pathname === item.link ? item.active : item.icon}
                        alt={item.alt}
                        className='w-4 h-4'
                    />

                    {/* Notification Badge */}
                    {item.hasNotification && unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[16px] h-[16px] flex items-center justify-center font-medium px-1">
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                    )}
                </Link>
            ))}
        </div>
    );
};
