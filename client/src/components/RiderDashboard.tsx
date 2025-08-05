import { useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import Alert from './Alert';
import { useSharedValue } from './context/shareValue';
import Menu from './Menu';
import SmallMenu from './SmallMenu';

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

const RiderDashboard = () => {
    const { user, setUser } = useSharedValue();
    const [profile, setProfile] = useState<RiderProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [alert, setAlert] = useState<{ message: string; type?: 'success' | 'error' | 'info' } | null>(null);
    const [editName, setEditName] = useState(false);
    const [name, setName] = useState('');
    const [photoUrl, setPhotoUrl] = useState<string | undefined>('');
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Fetch rider profile and shifts
    useEffect(() => {
        const fetchProfile = async () => {
            setLoading(true);
            try {
                const res = await fetch(`${import.meta.env.VITE_API_URL}/rider/me`, { credentials: 'include' });
                if (res.status === 401) {
                    sessionStorage.removeItem('user');
                    window.location.href = '/login';
                    return;
                }
                if (!res.ok) throw new Error('Failed to load profile');
                const data: RiderProfile = await res.json();
                setProfile(data);
                setName(data.name);
                setPhotoUrl(data.photo_url);
            } catch {
                setAlert({ message: 'Failed to load profile', type: 'error' });
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, []);

    // Handle name edit
    const handleNameSave = async () => {
        if (!name.trim()) {
            setAlert({ message: 'Name cannot be empty', type: 'error' });
            return;
        }
        try {
            setLoading(true);
            const res = await fetch(`${import.meta.env.VITE_API_URL}/rider/me`, {
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

    // Handle image upload (simulate upload, store as base64 for demo)
    const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            // Convert to base64 (simulate upload)
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64 = reader.result as string;
                // Save to backend
                const res = await fetch(`${import.meta.env.VITE_API_URL}/rider/me`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ name, photo_url: base64 }),
                });
                if (!res.ok) throw new Error('Failed to update photo');
                const updated = await res.json();
                setPhotoUrl(updated.photo_url);
                setProfile((prev) => prev ? { ...prev, photo_url: updated.photo_url } : prev);
                setAlert({ message: 'Profile photo updated', type: 'success' });
                setUser({ ...user!, photo_url: updated.photo_url });
            };
            reader.readAsDataURL(file);
        } catch {
            setAlert({ message: 'Failed to update photo', type: 'error' });
        } finally {
            setUploading(false);
        }
    };

    // Responsive width
    const [width, setWidth] = useState(window.innerWidth);
    useEffect(() => {
        const handleResize = () => setWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

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

    return (
        <div className="flex h-screen overflow-hidden">
            <Helmet>
                <title>Rider Dashboard - Rider Management System</title>
                <meta name="description" content="Rider dashboard: view shifts, update profile." />
            </Helmet>
            {alert && (
                <div className="fixed top-6 right-6 z-50">
                    <Alert message={alert.message} type={alert.type} />
                </div>
            )}
            {width > 968 ? <Menu /> : <SmallMenu />}
            <div className="flex flex-col items-center w-full px-2 py-6 overflow-y-auto">
                <h1 className="text-2xl font-bold mb-2">Welcome, {profile.name.split(' ')[0]}</h1>
                <div className="flex flex-col md:flex-row gap-8 w-full max-w-4xl">
                    {/* Profile Card */}
                    <div className="bg-white rounded-2xl shadow-lg p-6 flex flex-col items-center w-full md:w-1/3">
                        <div className="relative group mb-3">
                            <img
                                src={photoUrl || '/rider.png'}
                                alt="Profile"
                                className="w-28 h-28 rounded-full object-cover border-4 border-blue-200 shadow"
                                onError={e => (e.currentTarget.src = '/rider.png')}
                            />
                            <button
                                className="absolute bottom-2 right-2 bg-blue-600 text-white rounded-full p-2 shadow hover:bg-blue-700 transition"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                                title="Change photo"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6-6m2 2a2.828 2.828 0 11-4-4 2.828 2.828 0 014 4z" /></svg>
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
                        <div className="flex items-center gap-2 mb-2">
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
                                    >Save</button>
                                    <button
                                        className="ml-1 px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
                                        onClick={() => { setEditName(false); setName(profile.name); }}
                                        disabled={loading}
                                    >Cancel</button>
                                </>
                            ) : (
                                <>
                                    <span className="text-lg font-semibold">{profile.name}</span>
                                    <button
                                        className="ml-1 px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm"
                                        onClick={() => setEditName(true)}
                                    >Edit</button>
                                </>
                            )}
                        </div>
                        <div className="text-gray-600 text-sm mb-1">{profile.email}</div>
                        <div className="text-gray-600 text-sm mb-1">{profile.phone}</div>
                        <div className="text-gray-500 text-xs">Member since {new Date(profile.created_at).toLocaleDateString()}</div>
                    </div>
                    {/* Shifts Table */}
                    <div className="flex-1 bg-white rounded-2xl shadow-lg p-6 overflow-x-auto">
                        <h2 className="text-lg font-semibold mb-4">My Shifts</h2>
                        {profile.shifts.length === 0 ? (
                            <div className="text-gray-500">No shifts assigned yet.</div>
                        ) : (
                            <table className="min-w-full text-sm">
                                <thead>
                                    <tr className="bg-blue-50">
                                        <th className="py-2 px-3 text-left">Date</th>
                                        <th className="py-2 px-3 text-left">Time</th>
                                        <th className="py-2 px-3 text-left">Zone</th>
                                        <th className="py-2 px-3 text-left">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {profile.shifts.map(shift => (
                                        <tr key={shift.shift_id} className="border-b last:border-b-0">
                                            <td className="py-2 px-3">{shift.start_date} - {shift.end_date}</td>
                                            <td className="py-2 px-3">{shift.start_time} - {shift.end_time}</td>
                                            <td className="py-2 px-3">{shift.zone_name}</td>
                                            <td className="py-2 px-3">
                                                <span className={`capitalize px-2 py-1 rounded text-xs font-medium ${shift.status === 'assigned' ? 'bg-green-100 text-green-800' :
                                                    shift.status === 'ongoing' ? 'bg-blue-100 text-blue-800' :
                                                        shift.status === 'completed' ? 'bg-purple-100 text-purple-800' :
                                                            shift.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                                                'bg-gray-100 text-gray-800'}`}>{shift.status}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RiderDashboard;
