import type { FC } from "react";
import { useCallback, useEffect, useState } from "react";
import {
    FiClock,
    FiEdit2,
    FiMap,
    FiMapPin,
    FiPlus,
    FiRefreshCw,
    // FiSettings,
    FiShield,
    FiSpeaker,
    FiTrash
} from "react-icons/fi";
import Alert from "./Alert";
import Menu from "./Menu";
import SmallMenu from "./SmallMenu";
import { useSharedValue } from './context/shareValue';

// Type definitions
interface Zone {
    id: string;
    name: string;
    latitude?: number;
    longitude?: number;
    created_at: string;
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
}

interface Role {
    id: string;
    name: string;
    description?: string;
    created_at: string;
}

// interface SystemConfig {
//     [key: string]: {
//         value: string | number | boolean | object | null;
//         description: string;
//         data_type: 'string' | 'number' | 'boolean' | 'json';
//         updated_at: string;
//         updated_by_admin?: string;
//     };
// }

const SystemSettings: FC = () => {
    const [width, setWidth] = useState(window.innerWidth);
    const [activeTab, setActiveTab] = useState('roles');
    const [alert, setAlert] = useState<{ message: string; type?: 'success' | 'error' | 'info' } | null>(null);

    // Data states
    const [roles, setRoles] = useState<Role[]>([]);
    const [zones, setZones] = useState<Zone[]>([]);
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    // const [systemConfig, setSystemConfig] = useState<SystemConfig>({});

    // Loading states
    const [rolesLoading, setRolesLoading] = useState(false);
    const [zonesLoading, setZonesLoading] = useState(false);
    const [announcementsLoading, setAnnouncementsLoading] = useState(false);
    // const [configLoading, setConfigLoading] = useState(false);

    // Modal states
    const [showRoleModal, setShowRoleModal] = useState(false);
    const [showZoneModal, setShowZoneModal] = useState(false);
    const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
    const [editingRole, setEditingRole] = useState<Role | null>(null);
    const [editingZone, setEditingZone] = useState<Zone | null>(null);
    const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);

    const { user } = useSharedValue();


    // Helper to show alert
    const displayAlert = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
        setAlert({ message, type });
        setTimeout(() => setAlert(null), 3000);
    };

    // Fetch roles
    const fetchRoles = useCallback(async () => {
        if (!user) return;

        setRolesLoading(true);
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/roles`, {
                credentials: 'include'
            });

            if (response.status === 401) {
                sessionStorage.removeItem('user');
                window.location.href = '/login';
                return;
            }

            if (!response.ok) {
                throw new Error('Failed to fetch roles');
            }

            const data = await response.json();
            setRoles(data);
        } catch (error) {
            console.error('Error fetching roles:', error);
            displayAlert('Failed to load roles', 'error');
        } finally {
            setRolesLoading(false);
        }
    }, [user]);

    // Fetch zones
    const fetchZones = useCallback(async () => {
        if (!user) return;

        setZonesLoading(true);
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/zones`, {
                credentials: 'include'
            });

            if (response.status === 401) {
                sessionStorage.removeItem('user');
                window.location.href = '/login';
                return;
            }

            if (!response.ok) {
                throw new Error('Failed to fetch zones');
            }

            const data = await response.json();
            setZones(data);
        } catch (error) {
            console.error('Error fetching zones:', error);
            displayAlert('Failed to load zones', 'error');
        } finally {
            setZonesLoading(false);
        }
    }, [user]);

    // Fetch announcements
    const fetchAnnouncements = useCallback(async () => {
        if (!user) return;

        setAnnouncementsLoading(true);
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/announcements/mine`, {
                credentials: 'include'
            });

            if (response.status === 401) {
                sessionStorage.removeItem('user');
                window.location.href = '/login';
                return;
            }

            if (!response.ok) {
                throw new Error('Failed to fetch announcements');
            }

            const data = await response.json();
            setAnnouncements(data);
        } catch (error) {
            console.error('Error fetching announcements:', error);
            displayAlert('Failed to load announcements', 'error');
        } finally {
            setAnnouncementsLoading(false);
        }
    }, [user]);

    // // Fetch system configuration
    // const fetchSystemConfig = useCallback(async () => {
    //     if (!user) return;

    //     setConfigLoading(true);
    //     try {
    //         const response = await fetch(`{ import.meta.env.VITE_API_URL }/admin/system-config', {
    //             credentials: 'include'
    //         });

    //         if (response.status === 401) {
    //             sessionStorage.removeItem('user');
    //             window.location.href = '/login';
    //             return;
    //         }

    //         if (!response.ok) {
    //             throw new Error('Failed to fetch system configuration');
    //         }

    //         const data = await response.json();
    //         setSystemConfig(data);
    //     } catch (error) {
    //         console.error('Error fetching system config:', error);
    //         displayAlert('Failed to load system configuration', 'error');
    //     } finally {
    //         setConfigLoading(false);
    //     }
    // }, [user]);

    // Initialize component
    useEffect(() => {
        document.title = "System Settings-Rider Management System";
        const handleResize = () => setWidth(window.innerWidth);
        window.addEventListener("resize", handleResize);

        fetchRoles();
        fetchZones();
        fetchAnnouncements();
        // fetchSystemConfig();

        return () => window.removeEventListener("resize", handleResize);
    }, [user, fetchRoles, fetchZones, fetchAnnouncements]);

    // Tab configuration
    const tabs = [
        {
            id: 'roles',
            label: 'Role Management',
            icon: FiShield,
            description: 'Manage user roles and permissions'
        },
        {
            id: 'zones',
            label: 'Zone Management',
            icon: FiMapPin,
            description: 'Manage delivery zones and coverage areas'
        },
        {
            id: 'announcements',
            label: 'Announcements',
            icon: FiSpeaker,
            description: 'Create and manage system announcements'
        },
        // {
        //     id: 'config',
        //     label: 'System Configuration',
        //     icon: FiSettings,
        //     description: 'Configure application settings and business rules'
        // }
    ];

    return (
        <div className="flex h-screen overflow-hidden">
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
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900"> System Settings</h1>
                            <p className="text-sm text-gray-600 mt-1">
                                Manage roles, zones, announcements, and system configuration
                            </p>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="bg-white border-b border-gray-200 px-6">
                    <div className="flex space-x-8">
                        {tabs.map((tab) => {
                            const IconComponent = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === tab.id
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                >
                                    <IconComponent size={18} />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-auto bg-gray-50">
                    {activeTab === 'roles' && (
                        <RoleManagement
                            roles={roles}
                            loading={rolesLoading}
                            onRefresh={fetchRoles}
                            onAdd={() => {
                                setEditingRole(null);
                                setShowRoleModal(true);
                            }}
                            onEdit={(role) => {
                                setEditingRole(role);
                                setShowRoleModal(true);
                            }}
                            onAlert={displayAlert}
                        />
                    )}

                    {activeTab === 'zones' && (
                        <ZoneManagement
                            zones={zones}
                            loading={zonesLoading}
                            onRefresh={fetchZones}
                            onAdd={() => {
                                setEditingZone(null);
                                setShowZoneModal(true);
                            }}
                            onEdit={(zone) => {
                                setEditingZone(zone);
                                setShowZoneModal(true);
                            }}
                            onAlert={displayAlert}
                        />
                    )}

                    {activeTab === 'announcements' && (
                        <AnnouncementManagement
                            announcements={announcements}
                            loading={announcementsLoading}
                            onRefresh={fetchAnnouncements}
                            onAdd={() => {
                                setEditingAnnouncement(null);
                                setShowAnnouncementModal(true);
                            }}
                            onEdit={(announcement) => {
                                setEditingAnnouncement(announcement);
                                setShowAnnouncementModal(true);
                            }}
                            onAlert={displayAlert}
                        />
                    )}

                    {/* {activeTab === 'config' && (
                        <SystemConfiguration
                            config={systemConfig}
                            loading={configLoading}
                            onRefresh={fetchSystemConfig}
                            onAlert={displayAlert}
                        />
                    )} */}
                </div>
            </div>

            {/* Modals */}
            {showRoleModal && (
                <RoleModal
                    role={editingRole}
                    onClose={() => {
                        setShowRoleModal(false);
                        setEditingRole(null);
                    }}
                    onSuccess={() => {
                        setShowRoleModal(false);
                        setEditingRole(null);
                        fetchRoles();
                        displayAlert(
                            editingRole ? 'Role updated successfully' : 'Role created successfully',
                            'success'
                        );
                    }}
                    onAlert={displayAlert}
                />
            )}

            {showZoneModal && (
                <ZoneModal
                    zone={editingZone}
                    onClose={() => {
                        setShowZoneModal(false);
                        setEditingZone(null);
                    }}
                    onSuccess={() => {
                        setShowZoneModal(false);
                        setEditingZone(null);
                        fetchZones();
                        displayAlert(
                            editingZone ? 'Zone updated successfully' : 'Zone created successfully',
                            'success'
                        );
                    }}
                    onAlert={displayAlert}
                />
            )}

            {showAnnouncementModal && (
                <AnnouncementModal
                    announcement={editingAnnouncement}
                    onClose={() => {
                        setShowAnnouncementModal(false);
                        setEditingAnnouncement(null);
                    }}
                    onSuccess={() => {
                        setShowAnnouncementModal(false);
                        setEditingAnnouncement(null);
                        fetchAnnouncements();
                        displayAlert(
                            editingAnnouncement ? 'Announcement updated successfully' : 'Announcement created successfully',
                            'success'
                        );
                    }}
                    onAlert={displayAlert}
                />
            )}
        </div>
    );
};

export default SystemSettings;

// Role Management Component
interface RoleManagementProps {
    roles: Role[];
    loading: boolean;
    onRefresh: () => void;
    onAdd: () => void;
    onEdit: (role: Role) => void;
    onAlert: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const RoleManagement: FC<RoleManagementProps> = ({ roles, loading, onRefresh, onAdd, onEdit, onAlert }) => {
    const handleDelete = async (role: Role) => {
        if (!confirm(`Are you sure you want to delete "${role.name}"? This action cannot be undone.`)) {
            return;
        }

        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/role/${role.id}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete role');
            }

            onRefresh();
            onAlert('Role deleted successfully', 'success');
        } catch (error) {
            console.error('Error deleting role:', error);
            onAlert(error instanceof Error ? error.message : 'Failed to delete role', 'error');
        }
    };

    return (
        <div className="p-6">
            <div className="bg-white rounded-lg shadow">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-medium text-gray-900">Role Management</h3>
                            <p className="mt-1 text-sm text-gray-500">
                                Manage user roles and permissions
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={onRefresh}
                                disabled={loading}
                                className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50 disabled:opacity-50"
                            >
                                <FiRefreshCw className={loading ? 'animate-spin' : ''} />
                                Refresh
                            </button>
                            <button
                                onClick={onAdd}
                                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm"
                            >
                                <FiPlus />
                                Add Role
                            </button>
                        </div>
                    </div>
                </div>

                {/* Role List */}
                <div className="p-6">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                            <span className="ml-3 text-gray-600">Loading roles...</span>
                        </div>
                    ) : roles.length === 0 ? (
                        <div className="text-center py-12">
                            <FiShield size={48} className="mx-auto text-gray-300 mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No roles found</h3>
                            <p className="text-gray-500 mb-4">Get started by creating your first role</p>
                            <button
                                onClick={onAdd}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                            >
                                <FiPlus />
                                Add Your First Role
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {roles.map((role) => (
                                <div key={role.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <FiShield className="text-purple-600" size={18} />
                                                <h4 className="font-medium text-gray-900">{role.name}</h4>
                                            </div>
                                            {role.description && (
                                                <p className="text-sm text-gray-600 mb-2">{role.description}</p>
                                            )}
                                            <div className="flex items-center gap-1 text-sm text-gray-500">
                                                <FiClock size={14} />
                                                <span>Created {new Date(role.created_at).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 ml-4">
                                            <button
                                                onClick={() => onEdit(role)}
                                                className="p-1 text-gray-400 hover:text-purple-600 transition-colors"
                                                title="Edit role"
                                            >
                                                <FiEdit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(role)}
                                                className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                                                title="Delete role"
                                            >
                                                <FiTrash size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Role Modal Component
interface RoleModalProps {
    role: Role | null;
    onClose: () => void;
    onSuccess: () => void;
    onAlert: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const RoleModal: FC<RoleModalProps> = ({ role, onClose, onSuccess, onAlert }) => {
    const [name, setName] = useState(role?.name || '');
    const [description, setDescription] = useState(role?.description || '');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim()) {
            onAlert('Role name is required', 'error');
            return;
        }

        setSubmitting(true);
        try {
            const url = role
                ? `${import.meta.env.VITE_API_URL}/admin/role/${role.id}`
                : `${import.meta.env.VITE_API_URL}/admin/roles`;

            const method = role ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    name: name.trim(),
                    description: description.trim() || null
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Failed to ${role ? 'update' : 'create'} role`);
            }

            onSuccess();
        } catch (error) {
            console.error('Error submitting role:', error);
            onAlert(error instanceof Error ? error.message : 'Failed to save role', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-[#ffffff74] bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
                <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
                    <h3 className="text-lg font-medium text-gray-900">
                        {role ? 'Edit Role' : 'Add New Role'}
                    </h3>
                </div>

                <div className="flex-1 overflow-y-auto">
                    <form onSubmit={handleSubmit} className="p-6">
                        <div className="mb-4">
                            <label htmlFor="roleName" className="block text-sm font-medium text-gray-700 mb-2">
                                Role Name *
                            </label>
                            <input
                                id="roleName"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                placeholder="Enter role name (e.g., Admin, superadmin)"
                                disabled={submitting}
                            />
                        </div>

                        <div className="mb-6">
                            <label htmlFor="roleDescription" className="block text-sm font-medium text-gray-700 mb-2">
                                Description
                            </label>
                            <textarea
                                id="roleDescription"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                placeholder="Enter role description (optional)"
                                rows={3}
                                disabled={submitting}
                            />
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={submitting}
                                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={submitting || !name.trim()}
                                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
                            >
                                {submitting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                                {role ? 'Update Role' : 'Create Role'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

// Zone Management Component
interface ZoneManagementProps {
    zones: Zone[];
    loading: boolean;
    onRefresh: () => void;
    onAdd: () => void;
    onEdit: (zone: Zone) => void;
    onAlert: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const ZoneManagement: FC<ZoneManagementProps> = ({ zones, loading, onRefresh, onAdd, onEdit, onAlert }) => {
    const handleDelete = async (zone: Zone) => {
        if (!confirm(`Are you sure you want to delete "${zone.name}" ? This action cannot be undone.`)) {
            return;
        }

        try {
            const response = await fetch(`{ import.meta.env.VITE_API_URL } /admin/zone/${zone.id} `, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete zone');
            }

            onRefresh();
            onAlert('Zone deleted successfully', 'success');
        } catch (error) {
            console.error('Error deleting zone:', error);
            onAlert(error instanceof Error ? error.message : 'Failed to delete zone', 'error');
        }
    };

    return (
        <div className="p-6">
            <div className="bg-white rounded-lg shadow">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-medium text-gray-900">Zone Management</h3>
                            <p className="mt-1 text-sm text-gray-500">
                                Manage delivery zones and coverage areas
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={onRefresh}
                                disabled={loading}
                                className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50 disabled:opacity-50"
                            >
                                <FiRefreshCw className={loading ? 'animate-spin' : ''} />
                                Refresh
                            </button>
                            <button
                                onClick={onAdd}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                            >
                                <FiPlus />
                                Add Zone
                            </button>
                        </div>
                    </div>
                </div>

                {/* Zone List */}
                <div className="p-6">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            <span className="ml-3 text-gray-600">Loading zones...</span>
                        </div>
                    ) : zones.length === 0 ? (
                        <div className="text-center py-12">
                            <FiMapPin size={48} className="mx-auto text-gray-300 mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No zones found</h3>
                            <p className="text-gray-500 mb-4">Get started by creating your first delivery zone</p>
                            <button
                                onClick={onAdd}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                            >
                                <FiPlus />
                                Add Your First Zone
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {zones.map((zone) => (
                                <div key={zone.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <h4 className="font-medium text-gray-900">{zone.name}</h4>
                                            <div className="mt-2 space-y-1">
                                                {zone.latitude && zone.longitude ? (
                                                    <div className="flex items-center gap-1 text-sm text-gray-500">
                                                        <FiMap size={14} />
                                                        <span>{zone.latitude.toFixed(4)}, {zone.longitude.toFixed(4)}</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1 text-sm text-gray-400">
                                                        <FiMap size={14} />
                                                        <span>No coordinates</span>
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-1 text-sm text-gray-500">
                                                    <FiClock size={14} />
                                                    <span>Created {new Date(zone.created_at).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 ml-4">
                                            <button
                                                onClick={() => onEdit(zone)}
                                                className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                                                title="Edit zone"
                                            >
                                                <FiEdit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(zone)}
                                                className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                                                title="Delete zone"
                                            >
                                                <FiTrash size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Zone Modal Component
interface ZoneModalProps {
    zone: Zone | null;
    onClose: () => void;
    onSuccess: () => void;
    onAlert: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const ZoneModal: FC<ZoneModalProps> = ({ zone, onClose, onSuccess, onAlert }) => {
    const [name, setName] = useState(zone?.name || '');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim()) {
            onAlert('Zone name is required', 'error');
            return;
        }

        setSubmitting(true);
        try {
            const url = zone
                ? `${import.meta.env.VITE_API_URL}/admin/zone/${zone.id}`
                : `${import.meta.env.VITE_API_URL}/admin/zones`;

            const method = zone ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ name: name.trim() })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Failed to ${zone ? 'update' : 'create'} zone`);
            }

            onSuccess();
        } catch (error) {
            console.error('Error submitting zone:', error);
            onAlert(error instanceof Error ? error.message : 'Failed to save zone', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-[#ffffff74] bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
                <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
                    <h3 className="text-lg font-medium text-gray-900">
                        {zone ? 'Edit Zone' : 'Add New Zone'}
                    </h3>
                </div>

                <div className="flex-1 overflow-y-auto">
                    <form onSubmit={handleSubmit} className="p-6">
                        <div className="mb-4">
                            <label htmlFor="zoneName" className="block text-sm font-medium text-gray-700 mb-2">
                                Zone Name *
                            </label>
                            <input
                                id="zoneName"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Enter zone name (e.g., Accra Central, Kumasi North)"
                                disabled={submitting}
                            />
                            <p className="mt-2 text-xs text-gray-500">
                                Coordinates will be automatically fetched based on the zone name
                            </p>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={submitting}
                                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={submitting || !name.trim()}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                            >
                                {submitting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                                {zone ? 'Update Zone' : 'Create Zone'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

// Announcement Management Component
interface AnnouncementManagementProps {
    announcements: Announcement[];
    loading: boolean;
    onRefresh: () => void;
    onAdd: () => void;
    onEdit: (announcement: Announcement) => void;
    onAlert: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const AnnouncementManagement: FC<AnnouncementManagementProps> = ({ announcements, loading, onRefresh, onAdd, onEdit, onAlert }) => {
    const handleDelete = async (announcement: Announcement) => {
        if (!confirm(`Are you sure you want to delete this announcement ? This action cannot be undone.`)) {
            return;
        }

        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/announcement/${announcement.id}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete announcement');
            }

            onRefresh();
            onAlert('Announcement deleted successfully', 'success');
        } catch (error) {
            console.error('Error deleting announcement:', error);
            onAlert(error instanceof Error ? error.message : 'Failed to delete announcement', 'error');
        }
    };

    return (
        <div className="p-6">
            <div className="bg-white rounded-lg shadow">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-medium text-gray-900">Announcement Management</h3>
                            <p className="mt-1 text-sm text-gray-500">
                                Create and manage system announcements
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={onRefresh}
                                disabled={loading}
                                className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50 disabled:opacity-50"
                            >
                                <FiRefreshCw className={loading ? 'animate-spin' : ''} />
                                Refresh
                            </button>
                            <button
                                onClick={onAdd}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                            >
                                <FiPlus />
                                Add Announcement
                            </button>
                        </div>
                    </div>
                </div>

                {/* Announcement List */}
                <div className="p-6">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                            <span className="ml-3 text-gray-600">Loading announcements...</span>
                        </div>
                    ) : announcements.length === 0 ? (
                        <div className="text-center py-12">
                            <FiSpeaker size={48} className="mx-auto text-gray-300 mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No announcements found</h3>
                            <p className="text-gray-500 mb-4">Create an announcement to keep users informed</p>
                            <button
                                onClick={onAdd}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                            >
                                <FiPlus />
                                Create Your First Announcement
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {announcements.map((announcement) => (
                                <div key={announcement.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <h4 className="font-medium text-gray-900">{announcement.title}</h4>
                                            <div className="mt-2 space-y-1">
                                                <div className="flex items-center gap-1 text-sm text-gray-500">
                                                    <FiShield size={14} />
                                                    <span>{announcement.type.charAt(0).toUpperCase() + announcement.type.slice(1)}</span>
                                                </div>
                                                <div className="flex items-center gap-1 text-sm text-gray-500">
                                                    <FiClock size={14} />
                                                    <span>Created {new Date(announcement.created_at).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 ml-4">
                                            <button
                                                onClick={() => onEdit(announcement)}
                                                className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                                                title="Edit announcement"
                                            >
                                                <FiEdit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(announcement)}
                                                className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                                                title="Delete announcement"
                                            >
                                                <FiTrash size={16} />
                                            </button>
                                        </div>
                                    </div>
                                    <p className="mt-2 text-gray-700 text-sm">
                                        {announcement.content}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Announcement Modal Component
interface AnnouncementModalProps {
    announcement: Announcement | null;
    onClose: () => void;
    onSuccess: () => void;
    onAlert: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const AnnouncementModal: FC<AnnouncementModalProps> = ({ announcement, onClose, onSuccess, onAlert }) => {
    const [title, setTitle] = useState(announcement?.title || '');
    const [content, setContent] = useState(announcement?.content || '');
    const [type, setType] = useState<Announcement['type']>(announcement?.type || 'info');
    const [priority, setPriority] = useState<Announcement['priority']>(announcement?.priority || 'normal');
    const [targetAudience, setTargetAudience] = useState(announcement?.target_audience || '');
    const [isActive, setIsActive] = useState(announcement?.is_active ? 'true' : 'false');
    const [expiresAt, setExpiresAt] = useState(announcement?.expires_at ? new Date(announcement.expires_at).toISOString().substring(0, 10) : '');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!title.trim() || !content.trim()) {
            onAlert('Title and content are required', 'error');
            return;
        }

        setSubmitting(true);
        try {
            const url = announcement
                ? `${import.meta.env.VITE_API_URL}/admin/announcement/${announcement.id}`
                : `${import.meta.env.VITE_API_URL}/admin/announcements`;

            const method = announcement ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    title: title.trim(),
                    content: content.trim(),
                    type,
                    priority,
                    target_audience: targetAudience.trim(),
                    is_active: isActive === 'true',
                    expires_at: expiresAt ? new Date(expiresAt).toISOString() : null
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Failed to ${announcement ? 'update' : 'create'} announcement`);
            }

            onSuccess();
        } catch (error) {
            console.error('Error submitting announcement:', error);
            onAlert(error instanceof Error ? error.message : 'Failed to save announcement', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-[#ffffff74] bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
                <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
                    <h3 className="text-lg font-medium text-gray-900">
                        {announcement ? 'Edit Announcement' : 'Create New Announcement'}
                    </h3>
                </div>

                <div className="flex-1 overflow-y-auto">
                    <form onSubmit={handleSubmit} className="p-6">
                        <div className="mb-4">
                            <label htmlFor="announcementTitle" className="block text-sm font-medium text-gray-700 mb-2">
                                Title *
                            </label>
                            <input
                                id="announcementTitle"
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Enter announcement title"
                                disabled={submitting}
                            />
                        </div>

                        <div className="mb-4">
                            <label htmlFor="announcementContent" className="block text-sm font-medium text-gray-700 mb-2">
                                Content *
                            </label>
                            <textarea
                                id="announcementContent"
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Enter announcement content"
                                rows={4}
                                disabled={submitting}
                            ></textarea>
                        </div>

                        <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="announcementType" className="block text-sm font-medium text-gray-700 mb-2">
                                    Type
                                </label>
                                <select
                                    id="announcementType"
                                    value={type}
                                    onChange={(e) => setType(e.target.value as Announcement['type'])}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    disabled={submitting}
                                >
                                    <option value="info">Info</option>
                                    <option value="warning">Warning</option>
                                    <option value="urgent">Urgent</option>
                                    <option value="maintenance">Maintenance</option>
                                </select>
                            </div>

                            <div>
                                <label htmlFor="announcementPriority" className="block text-sm font-medium text-gray-700 mb-2">
                                    Priority
                                </label>
                                <select
                                    id="announcementPriority"
                                    value={priority}
                                    onChange={(e) => setPriority(e.target.value as Announcement['priority'])}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    disabled={submitting}
                                >
                                    <option value="low">Low</option>
                                    <option value="normal">Normal</option>
                                    <option value="high">High</option>
                                    <option value="urgent">Urgent</option>
                                </select>
                            </div>
                        </div>

                        <div className="mb-4">
                            <label htmlFor="announcementTargetAudience" className="block text-sm font-medium text-gray-700 mb-2">
                                Target Audience
                            </label>
                            <input
                                id="announcementTargetAudience"
                                type="text"
                                value={targetAudience}
                                onChange={(e) => setTargetAudience(e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Enter target audience (e.g., All users, Admins only)"
                                disabled={submitting}
                            />
                        </div>

                        <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="announcementIsActive" className="block text-sm font-medium text-gray-700 mb-2">
                                    Active
                                </label>
                                <select
                                    id="announcementIsActive"
                                    value={isActive}
                                    onChange={(e) => setIsActive(e.target.value)}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    disabled={submitting}
                                >
                                    <option value="true">Yes</option>
                                    <option value="false">No</option>
                                </select>
                            </div>

                            <div>
                                <label htmlFor="announcementExpiresAt" className="block text-sm font-medium text-gray-700 mb-2">
                                    Expires At
                                </label>
                                <input
                                    id="announcementExpiresAt"
                                    type="date"
                                    value={expiresAt}
                                    onChange={(e) => setExpiresAt(e.target.value)}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    disabled={submitting}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={submitting}
                                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={submitting || !title.trim() || !content.trim()}
                                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                            >
                                {submitting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                                {announcement ? 'Update Announcement' : 'Create Announcement'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

// System Configuration Component
// interface SystemConfigurationProps {
//     config: SystemConfig;
//     loading: boolean;
//     onRefresh: () => void;
//     onAlert: (message: string, type?: 'success' | 'error' | 'info') => void;
// }

// const SystemConfiguration: FC<SystemConfigurationProps> = ({ config, loading, onRefresh, onAlert }) => {
//     const [editedConfig, setEditedConfig] = useState<SystemConfig>({});
//     const [submitting, setSubmitting] = useState(false);

//     useEffect(() => {
//         setEditedConfig(config);
//     }, [config]);

//     const handleChange = (key: string, value: string | number | boolean | object | null) => {
//         setEditedConfig((prev) => ({
//             ...prev,
//             [key]: {
//                 ...prev[key],
//                 value
//             }
//         }));
//     };

//     const handleSubmit = async (e: React.FormEvent) => {
//         e.preventDefault();

//         setSubmitting(true);
//         try {
//             const response = await fetch(`{ import.meta.env.VITE_API_URL } /admin/system-config', {
//                 method: 'PUT',
//                 headers: { 'Content-Type': 'application/json' },
//                 credentials: 'include',
//                 body: JSON.stringify(editedConfig)
//             });

//             if (!response.ok) {
//                 const errorData = await response.json();
//                 throw new Error(errorData.error || 'Failed to update system configuration');
//             }

//             onRefresh();
//             onAlert('System configuration updated successfully', 'success');
//         } catch (error) {
//             console.error('Error updating system config:', error);
//             onAlert(error instanceof Error ? error.message : 'Failed to update system configuration', 'error');
//         } finally {
//             setSubmitting(false);
//         }
//     };

//     return (
//         <div className="p-6">
//             <div className="bg-white rounded-lg shadow">
//                 {/* Header */}
//                 <div className="px-6 py-4 border-b border-gray-200">
//                     <div className="flex items-center justify-between">
//                         <div>
//                             <h3 className="text-lg font-medium text-gray-900">System Configuration</h3>
//                             <p className="mt-1 text-sm text-gray-500">
//                                 Configure application settings and business rules
//                             </p>
//                         </div>
//                     </div>
//                 </div>

//                 {/* Configuration Form */}
//                 <form onSubmit={handleSubmit} className="p-6 space-y-4">
//                     {Object.entries(editedConfig).map(([key, { value, description, data_type }]) => (
//                         <div key={key} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
//                             <div className="flex-1 min-w-0">
//                                 <label className="block text-sm font-medium text-gray-700 mb-1">
//                                     {key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
//                                 </label>
//                                 {data_type === 'boolean' ? (
//                                     <select
//                                         value={value ? 'true' : 'false'}
//                                         onChange={(e) => handleChange(key, e.target.value === 'true')}
//                                         className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
//                                     >
//                                         <option value="true">Enabled</option>
//                                         <option value="false">Disabled</option>
//                                     </select>
//                                 ) : (
//                                     <input
//                                         type={data_type === 'number' ? 'number' : 'text'}
//                                         value={value === null ? '' : String(value)}
//                                         onChange={(e) => handleChange(key, data_type === 'number' ? Number(e.target.value) : e.target.value)}
//                                         className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
//                                         placeholder={`Enter ${key}`}
//                                     />
//                                 )}
//                                 <p className="mt-1 text-xs text-gray-500">
//                                     {description}
//                                 </p>
//                             </div>
//                         </div>
//                     ))}

//                     <div className="flex justify-end gap-3">
//                         <button
//                             type="button"
//                             onClick={onRefresh}
//                             disabled={loading}
//                             className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
//                         >
//                             {loading ? 'Refreshing...' : 'Refresh'}
//                         </button>
//                         <button
//                             type="submit"
//                             disabled={submitting}
//                             className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
//                         >
//                             {submitting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
//                             Save Changes
//                         </button>
//                     </div>
//                 </form>
//             </div>
//         </div>
//     );
// };