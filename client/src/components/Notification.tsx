import type { FC } from "react";
import { useCallback, useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import {
    FiAlertCircle,
    FiAlertTriangle,
    FiBell,
    FiCheck,
    FiClock,
    FiEye,
    FiEyeOff,
    FiFilter,
    FiInfo,
    FiRefreshCw,
    FiTool,
    FiUser,
    FiUsers
} from "react-icons/fi";
import { Link } from "react-router-dom";
import Alert from "./Alert";
import ConfirmDialog from "./ConfirmDialog";
import Menu from "./Menu";
import SmallMenu from "./SmallMenu";
import { useSharedValue } from './context/shareValue';

// Notification/Announcement types
interface Notification {
    id: string;
    title: string;
    content: string;
    type: 'info' | 'warning' | 'urgent' | 'maintenance';
    priority: 'low' | 'normal' | 'high' | 'urgent';
    target_audience: string;
    is_active: boolean;
    expires_at?: string;
    created_at: string;
    created_by_admin: string;
    is_read?: boolean; // Client-side read status
}

const Notification: FC = () => {
    const [width, setWidth] = useState(window.innerWidth);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(false);
    const [alert, setAlert] = useState<{ message: string; type?: 'success' | 'error' | 'info' } | null>(null);

    // Filter states
    const [filterType, setFilterType] = useState<string>('all');
    const [filterPriority, setFilterPriority] = useState<string>('all');
    const [showRead, setShowRead] = useState(true);
    const [showExpired, setShowExpired] = useState(false);
    const [showClearDialog, setShowClearDialog] = useState(false);
    const [showFilters, setShowFilters] = useState<boolean>(width > 600);

    // Read status tracking (stored in localStorage)
    const [readNotifications, setReadNotifications] = useState<Set<string>>(new Set());

    const { user } = useSharedValue();

    // Helper to show alert
    const displayAlert = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
        setAlert({ message, type });
        setTimeout(() => setAlert(null), 3000);
    };

    // Load read notifications from localStorage
    useEffect(() => {
        const stored = localStorage.getItem('readNotifications');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                setReadNotifications(new Set(parsed));
            } catch (error) {
                console.error('Error parsing read notifications:', error);
            }
        }
    }, []);

    // Save read notifications to localStorage
    const saveReadNotifications = (readSet: Set<string>) => {
        localStorage.setItem('readNotifications', JSON.stringify(Array.from(readSet)));
        setReadNotifications(readSet);
    };

    // Fetch notifications from backend
    const fetchNotifications = useCallback(async () => {
        if (!user) {
            window.location.href = '/login';
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/announcements`, {
                credentials: 'include'
            });

            if (response.status === 401) {
                sessionStorage.removeItem('user');
                window.location.href = '/login';
                return;
            }

            if (!response.ok) {
                throw new Error('Failed to fetch notifications');
            }

            const data: Notification[] = await response.json();

            // Add read status and filter active/unexpired notifications
            const processedNotifications = data.map(notification => ({
                ...notification,
                is_read: readNotifications.has(notification.id)
            }));

            setNotifications(processedNotifications);
        } catch (error) {
            console.error('Error fetching notifications:', error);
            displayAlert('Failed to load notifications', 'error');
        } finally {
            setLoading(false);
        }
    }, [user, readNotifications]);

    // Mark notification as read
    const markAsRead = (notificationId: string) => {
        const newReadSet = new Set(readNotifications);
        newReadSet.add(notificationId);
        saveReadNotifications(newReadSet);

        setNotifications(prev =>
            prev.map(notif =>
                notif.id === notificationId
                    ? { ...notif, is_read: true }
                    : notif
            )
        );
    };

    // Mark notification as unread
    const markAsUnread = (notificationId: string) => {
        const newReadSet = new Set(readNotifications);
        newReadSet.delete(notificationId);
        saveReadNotifications(newReadSet);

        setNotifications(prev =>
            prev.map(notif =>
                notif.id === notificationId
                    ? { ...notif, is_read: false }
                    : notif
            )
        );
    };

    // Mark all as read
    const markAllAsRead = () => {
        const visibleNotificationIds = getFilteredNotifications().map(n => n.id);
        const newReadSet = new Set([...readNotifications, ...visibleNotificationIds]);
        saveReadNotifications(newReadSet);

        setNotifications(prev =>
            prev.map(notif => ({ ...notif, is_read: true }))
        );

        displayAlert('All notifications marked as read', 'success');
    };

    // Clear read notifications
    const hideReadNotifications = () => {
        const unreadNotifications = notifications.filter(notif => !notif.is_read);
        setNotifications(unreadNotifications);
        displayAlert('Read notifications hidden', 'success');
        setShowClearDialog(false);
    };

    // Get filtered notifications
    const getFilteredNotifications = () => {
        const now = new Date();

        return notifications.filter(notification => {
            // Type filter
            if (filterType !== 'all' && notification.type !== filterType) {
                return false;
            }

            // Priority filter
            if (filterPriority !== 'all' && notification.priority !== filterPriority) {
                return false;
            }

            // Read status filter
            if (!showRead && notification.is_read) {
                return false;
            }

            // Expired filter
            if (!showExpired && notification.expires_at) {
                const expiryDate = new Date(notification.expires_at);
                if (expiryDate < now) {
                    return false;
                }
            }

            // Only show active notifications
            if (!notification.is_active) {
                return false;
            }

            return true;
        });
    };

    // Initialize component
    useEffect(() => {
        document.title = "Notifications-Rider Management System";
        const handleResize = () => {
            setWidth(window.innerWidth);
            setShowFilters(window.innerWidth > 600);
        };
        window.addEventListener("resize", handleResize);

        fetchNotifications();

        // Set up auto-refresh every 5 minutes
        const interval = setInterval(fetchNotifications, 5 * 60 * 1000);

        return () => {
            window.removeEventListener("resize", handleResize);
            clearInterval(interval);
        };
    }, [fetchNotifications]);

    const filteredNotifications = getFilteredNotifications();
    const unreadCount = notifications.filter(n => !n.is_read && n.is_active).length;

    if (alert && alert.type === 'error') {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="text-red-600 font-bold mb-2">Error</div>
                    <div className="mb-4">{alert.message}</div>
                    <div className='flex gap-4'>
                        <button
                            className="px-4 py-2 bg-blue-600 text-white rounded"
                            onClick={() => fetchNotifications()}
                        >
                            Retry
                        </button>
                        <Link to='/login'>
                            <button onClick={() => { sessionStorage.clear(); }}
                                className="px-4 py-2 bg-blue-600 text-white rounded">
                                Login Again
                            </button>
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen overflow-hidden">
            <Helmet>
                <title>Notifications - Rider Management System</title>
                <meta name="description" content="View and manage your notifications." />
            </Helmet>
            {/* Alert */}
            {alert && (
                <div className="fixed top-6 right-6 z-50">
                    <Alert message={alert.message} type={alert.type} />
                </div>
            )}

            {width > 968 ? <Menu /> : <SmallMenu />}

            <div className="flex flex-col w-full">
                {/* Header */}
                <div className="bg-white border-b border-gray-200 px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <FiBell size={24} className="text-gray-700" />
                                {unreadCount > 0 && (
                                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                                        {unreadCount > 99 ? '99+' : unreadCount}
                                    </span>
                                )}
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
                                <p className="text-sm text-gray-600">
                                    {unreadCount > 0 ? `${unreadCount} unread notifications` : 'All caught up!'}
                                </p>
                            </div>
                        </div>
                        {/* Desktop Buttons */}
                        {width > 600 && (
                            <div className="flex items-center gap-3">
                                {unreadCount > 0 && (
                                    <button
                                        onClick={markAllAsRead}
                                        className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition"
                                    >
                                        <FiCheck size={16} />
                                        Mark All Read
                                    </button>
                                )}
                                <button
                                    onClick={fetchNotifications}
                                    disabled={loading}
                                    className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 transition"
                                >
                                    <FiRefreshCw className={loading ? 'animate-spin' : ''} size={16} />
                                    Refresh
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Mobile Top Bar with Icon Buttons */}
                {width <= 600 && (
                    <div className="flex justify-end gap-2 px-4 py-2 bg-white border-b border-gray-200 sticky top-0 z-10">
                        <button
                            onClick={() => setShowFilters((f: boolean) => !f)}
                            className="p-2 rounded-full bg-blue-600 text-white"
                            title="Show Filters"
                        >
                            <FiFilter size={20} />
                        </button>
                        <button
                            onClick={fetchNotifications}
                            disabled={loading}
                            className="p-2 rounded-full bg-blue-600 text-white disabled:opacity-50"
                            title="Refresh"
                        >
                            <FiRefreshCw className={loading ? 'animate-spin' : ''} size={20} />
                        </button>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllAsRead}
                                className="p-2 rounded-full bg-blue-100 text-blue-700"
                                title="Mark All Read"
                            >
                                <FiCheck size={20} />
                            </button>
                        )}
                    </div>
                )}

                {/* Filters */}
                {showFilters && (
                    <div className={`bg-white border-b border-gray-200 ${width <= 600 ? 'px-2 py-2 space-y-3' : 'px-6 py-3'}`}>
                        <div className={`flex flex-wrap gap-4 ${width <= 600 ? 'flex-col' : 'items-center'}`}>
                            <div className="flex items-center gap-2">
                                <FiFilter size={16} className="text-gray-500" />
                                <span className="text-sm font-medium text-gray-700">Filters:</span>
                            </div>
                            <select
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value)}
                                className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="all">All Types</option>
                                <option value="info">Info</option>
                                <option value="warning">Warning</option>
                                <option value="urgent">Urgent</option>
                                <option value="maintenance">Maintenance</option>
                            </select>
                            <select
                                value={filterPriority}
                                onChange={(e) => setFilterPriority(e.target.value)}
                                className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="all">All Priorities</option>
                                <option value="low">Low</option>
                                <option value="normal">Normal</option>
                                <option value="high">High</option>
                                <option value="urgent">Urgent</option>
                            </select>
                            <label className="flex items-center gap-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={showRead}
                                    onChange={(e) => setShowRead(e.target.checked)}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                Show Read
                            </label>
                            <label className="flex items-center gap-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={showExpired}
                                    onChange={(e) => setShowExpired(e.target.checked)}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                Show Expired
                            </label>
                            <div className="ml-auto text-sm text-gray-500">
                                Showing {filteredNotifications.length} of {notifications.length} notifications
                            </div>
                        </div>
                    </div>
                )}

                {/* Notifications List */}
                <div className="flex-1 overflow-auto bg-gray-50">
                    {loading ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-center">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                                <p className="mt-4 text-gray-600">Loading notifications...</p>
                            </div>
                        </div>
                    ) : filteredNotifications.length === 0 ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-center">
                                <FiBell size={64} className="mx-auto text-gray-300 mb-4" />
                                <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications found</h3>
                                <p className="text-gray-500">
                                    {notifications.length === 0
                                        ? "You don't have any notifications yet"
                                        : "No notifications match your current filters"
                                    }
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className={width <= 600 ? "px-2 py-2 space-y-3" : "p-6"}>
                            <div className="space-y-4">
                                {filteredNotifications.map((notification) => (
                                    <NotificationCard
                                        key={notification.id}
                                        notification={notification}
                                        onMarkAsRead={() => markAsRead(notification.id)}
                                        onMarkAsUnread={() => markAsUnread(notification.id)}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <ConfirmDialog
                isOpen={showClearDialog}
                title="Clear Read Notifications"
                message="Are you sure you want to clear all read notifications? This will remove them from your view."
                confirmText="Clear"
                cancelText="Cancel"
                onConfirm={hideReadNotifications}
                onCancel={() => setShowClearDialog(false)}
                type="danger"
            />
        </div>
    );
};

export default Notification;

// Notification Card Component
interface NotificationCardProps {
    notification: Notification;
    onMarkAsRead: () => void;
    onMarkAsUnread: () => void;
}

const NotificationCard: FC<NotificationCardProps> = ({
    notification,
    onMarkAsRead,
    onMarkAsUnread
}) => {
    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'info': return <FiInfo className="text-blue-600" />;
            case 'warning': return <FiAlertTriangle className="text-yellow-600" />;
            case 'urgent': return <FiAlertCircle className="text-red-600" />;
            case 'maintenance': return <FiTool className="text-purple-600" />;
            default: return <FiInfo className="text-gray-600" />;
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'info': return 'bg-blue-50 border-blue-200';
            case 'warning': return 'bg-yellow-50 border-yellow-200';
            case 'urgent': return 'bg-red-50 border-red-200';
            case 'maintenance': return 'bg-purple-50 border-purple-200';
            default: return 'bg-gray-50 border-gray-200';
        }
    };

    const getPriorityBadge = (priority: string) => {
        const colors = {
            low: 'bg-gray-100 text-gray-800',
            normal: 'bg-blue-100 text-blue-800',
            high: 'bg-orange-100 text-orange-800',
            urgent: 'bg-red-100 text-red-800'
        };
        return (
            <span className={`px-2 py-1 text-xs rounded-full ${colors[priority as keyof typeof colors]}`}>
                {priority.charAt(0).toUpperCase() + priority.slice(1)}
            </span>
        );
    };

    const getAudienceIcon = (audience: string) => {
        switch (audience) {
            case 'all': return <FiUsers className="text-gray-500" />;
            case 'admins': return <FiUser className="text-blue-500" />;
            default: return <FiUsers className="text-gray-500" />;
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / (1000 * 60));
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return date.toLocaleDateString();
    };

    const isExpired = notification.expires_at && new Date(notification.expires_at) < new Date();

    return (
        <div className={`relative rounded-lg border-l-4 shadow-sm hover:shadow-md transition-shadow ${getTypeColor(notification.type)} ${!notification.is_read ? 'ring-2 ring-blue-100' : ''} ${isExpired ? 'opacity-60' : ''}`}>
            {/* Unread indicator */}
            {!notification.is_read && (
                <div className="absolute top-3 right-3 w-2 h-2 bg-blue-500 rounded-full"></div>
            )}

            <div className="p-4 sm:p-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 gap-2">
                    <div className="flex items-center gap-2">
                        {getTypeIcon(notification.type)}
                        <h3 className="font-semibold text-gray-900 text-base sm:text-lg">
                            {notification.title}
                            {isExpired && <span className="text-red-500 ml-2 text-xs">(Expired)</span>}
                        </h3>
                        {getPriorityBadge(notification.priority)}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                        {getAudienceIcon(notification.target_audience)}
                        <span className="hidden sm:inline">{notification.target_audience === 'all' ? 'Everyone' : 'Admins'}</span>
                        <FiClock size={12} />
                        <span>{formatDate(notification.created_at)}</span>
                        <span className="hidden sm:inline">by {notification.created_by_admin}</span>
                    </div>
                </div>

                {/* Content */}
                <p className="text-gray-700 text-sm mb-2">{notification.content}</p>

                {/* Footer */}
                <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                        {notification.expires_at && (
                            <span>
                                <FiClock size={12} className="inline" /> Expires: {new Date(notification.expires_at).toLocaleDateString()}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {notification.is_read ? (
                            <button
                                onClick={onMarkAsUnread}
                                className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-gray-800 transition"
                                title="Mark as unread"
                            >
                                <FiEyeOff size={12} />
                                <span className="hidden sm:inline">Mark Unread</span>
                            </button>
                        ) : (
                            <button
                                onClick={onMarkAsRead}
                                className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition"
                                title="Mark as read"
                            >
                                <FiEye size={12} />
                                <span className="hidden sm:inline">Mark Read</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
