import { useCallback, useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { FiCamera, FiCheck, FiEdit2, FiLogOut, FiX } from 'react-icons/fi';
import Alert from './Alert';
import ConfirmDialog from './ConfirmDialog';
import { useSharedValue } from './context/shareValue';

interface Shift {
    shift_id: string;
    start_date: string;
    end_date: string;
    start_time: string;
    end_time: string;
    status: string;
    created_at: string;
    zone_name: string;
    assigned_by_admin: string;
}

interface RiderProfile {
    id: string;
    name: string;
    email: string;
    phone: string;
    photo_url?: string;
    is_active: boolean;
    created_at: string;
    shifts: Shift[];
}

interface Announcement {
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
    is_read?: boolean;
}

const RiderDashboard = () => {
    const { user, setUser, logout } = useSharedValue();
    const [profile, setProfile] = useState<RiderProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [alert, setAlert] = useState<{ message: string; type?: 'success' | 'error' | 'info' } | null>(null);
    const [editName, setEditName] = useState(false);
    const [name, setName] = useState('');
    const [photoUrl, setPhotoUrl] = useState<string | undefined>('');
    const [uploading, setUploading] = useState(false);
    const [notifications, setNotifications] = useState<Announcement[]>([]);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const prevShiftIds = useRef<Set<string>>(new Set());

    // Fetch profile (on load and after photo upload)
    const fetchProfile = useCallback(async () => {
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/riders/profile`, { credentials: 'include' });
            if (!res.ok) throw new Error('Failed to load profile');
            const data = await res.json();
            setName(data.name);
            setPhotoUrl(data.photo_url);
            // Remove setUser here, or use a stable value
            return data;
        } catch {
            setAlert({ message: 'Failed to load profile', type: 'error' });
            return null;
        }
    }, []); // Remove user, setUser from dependencies

    const fetchShifts = useCallback(async () => {
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/me`, { credentials: 'include' });
            if (!res.ok) throw new Error('Failed to load shifts');
            const data = await res.json();
            return data.shifts || [];
        } catch {
            setAlert({ message: 'Failed to load shifts', type: 'error' });
            return [];
        }
    }, []);

    // Fetch profile on mount and after photo/name update
    useEffect(() => {
        // Only fetch profile once on mount
        fetchProfile().then(profileData => {
            if (profileData) setProfile(profileData);
        }).finally(() => setLoading(false));
    }, [fetchProfile]); // Only run once

    // Fetch shifts on mount and when needed
    useEffect(() => {
        if (!user) return; // Only fetch if user is set
        fetchShifts()
            .then(shifts => {
                setProfile(prev => prev ? { ...prev, shifts } : prev);
            });
    }, [user, fetchShifts]);

    // Fetch announcements for rider
    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                // Fetch announcements
                const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/announcements`, {
                    credentials: 'include'
                });
                if (!res.ok) throw new Error('Failed to fetch notifications');
                const data = await res.json();
                const riderNotifs = data.filter(
                    (n: Announcement) => n.is_active
                );
                setNotifications(riderNotifs);
            } catch {
                console.error('Failed to fetch notifications');
                setAlert({ message: 'Failed to load notifications', type: 'error' });
            }
        };
        fetchNotifications();
    }, []);

    // Handle name edit
    const handleNameSave = async () => {
        if (!name.trim()) {
            setAlert({ message: 'Name cannot be empty', type: 'error' });
            return;
        }
        try {
            setLoading(true);
            // Update rider profile
            const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/rider-profile`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ name, photo_url: photoUrl }),
            });
            if (!res.ok) throw new Error('Failed to update name');
            const updated = await res.json();
            setProfile((prev) => prev ? { ...prev, name: updated.name } : prev);
            setEditName(false);
            setAlert({ message: 'Name updated successfully', type: 'success' });
            setUser({ ...user!, name: updated.name, photo_url: updated.photo_url });
        } catch {
            setAlert({ message: 'Failed to update name', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    // Handle image upload (Cloudinary via backend)
    const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('avatar', file);

            // Upload rider avatar
            const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/rider-profile/avatar`, {
                method: 'POST',
                credentials: 'include',
                body: formData,
            });

            if (!res.ok) throw new Error('Failed to upload photo');
            await res.json();

            // Fetch the latest profile to get the new photo_url
            await fetchProfile();

            setAlert({ message: 'Profile photo updated', type: 'success' });
        } catch {
            setAlert({ message: 'Failed to update photo', type: 'error' });
        } finally {
            setUploading(false);
        }
    };

    // Notification logic (example)
    useEffect(() => {
        if (notifications.length > 0 && "Notification" in window) {
            // Find unread, high-priority, or new notifications
            const newNotifs = notifications.filter(n => !n.is_read && n.priority === 'urgent');
            newNotifs.forEach(n => {
                if (Notification.permission === "granted") {
                    new Notification(n.title, {
                        body: n.content,
                        icon: "zippy_logo.svg"
                    });
                }
            });
        }
    }, [notifications]);

    useEffect(() => {
        if ("Notification" in window && Notification.permission !== "granted") {
            Notification.requestPermission();
        }
    }, []);

    useEffect(() => {
        if (!profile?.shifts) return;

        // Get current and previous shift IDs
        const currentIds = new Set(profile.shifts.map(s => s.shift_id));
        const prevIds = prevShiftIds.current;

        // Find new shifts (present now, not before)
        const newShifts = profile.shifts.filter(s => !prevIds.has(s.shift_id));

        // Show notification for each new shift
        if ("Notification" in window && Notification.permission === "granted") {
            newShifts.forEach(shift => {
                new Notification("New Shift Assigned!", {
                    body: `Shift on ${new Date(shift.start_date).toLocaleDateString()} (${shift.start_time.slice(0, 5)} - ${shift.end_time.slice(0, 5)}) in ${shift.zone_name}`,
                    icon: "zippy_logo.svg"
                });
            });
        }

        // Update previous shift IDs
        prevShiftIds.current = currentIds;
    }, [profile?.shifts]);

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Loading dashboard...</span>
            </div>
        );
    }

    if (!profile) {
        return <div className="flex h-screen items-center justify-center text-gray-500">Profile not found.</div>;
    }

    // Helper to split shifts
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todaysShifts = (profile.shifts ?? []).filter(shift => {
        const start = new Date(shift.start_date);
        const end = new Date(shift.end_date);
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);
        // Only shifts that start and end today
        return start.getTime() === today.getTime() && end.getTime() === today.getTime();
    });

    const upcomingShifts = (profile.shifts ?? []).filter(shift => {
        const start = new Date(shift.start_date);
        const end = new Date(shift.end_date);
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);
        // Shifts that start after today OR end after today
        return start.getTime() > today.getTime() || end.getTime() > today.getTime();
    });

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex flex-col">
            <Helmet>
                <title>Rider Dashboard - Rider Management System</title>
                <meta name="description" content="Rider dashboard: view shifts, update profile." />
            </Helmet>
            {alert && (
                <div className="fixed top-6 right-6 z-50">
                    <Alert message={alert.message} type={alert.type} />
                </div>
            )}

            {/* Top Bar */}
            <header className="flex items-center justify-between px-4 py-3 bg-white shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <img src="/zippy_logo.svg" alt="Logo" className="h-10" />
                    <span className="font-bold text-lg text-blue-700">Rider Dashboard</span>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <img
                            src={photoUrl || '/rider.png'}
                            alt="Profile"
                            className="w-10 h-10 rounded-full object-cover border-2 border-blue-200 shadow cursor-pointer"
                            onClick={() => fileInputRef.current?.click()}
                            onError={e => (e.currentTarget.src = '/rider.png')}
                        />
                        <button
                            className="absolute bottom-0 right-0 bg-blue-600 text-white rounded-full p-1 shadow hover:bg-blue-700 transition"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            title="Change photo"
                        >
                            <FiCamera className="w-4 h-4" />
                        </button>
                        <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handlePhotoChange}
                            disabled={uploading}
                        />
                    </div>
                    <button
                        onClick={() => setShowLogoutConfirm(true)}
                        className="flex items-center gap-1 px-3 py-2 bg-red-50 text-red-600 rounded hover:bg-red-100 transition"
                        title="Logout"
                    >
                        <FiLogOut className="w-5 h-5" />
                        <span className="hidden sm:inline">Logout</span>
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex flex-col items-center px-2 py-6 w-full max-w-3xl mx-auto">
                {/* Profile Card */}
                <div className="w-full bg-white rounded-2xl shadow-lg p-5 flex flex-col items-center mb-6">
                    <div className="flex flex-col items-center w-full">
                        <div className="flex items-center gap-2 mb-2 w-full justify-center">
                            {editName ? (
                                <>
                                    <input
                                        className="border border-gray-300 rounded px-2 py-1 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-blue-400"
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        disabled={loading}
                                    />
                                    <button
                                        className="ml-1 px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                                        onClick={handleNameSave}
                                        disabled={loading}
                                    ><FiCheck /></button>
                                    <button
                                        className="ml-1 px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
                                        onClick={() => { setEditName(false); setName(profile.name); }}
                                        disabled={loading}
                                    ><FiX /></button>
                                </>
                            ) : (
                                <>
                                    <span className="text-lg font-semibold">{profile.name}</span>
                                    <button
                                        className="ml-1 px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm"
                                        onClick={() => setEditName(true)}
                                    ><FiEdit2 /></button>
                                </>
                            )}
                        </div>
                        <div className="text-gray-600 text-sm mb-1">{profile.email}</div>
                        <div className="text-gray-600 text-sm mb-1">{profile.phone}</div>
                        <div className="text-gray-500 text-xs">Member since {new Date(profile.created_at).toLocaleDateString()}</div>
                    </div>
                </div>

                {/* Shifts List */}
                <div className="w-full bg-white rounded-2xl shadow-lg p-5 mb-6">
                    <h2 className="text-lg font-semibold mb-4 text-blue-700">Today's Shifts</h2>
                    {todaysShifts.length === 0 ? (
                        <div className="text-gray-500">No shifts for today.</div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            {todaysShifts.map(shift => {
                                const startDate = new Date(shift.start_date);
                                const endDate = new Date(shift.end_date);
                                const startTime = shift.start_time.slice(0, 5);
                                const endTime = shift.end_time.slice(0, 5);
                                const dateString = startDate.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) +
                                    (shift.start_date !== shift.end_date
                                        ? ` - ${endDate.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}`
                                        : '');

                                return (
                                    <div key={shift.shift_id} className="border rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between bg-blue-50">
                                        <div>
                                            <div className="font-semibold text-blue-800">{dateString}</div>
                                            <div className="text-gray-700 text-sm">
                                                {startTime} - {endTime}
                                            </div>
                                            <div className="text-gray-600 text-sm">Zone: {shift.zone_name}</div>
                                        </div>
                                        <div className="mt-2 sm:mt-0">
                                            <span className={`capitalize px-3 py-1 rounded text-xs font-medium ${shift.status === 'assigned' ? 'bg-green-100 text-green-800' :
                                                shift.status === 'ongoing' ? 'bg-blue-100 text-blue-800' :
                                                    shift.status === 'completed' ? 'bg-purple-100 text-purple-800' :
                                                        shift.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                                            'bg-gray-100 text-gray-800'
                                                }`}>
                                                {shift.status}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="w-full bg-white rounded-2xl shadow-lg p-5">
                    <h2 className="text-lg font-semibold mb-4 text-blue-700">Upcoming Shifts</h2>
                    {upcomingShifts.length === 0 ? (
                        <div className="text-gray-500">No upcoming shifts.</div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            {upcomingShifts.map(shift => {
                                const startDate = new Date(shift.start_date);
                                const endDate = new Date(shift.end_date);
                                const startTime = shift.start_time.slice(0, 5);
                                const endTime = shift.end_time.slice(0, 5);
                                const dateString = startDate.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) +
                                    (shift.start_date !== shift.end_date
                                        ? ` - ${endDate.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}`
                                        : '');

                                return (
                                    <div key={shift.shift_id} className="border rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between bg-blue-50">
                                        <div>
                                            <div className="font-semibold text-blue-800">{dateString}</div>
                                            <div className="text-gray-700 text-sm">
                                                {startTime} - {endTime}
                                            </div>
                                            <div className="text-gray-600 text-sm">Zone: {shift.zone_name}</div>
                                        </div>
                                        <div className="mt-2 sm:mt-0">
                                            <span className={`capitalize px-3 py-1 rounded text-xs font-medium ${shift.status === 'assigned' ? 'bg-green-100 text-green-800' :
                                                shift.status === 'ongoing' ? 'bg-blue-100 text-blue-800' :
                                                    shift.status === 'completed' ? 'bg-purple-100 text-purple-800' :
                                                        shift.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                                            'bg-gray-100 text-gray-800'
                                                }`}>
                                                {shift.status}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </main>

            <ConfirmDialog
                isOpen={showLogoutConfirm}
                title="Confirm Logout"
                message="Are you sure you want to log out?"
                confirmText="Logout"
                cancelText="Cancel"
                onConfirm={() => {
                    setShowLogoutConfirm(false);
                    logout();
                }}
                onCancel={() => setShowLogoutConfirm(false)}
                type="danger"
            />
        </div>
    );
};

export default RiderDashboard;
