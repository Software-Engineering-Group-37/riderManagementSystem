import React, { useCallback, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { FiArrowLeft, FiCamera, FiEdit2, FiEye, FiEyeOff, FiLock, FiSave, FiUser } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import Alert from './Alert';
import { useSharedValue } from "./context/shareValue";
import Menu from './Menu';
import SmallMenu from './SmallMenu';

// Update the interface to match your database:
interface User {
    id: string;
    name: string;
    email: string;
    role_name: string;
    created_at: string;
    photo_url?: string; // Changed from avatar_url
}

const Profile = () => {
    const navigate = useNavigate();
    const [width, setWidth] = useState(window.innerWidth);
    const { user, setUser } = useSharedValue();
    const [alert, setAlert] = useState<{ message: string; type?: 'success' | 'error' | 'info' } | null>(null);

    // Profile states
    const [profileData, setProfileData] = useState<User | null>(null);
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [editedName, setEditedName] = useState('');
    const [editedEmail, setEditedEmail] = useState('');

    // Password states
    const [showChangePassword, setShowChangePassword] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPasswords, setShowPasswords] = useState({
        current: false,
        new: false,
        confirm: false
    });

    // Avatar states
    const [avatarSrc, setAvatarSrc] = useState<string | undefined>(undefined);
    const [avatarFile, setAvatarFile] = useState<File | null>(null);

    // Loading states
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);

    document.title = "Profile-Rider Management System";

    // Helper to show alert
    const displayAlert = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
        setAlert({ message, type });
        setTimeout(() => setAlert(null), 4000);
    };

    // Fetch user profile data
    const fetchProfile = useCallback(async () => {
        if (!user) return;

        setLoading(true);
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/profile`, {
                credentials: 'include'
            });

            if (response.status === 401) {
                sessionStorage.removeItem('user');
                navigate('/login');
                return;
            }

            if (!response.ok) {
                throw new Error('Failed to fetch profile');
            }

            const data = await response.json();
            console.log('Profile data:', data); // Debug log

            setProfileData(data);
            setEditedName(data.name);
            setEditedEmail(data.email);

            // Load existing photo if available
            if (data.photo_url) {
                console.log('Setting avatar src:', data.photo_url); // Debug log
                setAvatarSrc(data.photo_url);
            } else {
                setAvatarSrc(undefined);
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
            displayAlert('Failed to load profile data', 'error');
        } finally {
            setLoading(false);
        }
    }, [user, navigate]);

    // Handle window resize
    useEffect(() => {
        const handleResize = () => setWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        fetchProfile();
        return () => window.removeEventListener('resize', handleResize);
    }, [user, fetchProfile]);

    // Handle avatar upload
    const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                displayAlert('File size must be less than 5MB', 'error');
                return;
            }

            // Validate file type
            if (!file.type.startsWith('image/')) {
                displayAlert('Please select a valid image file', 'error');
                return;
            }

            setAvatarFile(file);
            const reader = new FileReader();
            reader.onload = () => {
                setAvatarSrc(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    // Upload avatar
    const uploadAvatar = async () => {
        if (!avatarFile || !user) return;

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('avatar', avatarFile);

            const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/profile/avatar`, {
                method: 'POST',
                credentials: 'include',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to upload avatar');
            }

            const result = await response.json();
            setAvatarSrc(result.photo_url);
            setAvatarFile(null);

            // Update profile data with new photo URL
            setProfileData(prev => prev ? { ...prev, photo_url: result.photo_url } : null);

            // ✅ IMPORTANT: Update shared context with new photo
            const currentUser = JSON.parse(sessionStorage.getItem('user') || '{}');
            const updatedUserForSession = {
                ...currentUser,
                photo_url: result.photo_url
            };

            sessionStorage.setItem('user', JSON.stringify(updatedUserForSession));
            setUser(updatedUserForSession); // This will update the menu immediately

            displayAlert('Profile picture updated successfully', 'success');

            // Refresh the profile data to get the latest info
            await fetchProfile();

        } catch (error) {
            console.error('Error uploading avatar:', error);
            displayAlert(error instanceof Error ? error.message : 'Failed to upload avatar', 'error');
        } finally {
            setUploading(false);
        }
    };

    // Remove profile photo
    const removeProfilePhoto = async () => {
        if (!window.confirm('Are you sure you want to remove your profile photo?')) {
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/profile/photo`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete photo');
            }

            // Update local state
            setProfileData(prev => prev ? { ...prev, photo_url: undefined } : null);
            setAvatarSrc(undefined);

            // Update shared context
            const currentUser = JSON.parse(sessionStorage.getItem('user') || '{}');
            const updatedUserForSession = {
                ...currentUser,
                photo_url: null
            };

            sessionStorage.setItem('user', JSON.stringify(updatedUserForSession));
            setUser(updatedUserForSession);

            displayAlert('Profile photo removed successfully', 'success');
        } catch (error) {
            console.error('Error removing photo:', error);
            displayAlert(error instanceof Error ? error.message : 'Failed to remove photo', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Handle profile update
    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!editedName || !editedEmail) {
            displayAlert('Name and email are required', 'error');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/profile`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    name: editedName,
                    email: editedEmail
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update profile');
            }

            const updatedUser = await response.json();
            console.log('Updated user data:', updatedUser);

            // Update the profile data state
            setProfileData(updatedUser);

            // ✅ IMPORTANT: Update the shared context with new user data
            const currentUser = JSON.parse(sessionStorage.getItem('user') || '{}');
            const updatedUserForSession = {
                ...currentUser,
                name: updatedUser.name,
                email: updatedUser.email,
                photo_url: updatedUser.photo_url
            };

            // Update both sessionStorage and shared context
            sessionStorage.setItem('user', JSON.stringify(updatedUserForSession));
            setUser(updatedUserForSession); // This will update the menu immediately

            setIsEditingProfile(false);
            displayAlert('Profile updated successfully', 'success');
        } catch (error) {
            console.error('Error updating profile:', error);
            displayAlert(error instanceof Error ? error.message : 'Failed to update profile', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Handle password change
    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!currentPassword || !newPassword || !confirmPassword) {
            displayAlert('All password fields are required', 'error');
            return;
        }

        if (newPassword !== confirmPassword) {
            displayAlert('New passwords do not match', 'error');
            return;
        }

        if (newPassword.length < 6) {
            displayAlert('New password must be at least 6 characters', 'error');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/profile/password`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    currentPassword,
                    newPassword
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to change password');
            }

            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setShowChangePassword(false);
            displayAlert('Password changed successfully', 'success');
        } catch (error) {
            console.error('Error changing password:', error);
            displayAlert(error instanceof Error ? error.message : 'Failed to change password', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Get user initials for avatar fallback
    const getInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    return (
        <div className="flex h-screen overflow-hidden">
            <Helmet>
                <title>Profile - Rider Management System</title>
                <meta name="description" content="Manage your profile settings and preferences." />
            </Helmet>
            {/* Alert */}
            {alert && (
                <div className="fixed top-6 right-6 z-50">
                    <Alert message={alert.message} type={alert.type} />
                </div>
            )}

            {width > 968 ? <Menu /> : <SmallMenu />}

            <div className="flex flex-col w-full bg-gray-50">
                {/* Header */}
                <div className="bg-white border-b border-gray-200 px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate(-1)}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <FiArrowLeft size={20} className="text-gray-600" />
                            </button>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
                                <p className="text-sm text-gray-600 mt-1">
                                    Manage your account information and security
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-6">
                    {loading && !profileData ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            <span className="ml-3 text-gray-600">Loading profile...</span>
                        </div>
                    ) : (
                        <div className="max-w-4xl mx-auto space-y-6">
                            {/* Profile Picture Section */}
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                                <div className="px-6 py-4 border-b border-gray-200">
                                    <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                                        <FiCamera className="text-blue-600" />
                                        Profile Picture
                                    </h3>
                                </div>
                                <div className="p-3">
                                    <div className="flex items-center gap-6">
                                        <div className="relative">
                                            {avatarSrc ? (
                                                <img
                                                    src={avatarSrc}
                                                    alt="Profile"
                                                    className="w-24 h-24 rounded-full object-cover border-4 border-gray-200"
                                                />
                                            ) : (
                                                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold border-4 border-gray-200">
                                                    {profileData ? getInitials(profileData.name) : 'U'}
                                                </div>
                                            )}

                                            {/* Upload overlay */}
                                            {uploading && (
                                                <div className="absolute inset-0 bg-[#ffffff74] bg-opacity-50 rounded-full flex items-center justify-center">
                                                    <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                </div>
                                            )}

                                            <label
                                                htmlFor="avatar-upload"
                                                className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700 transition-colors shadow-lg"
                                            >
                                                <FiCamera size={14} />
                                            </label>
                                            <input
                                                id="avatar-upload"
                                                type="file"
                                                accept="image/*"
                                                onChange={handleAvatarChange}
                                                className="hidden"
                                                disabled={uploading}
                                            />
                                        </div>

                                        <div className="flex-1">
                                            <h4 className="text-sm font-medium text-gray-900">Profile Picture</h4>
                                            <p className="text-sm text-gray-500 mt-1">
                                                JPG, PNG or GIF. Max size 5MB. Recommended size 400x400px.
                                            </p>

                                            {/* Action buttons */}
                                            <div className="mt-4 flex flex-wrap items-center gap-3">
                                                {/* Upload new photo button */}
                                                <label className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm flex items-center gap-2 disabled:opacity-50">
                                                    <FiCamera size={16} />
                                                    {avatarSrc ? 'Change Photo' : 'Upload Photo'}
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={handleAvatarChange}
                                                        className="hidden"
                                                        disabled={uploading}
                                                    />
                                                </label>

                                                {/* Remove photo button-only show if there's a photo */}
                                                {avatarSrc && !avatarFile && (
                                                    <button
                                                        onClick={removeProfilePhoto}
                                                        disabled={loading || uploading}
                                                        className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors text-sm flex items-center gap-2 disabled:opacity-50"
                                                    >
                                                        {loading ? (
                                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                        ) : (
                                                            <FiCamera size={16} />
                                                        )}
                                                        Remove Photo
                                                    </button>
                                                )}
                                            </div>

                                            {/* Save/Cancel buttons for new upload */}
                                            {avatarFile && (
                                                <div className="mt-3 flex items-center gap-3">
                                                    <button
                                                        onClick={uploadAvatar}
                                                        disabled={uploading}
                                                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 text-sm flex items-center gap-2"
                                                    >
                                                        {uploading ? (
                                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                        ) : (
                                                            <FiSave size={16} />
                                                        )}
                                                        {uploading ? 'Uploading...' : 'Save New Photo'}
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setAvatarFile(null);
                                                            setAvatarSrc(profileData?.photo_url || undefined);
                                                        }}
                                                        disabled={uploading}
                                                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Personal Information Section */}
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                                    <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                                        <FiUser className="text-blue-600" />
                                        Personal Information
                                    </h3>
                                    {!isEditingProfile && (
                                        <button
                                            onClick={() => setIsEditingProfile(true)}
                                            className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                        >
                                            <FiEdit2 size={16} />
                                            Edit
                                        </button>
                                    )}
                                </div>
                                <div className="p-6">
                                    {isEditingProfile ? (
                                        <form onSubmit={handleProfileUpdate} className="space-y-4">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Full Name *
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={editedName}
                                                        onChange={(e) => setEditedName(e.target.value)}
                                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                        disabled={loading}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Email Address *
                                                    </label>
                                                    <input
                                                        type="email"
                                                        value={editedEmail}
                                                        onChange={(e) => setEditedEmail(e.target.value)}
                                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                        disabled={loading}
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 pt-4">
                                                <button
                                                    type="submit"
                                                    disabled={loading}
                                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                                                >
                                                    {loading ? (
                                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                    ) : (
                                                        <FiSave size={16} />
                                                    )}
                                                    Save Changes
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setIsEditingProfile(false);
                                                        setEditedName(profileData?.name || '');
                                                        setEditedEmail(profileData?.email || '');
                                                    }}
                                                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </form>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                                <p className="text-gray-900">{profileData?.name}</p>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                                                <p className="text-gray-900">{profileData?.email}</p>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                                                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                                                    {profileData?.role_name}
                                                </span>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Member Since</label>
                                                <p className="text-gray-900">
                                                    {profileData?.created_at && new Date(profileData.created_at).toLocaleDateString('en-US', {
                                                        year: 'numeric',
                                                        month: 'long',
                                                        day: 'numeric'
                                                    })}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Security Section */}
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                                    <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                                        <FiLock className="text-blue-600" />
                                        Security
                                    </h3>
                                    {!showChangePassword && (
                                        <button
                                            onClick={() => setShowChangePassword(true)}
                                            className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                        >
                                            <FiLock size={16} />
                                            Change Password
                                        </button>
                                    )}
                                </div>
                                <div className="p-6">
                                    {showChangePassword ? (
                                        <form onSubmit={handlePasswordChange} className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Current Password *
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        type={showPasswords.current ? 'text' : 'password'}
                                                        value={currentPassword}
                                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                                        className="w-full border border-gray-300 rounded-md px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                        disabled={loading}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                                    >
                                                        {showPasswords.current ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        New Password *
                                                    </label>
                                                    <div className="relative">
                                                        <input
                                                            type={showPasswords.new ? 'text' : 'password'}
                                                            value={newPassword}
                                                            onChange={(e) => setNewPassword(e.target.value)}
                                                            className="w-full border border-gray-300 rounded-md px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                            disabled={loading}
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                                                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                                        >
                                                            {showPasswords.new ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                                                        </button>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Confirm New Password *
                                                    </label>
                                                    <div className="relative">
                                                        <input
                                                            type={showPasswords.confirm ? 'text' : 'password'}
                                                            value={confirmPassword}
                                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                                            className="w-full border border-gray-300 rounded-md px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                            disabled={loading}
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                                                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                                        >
                                                            {showPasswords.confirm ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 pt-4">
                                                <button
                                                    type="submit"
                                                    disabled={loading || !currentPassword || !newPassword || !confirmPassword}
                                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                                                >
                                                    {loading ? (
                                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                    ) : (
                                                        <FiLock size={16} />
                                                    )}
                                                    Change Password
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setShowChangePassword(false);
                                                        setCurrentPassword('');
                                                        setNewPassword('');
                                                        setConfirmPassword('');
                                                    }}
                                                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </form>
                                    ) : (
                                        <div>
                                            <p className="text-gray-600 mb-4">
                                                Keep your account secure by using a strong password that you don't use elsewhere.
                                            </p>
                                            <div className="flex items-center text-sm text-gray-500">
                                                <FiLock className="mr-2" />
                                                Last changed: Never (or show actual date)
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Profile;
