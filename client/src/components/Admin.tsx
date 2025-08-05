import type { FC } from "react";
import { useCallback, useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { FiEdit2, FiMail, FiPlus, FiRefreshCw, FiSearch, FiTrash } from "react-icons/fi";
import Alert from "./Alert";
import Menu from "./Menu";
import SmallMenu from "./SmallMenu";
import { useSharedValue } from './context/shareValue';

// Admin type definition
interface AdminType {
    id: string;
    name: string;
    email: string;
    role_name: string;
    created_at: string;
    registered_by_admin?: string;
    riders_registered?: number;
    shifts_created?: number;
    is_active: boolean; // Make sure this is included
}

// Interface for adding new admin
interface AddAdminData {
    name: string;
    email: string;
    password?: string;
    roleName: string;
}

// Interface for editing admin
interface EditAdminData {
    name: string;
    email: string;
    roleName: string;
    password?: string;
}

const Admin = () => {
    const [width, setWidth] = useState(window.innerWidth);
    const [admins, setAdmins] = useState<AdminType[]>([]);
    const [loading, setLoading] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedAdmin, setSelectedAdmin] = useState<AdminType | null>(null);
    const [deleteAlert, setDeleteAlert] = useState<{ open: boolean; id?: string; name?: string }>({ open: false });
    const [search, setSearch] = useState("");
    const [alert, setAlert] = useState<{ message: string; type?: 'success' | 'error' | 'info' } | null>(null);
    const [showInactive, setShowInactive] = useState(false);

    const { user } = useSharedValue();

    // Helper to show alert for a short time
    const displayAlert = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
        setAlert({ message, type });
        setTimeout(() => setAlert(null), 3000);
    };

    // Fetch admins from backend
    const fetchAdmins = useCallback(async () => {
        if (!user) {
            console.log('No user found, redirecting to login');
            window.location.href = '/login';
            return;
        }

        console.log('🚀 Fetching admins...');
        setLoading(true);

        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/admins`, {
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            console.log('📡 Response status:', response.status);

            if (response.status === 401) {
                console.log('Unauthorized-clearing session');
                sessionStorage.removeItem('user');
                window.location.href = '/login';
                return;
            }

            if (response.status === 403) {
                console.log('Forbidden-insufficient permissions');
                displayAlert("You don't have permission to view admin management", "error");
                return;
            }

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Response error:', errorText);
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const data: AdminType[] = await response.json();
            console.log('✅ Admins data received:', data.length, 'admins');
            console.log('📊 Sample admin:', data[0]);

            setAdmins(data);

        } catch (error) {
            console.error("💥 Error fetching admins:", error);
            displayAlert(`Failed to load admins: ${error instanceof Error ? error.message : 'Unknown error'}`, "error");
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        document.title = "Admin Management-Rider Management System";
        const handleResize = () => setWidth(window.innerWidth);
        window.addEventListener("resize", handleResize);

        fetchAdmins();

        return () => window.removeEventListener("resize", handleResize);
    }, [fetchAdmins]);

    // Add Admin handler
    const handleAddAdmin = async (adminData: AddAdminData) => {
        try {
            // Show loading state
            const loadingMessage = "Creating admin and sending welcome email...";
            displayAlert(loadingMessage, "info");

            const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/registerAdmin`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: 'include',
                body: JSON.stringify(adminData),
            });

            if (response.status === 401) {
                sessionStorage.removeItem('user');
                window.location.href = '/login';
                return;
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to add admin');
            }

            const newAdmin: AdminType & { email_sent?: boolean; email_message?: string } = await response.json();

            // Update admin list
            setAdmins(prev => [...prev, newAdmin]);
            setShowAddModal(false);

            // Show success message with email status
            if (newAdmin.email_sent) {
                displayAlert(`Admin created successfully! Welcome email sent to ${newAdmin.email}`, "success");
            } else {
                displayAlert(`Admin created successfully, but welcome email failed. Please share login credentials manually.`, "success");
                console.warn('Email sending failed:', newAdmin.email_message);
            }

        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Failed to add admin";
            displayAlert(message, "error");
            console.error("Error adding admin:", error);
        }
    };

    // Edit Admin handler
    const handleEditAdmin = async (adminData: EditAdminData) => {
        if (!selectedAdmin) return;

        try {
            // Show loading state with appropriate message
            const loadingMessage = adminData.password
                ? "Updating admin and sending password update email..."
                : "Updating admin...";
            displayAlert(loadingMessage, "info");

            const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/admin/${selectedAdmin.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: 'include',
                body: JSON.stringify(adminData),
            });

            if (response.status === 401) {
                sessionStorage.removeItem('user');
                window.location.href = '/login';
                return;
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update admin');
            }

            const updatedAdmin: AdminType & {
                password_updated?: boolean;
                email_sent?: boolean;
                email_message?: string
            } = await response.json();

            // Update the admin in the list
            setAdmins(prev => prev.map(a =>
                a.id === selectedAdmin.id
                    ? { ...a, ...updatedAdmin }
                    : a
            ));

            setShowEditModal(false);
            setSelectedAdmin(null);

            // Show appropriate success message based on what was updated
            if (updatedAdmin.password_updated) {
                if (updatedAdmin.email_sent) {
                    displayAlert(`Admin updated successfully! Password update email sent to ${updatedAdmin.email}`, "success");
                } else {
                    displayAlert(`Admin updated successfully, but password email failed. Please share new credentials manually.`, "success");
                    console.warn('Password email failed:', updatedAdmin.email_message);
                }
            } else {
                displayAlert("Admin updated successfully", "success");
            }

        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Failed to update admin";
            displayAlert(message, "error");
            console.error("Error editing admin:", error);
        }
    };

    // Deactivate Admin handler
    const handleDeactivateAdmin = async (id: string) => {
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/admin/${id}/deactivate`, {
                method: "PUT",
                credentials: 'include'
            });

            if (response.status === 401) {
                sessionStorage.removeItem('user');
                window.location.href = '/login';
                return;
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to deactivate admin');
            }

            const result = await response.json();

            // Update admin status to inactive
            setAdmins(prev => prev.map(a =>
                a.id === id ? { ...a, is_active: false } : a
            ));

            setDeleteAlert({ open: false });
            displayAlert(result.message || "Admin deactivated successfully", "success");
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Failed to deactivate admin";
            displayAlert(message, "error");
            console.error("Error deactivating admin:", error);
        }
    };

    const handleReactivateAdmin = async (id: string) => {
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/admin/${id}/activate`, {
                method: "PUT",
                credentials: 'include'
            });

            if (response.status === 401) {
                sessionStorage.removeItem('user');
                window.location.href = '/login';
                return;
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to reactivate admin');
            }

            const result = await response.json();

            // Update admin status to active
            setAdmins(prev => prev.map(a =>
                a.id === id ? { ...a, is_active: true } : a
            ));

            displayAlert(result.message || "Admin reactivated successfully", "success");
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Failed to reactivate admin";
            displayAlert(message, "error");
            console.error("Error reactivating admin:", error);
        }
    };

    // Filter admins by search input
    const filteredAdmins = admins.filter(admin => {
        const matchesSearch = admin.name.toLowerCase().includes(search.toLowerCase()) ||
            admin.email.toLowerCase().includes(search.toLowerCase()) ||
            admin.role_name.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = showInactive ? !admin.is_active : admin.is_active;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="flex h-screen overflow-hidden">
            <Helmet>
                <title>Admin Management - Rider Management System</title>
                <meta name="description" content="Manage admins for the Rider Management System" />
            </Helmet>
            {/* Alert in the top-right corner */}
            {alert && (
                <div className="fixed top-6 right-6 z-50">
                    <Alert message={alert.message} type={alert.type} />
                </div>
            )}

            {width > 968 ? <Menu /> : <SmallMenu />}

            <div className="flex flex-col items-center w-full">
                <h1 className="text-2xl font-bold text-center mt-2">Admin Management</h1>

                <div className="flex justify-between w-full max-w-4xl">
                    <SearchBar
                        onSearch={value => setSearch(value)}
                        onAddClick={() => setShowAddModal(true)}
                        onRefresh={fetchAdmins}
                        loading={loading}
                        showInactive={showInactive}
                        onToggleInactive={setShowInactive}
                    />
                </div>

                {/* Admin count */}
                <div className="flex gap-4 mt-2 text-sm text-gray-600">
                    <span>
                        Showing {filteredAdmins.length} {showInactive ? 'inactive' : 'active'} admins
                    </span>
                    <span>Total: {admins.length} admins</span>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center mt-10">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                        <span className="ml-3 text-gray-600">Loading admins...</span>
                    </div>
                ) : (
                    <div className="flex flex-wrap justify-around gap-3 mt-6 mb-1 overflow-y-auto max-h-[calc(100vh-200px)]">
                        {filteredAdmins.length === 0 ? (
                            <div className="text-center text-gray-500 mt-10">
                                <p>No admins found</p>
                                {search && <p className="text-sm">Try adjusting your search</p>}
                            </div>
                        ) : (
                            filteredAdmins.map(admin => (
                                <AdminCard
                                    key={admin.id}
                                    admin={admin}
                                    onEdit={() => {
                                        setSelectedAdmin(admin);
                                        setShowEditModal(true);
                                    }}
                                    onDeactivate={() => setDeleteAlert({
                                        open: true,
                                        id: admin.id,
                                        name: admin.name
                                    })}
                                    onReactivate={() => handleReactivateAdmin(admin.id)}
                                />
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* Add Admin Modal */}
            {showAddModal && (
                <AdminModal
                    title="Add New Admin"
                    onClose={() => setShowAddModal(false)}
                    onSubmit={handleAddAdmin}
                    isEditing={false}
                />
            )}

            {/* Edit Admin Modal */}
            {showEditModal && selectedAdmin && (
                <AdminModal
                    title="Edit Admin"
                    admin={selectedAdmin}
                    onClose={() => {
                        setShowEditModal(false);
                        setSelectedAdmin(null);
                    }}
                    onSubmit={handleEditAdmin}
                    isEditing={true}
                />
            )}

            {/* Deactivate Confirmation Alert */}
            {deleteAlert.open && (
                <div className="fixed inset-0 flex items-center justify-center bg-[#ffffff74] bg-opacity-50 z-50">
                    <div className="bg-white p-6 rounded-lg shadow-lg max-w-md">
                        <h3 className="text-lg font-semibold mb-2">Deactivate Admin</h3>
                        <p className="mb-4 text-gray-700">
                            Are you sure you want to deactivate <strong>{deleteAlert.name}</strong>?
                            <br />
                            <span className="text-sm text-gray-500">
                                This will revoke their admin access but preserve their data and history.
                            </span>
                        </p>
                        <div className="flex gap-4 justify-end">
                            <button
                                className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 transition"
                                onClick={() => setDeleteAlert({ open: false })}
                            >
                                Cancel
                            </button>
                            <button
                                className="px-4 py-2 rounded bg-orange-500 text-white hover:bg-orange-600 transition"
                                onClick={() => deleteAlert.id && handleDeactivateAdmin(deleteAlert.id)}
                            >
                                Deactivate
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Admin;

// Enhanced Search bar with refresh
interface SearchBarProps {
    onSearch: (value: string) => void;
    onAddClick: () => void;
    onRefresh: () => void;
    loading: boolean;
    showInactive: boolean;
    onToggleInactive: (show: boolean) => void;
}

const SearchBar: FC<SearchBarProps> = ({
    onSearch,
    onAddClick,
    onRefresh,
    loading,
    showInactive,
    onToggleInactive
}) => {
    return (
        <div className="flex items-center bg-white rounded-4xl shadow-sm py-4 px-10 space-x-2 max-w-4xl w-full h-14 mt-6">
            {/* Search Input */}
            <div className="flex items-center flex-grow bg-gray-100 rounded-full px-4 py-2">
                <FiSearch className="text-gray-400 mr-2" />
                <input
                    type="text"
                    placeholder="Search by name, email, or role..."
                    className="bg-transparent outline-none text-sm text-gray-700 w-full"
                    onChange={(e) => onSearch(e.target.value)}
                />
            </div>

            {/* Toggle Inactive Button */}
            <button
                onClick={() => onToggleInactive(!showInactive)}
                className={`px-3 py-2 rounded-md text-sm transition ${showInactive
                    ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
            >
                {showInactive ? 'Show Active' : 'Show Inactive'}
            </button>

            {/* Refresh Button */}
            <button
                onClick={onRefresh}
                disabled={loading}
                className="flex items-center px-3 py-2 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 transition disabled:opacity-50"
            >
                {loading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                ) : (
                    <FiRefreshCw />
                )}
            </button>

            {/* Add Admin Button */}
            <button
                onClick={onAddClick}
                className="flex items-center gap-1 px-4 py-2 rounded-md bg-[#1680E4] text-white text-sm hover:bg-[#126dcc] transition"
            >
                <FiPlus />
                Add Admin
            </button>
        </div>
    );
};

// Enhanced Admin Card with statistics
interface AdminCardProps {
    admin: AdminType;
    onEdit: () => void;
    onDeactivate: () => void;
    onReactivate: () => void;
}

const AdminCard: FC<AdminCardProps> = ({ admin, onEdit, onDeactivate, onReactivate }) => {
    const getRoleColor = (roleName: string) => {
        switch (roleName.toLowerCase()) {
            case 'superadmin':
                return 'bg-red-100 text-red-700';
            case 'admin':
                return 'bg-blue-100 text-blue-700';
            default:
                return 'bg-gray-100 text-gray-700';
        }
    };

    const getInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    return (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-4 w-80 space-y-3">
            {/* Role Badge */}
            <div className="flex justify-center">
                <span className={`px-3 py-1 text-xs rounded-full ${getRoleColor(admin.role_name)}`}>
                    {admin.role_name}
                </span>
            </div>

            {/* Avatar + Name */}
            <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                    {getInitials(admin.name)}
                </div>
                <div className="font-semibold text-gray-800">{admin.name}</div>
            </div>

            {/* Contact Info */}
            <div className="text-sm text-gray-600 space-y-1">
                <div className="flex items-center gap-2">
                    <FiMail className="text-gray-500" />
                    <span className="truncate">{admin.email}</span>
                </div>
                <div className="text-xs text-gray-500">
                    Joined {new Date(admin.created_at).toLocaleDateString()}
                </div>
            </div>

            {/* Stats + Actions */}
            <div className="flex justify-between items-center pt-2">
                <div className="text-sm text-gray-700 space-y-1">
                    <div className="flex gap-2">
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                            {admin.riders_registered || 0} riders
                        </span>
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                            {admin.shifts_created || 0} shifts
                        </span>
                    </div>
                    {admin.registered_by_admin && (
                        <div className="text-xs text-gray-400">
                            by {admin.registered_by_admin}
                        </div>
                    )}
                </div>

                <div className="flex gap-2">
                    {admin.is_active ? (
                        <>
                            <button
                                onClick={onEdit}
                                className="p-2 bg-[#1680E4] text-white rounded-md hover:bg-[#1268ba] transition"
                                title="Edit admin"
                            >
                                <FiEdit2 size={16} />
                            </button>
                            <button
                                onClick={onDeactivate}
                                className="p-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition"
                                title="Deactivate admin"
                            >
                                <FiTrash size={16} />
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={onReactivate}
                            className="p-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition"
                            title="Reactivate admin"
                        >
                            <FiRefreshCw size={16} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

// Enhanced Modal for adding/editing admins
const AdminModal: FC<{
    title: string;
    admin?: AdminType;
    onClose: () => void;
    onSubmit: (data: AddAdminData | EditAdminData) => Promise<void>;
    isEditing?: boolean;
}> = ({ title, admin, onClose, onSubmit, isEditing = false }) => {
    const [name, setName] = useState(admin?.name || "");
    const [email, setEmail] = useState(admin?.email || "");
    const [roleName, setRoleName] = useState(admin?.role_name || "");
    const [password, setPassword] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [roles, setRoles] = useState<{ id: string; name: string }[]>([]);
    const [modalAlert, setModalAlert] = useState<{ message: string; type?: 'success' | 'error' | 'info' } | null>(null);

    // Fetch available roles
    useEffect(() => {
        const fetchRoles = async () => {
            try {
                const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/roles`, {
                    credentials: 'include'
                });
                if (response.ok) {
                    const data = await response.json();
                    setRoles(data);
                }
            } catch (error) {
                console.error("Error fetching roles:", error);
            }
        };
        fetchRoles();
    }, []);

    // Generate a random password for the admin
    const generatePassword = () => {
        setIsGenerating(true);
        const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
        let pass = "";
        for (let i = 0; i < 12; i++) {
            pass += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setPassword(pass);
        setTimeout(() => setIsGenerating(false), 500);
    };

    const handleSubmit = () => {
        if (!name || !email || !roleName) return;
        if (!isValidEmail(email)) {
            setModalAlert({ message: "Email not valid", type: "error" });
            return;
        }
        if (isEditing) {
            // For editing, password is optional
            onSubmit({ name, email, roleName, ...(password && { password }) });
        } else {
            // For adding new admin, password is required
            if (!password) return;
            onSubmit({ name, email, roleName, password });
        }
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-[#ffffff74] bg-opacity-50 z-50">
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md space-y-5 max-h-[90vh] overflow-y-auto">
                {modalAlert && (
                    <Alert message={modalAlert.message} type={modalAlert.type} />
                )}
                {/* Modal Title */}
                <h2 className="text-xl font-semibold text-gray-800">{title}</h2>

                {/* Input Fields */}
                <div className="space-y-4">
                    <input
                        className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#1680E4] focus:border-transparent"
                        placeholder="Full Name *"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                    <input
                        type="email"
                        className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#1680E4] focus:border-transparent"
                        placeholder="Email Address *"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />

                    {/* Role Selection */}
                    <select
                        className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#1680E4] focus:border-transparent"
                        value={roleName}
                        onChange={(e) => setRoleName(e.target.value)}
                    >
                        <option value="">Select Role *</option>
                        {roles.map(role => (
                            <option key={role.id} value={role.name}>
                                {role.name}
                            </option>
                        ))}
                    </select>

                    {/* Password field */}
                    <div className="space-y-2">
                        <div className="flex gap-2 items-center">
                            <input
                                className="flex-1 border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#1680E4] focus:border-transparent"
                                placeholder={isEditing ? "New Password (optional)" : "Password *"}
                                type="text"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <button
                                type="button"
                                className="px-4 py-3 rounded-xl bg-[#1680E4] text-white flex items-center justify-center min-w-[100px] hover:bg-[#126dcc] disabled:opacity-60 transition"
                                onClick={generatePassword}
                                disabled={isGenerating}
                            >
                                {isGenerating ? (
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    "Generate"
                                )}
                            </button>
                        </div>
                        <p className="text-xs text-gray-500">
                            {isEditing
                                ? "Leave empty to keep current password"
                                : "The admin will use this password to login"
                            }
                        </p>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                    <button
                        className="px-6 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 transition"
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                    <button
                        className="px-6 py-2 rounded-xl bg-[#1680E4] text-white hover:bg-[#126dcc] transition disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={handleSubmit}
                        disabled={!name || !email || !roleName || (!isEditing && !password)}
                    >
                        {isEditing ? 'Update' : 'Create'} Admin
                    </button>
                </div>
            </div>
        </div>
    );
};
const isValidEmail = (email: string) =>
    /^[\w.-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
