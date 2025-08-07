import type { FC } from "react";
import { useCallback, useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { FaRegStar, FaStar } from "react-icons/fa";
import { FiEdit2, FiMail, FiPhone, FiPlus, FiRefreshCw, FiSearch, FiTrash } from "react-icons/fi";
import Alert from "./Alert";
import Menu from "./Menu";
import SmallMenu from "./SmallMenu";
import { useSharedValue } from './context/shareValue';

// Move these interfaces to the top-before they're used
interface AddRiderData {
    name: string;
    phone: string;
    email: string;
    password?: string;
}

interface EditRiderData {
    name: string;
    phone: string;
    email: string;
    password?: string;
}

// Updated Rider type to match backend response
interface RiderType {
    id: string;
    name: string;
    phone: string;
    email: string;
    is_active: boolean;
    total_shifts: number;
    completed_shifts: number;
    active_shifts: number;
    upcoming_shifts: number;
    registered_by_admin?: string;
    created_at: string;
}

const Rider = () => {
    const [width, setWidth] = useState(window.innerWidth);
    const [riders, setRiders] = useState<RiderType[]>([]);
    const [loading, setLoading] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedRider, setSelectedRider] = useState<RiderType | null>(null);
    const [deleteAlert, setDeleteAlert] = useState<{ open: boolean; id?: string; name?: string }>({ open: false });
    const [search, setSearch] = useState("");
    const [alert, setAlert] = useState<{ message: string; type?: 'success' | 'error' | 'info' } | null>(null);
    const [showInactive, setShowInactive] = useState(false);

    const { user } = useSharedValue();


    // Helper to show alert for a short time (renamed to avoid conflict)
    const displayAlert = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
        setAlert({ message, type });
        setTimeout(() => setAlert(null), 3000);
    };

    // Fetch riders from backend
    const fetchRiders = useCallback(async () => {
        if (!user) {
            window.location.href = '/login';
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/riders`, {
                credentials: 'include'
            });

            if (response.status === 401) {
                sessionStorage.removeItem('user');
                window.location.href = '/login';
                return;
            }

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: Failed to fetch riders`);
            }

            const data: RiderType[] = await response.json();
            setRiders(data);
        } catch (error) {
            console.error("Error fetching riders:", error);
            displayAlert("Failed to load riders", "error");
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        document.title = "Rider-Rider Management System";
        const handleResize = () => setWidth(window.innerWidth);
        window.addEventListener("resize", handleResize);

        fetchRiders();

        return () => window.removeEventListener("resize", handleResize);
    }, [user, fetchRiders]);

    // Add Rider handler-now with proper typing (no more any!)
    const handleAddRider = async (riderData: AddRiderData) => {
        try {
            // Show loading state
            displayAlert("Creating rider and sending welcome email...", "info");

            const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/registerRider`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: 'include',
                body: JSON.stringify(riderData),
            });

            if (response.status === 401) {
                sessionStorage.removeItem('user');
                window.location.href = '/login';
                return;
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to add rider');
            }

            const newRider: RiderType & { email_sent?: boolean; email_message?: string } = await response.json();

            // Update rider list
            setRiders(prev => [...prev, newRider]);
            setShowAddModal(false);

            // Show success message with email status
            if (newRider.email_sent) {
                displayAlert(`Rider created successfully! Welcome email sent to ${newRider.email}`, "success");
            } else {
                displayAlert(`Rider created successfully, but welcome email failed.Please share login credentials manually.`, "success");
                console.warn('Email sending failed:', newRider.email_message);
            }

        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Failed to add rider";
            displayAlert(message, "error");
            console.error("Error adding rider:", error);
        }
    };

    // Edit Rider handler-now with proper typing (no more any!)
    const handleEditRider = async (riderData: EditRiderData) => {
        if (!selectedRider) return;

        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/rider/${selectedRider.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: 'include',
                body: JSON.stringify(riderData),
            });

            if (response.status === 401) {
                sessionStorage.removeItem('user');
                window.location.href = '/login';
                return;
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update rider');
            }

            const updatedRider: RiderType & {
                password_updated?: boolean;
                email_sent?: boolean;
                email_message?: string
            } = await response.json();

            // Update the rider in the list, preserving shift statistics
            setRiders(prev => prev.map(r =>
                r.id === selectedRider.id
                    ? { ...r, ...updatedRider }
                    : r
            ));

            setShowEditModal(false);
            setSelectedRider(null);

            // Show appropriate success message based on what was updated
            if (updatedRider.password_updated) {
                if (updatedRider.email_sent) {
                    displayAlert(`Rider updated successfully! Password update email sent to ${updatedRider.email}`, "success");
                } else {
                    displayAlert(`Rider updated successfully, but password email failed.Please share new credentials manually.`, "success");
                    console.warn('Password email failed:', updatedRider.email_message);
                }
            } else {
                displayAlert("Rider updated successfully", "success");
            }

        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Failed to update rider";
            displayAlert(message, "error");
            console.error("Error editing rider:", error);
        }
    };

    // Delete (Deactivate) Rider handler
    const handleDeleteRider = async (id: string) => {
        console.log('Starting delete for rider ID:', id);

        try {
            console.log('Making DELETE request to:', `${import.meta.env.VITE_API_URL}/admin/rider/${id}`);

            const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/rider/${id}`, {
                method: "DELETE",
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            console.log("Delete response status:", response.status);
            console.log("Delete response headers:", response.headers);

            const responseText = await response.text();
            console.log("Delete response text:", responseText);

            if (response.status === 401) {
                console.log('Unauthorized-redirecting to login');
                sessionStorage.removeItem('user');
                window.location.href = '/login';
                return;
            }

            if (!response.ok) {
                let errorData;
                try {
                    errorData = JSON.parse(responseText);
                } catch {
                    errorData = { error: responseText || 'Unknown error' };
                }
                console.error('Delete failed with error:', errorData);
                throw new Error(errorData.error || 'Failed to deactivate rider');
            }

            let result;
            try {
                result = JSON.parse(responseText);
            } catch {
                result = { message: 'Rider deactivated successfully' };
            }

            console.log('Delete successful, result:', result);

            // Update rider status to inactive instead of removing
            setRiders(prev => prev.map(r =>
                r.id === id
                    ? { ...r, is_active: false }
                    : r
            ));

            setDeleteAlert({ open: false });
            setShowEditModal(false); // Close edit modal if open
            setSelectedRider(null);   // Clear selected rider
            displayAlert(result.message || "Rider deactivated successfully", "success");

        } catch (error: unknown) {
            console.error("Error in handleDeleteRider:", error);
            const message = error instanceof Error ? error.message : "Failed to deactivate rider";
            displayAlert(message, "error");
        }
    };

    // Reactivate Rider handler
    const handleReactivateRider = async (id: string) => {
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/rider/${id}/activate`, {
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
                throw new Error(errorData.error || 'Failed to reactivate rider');
            }

            const result = await response.json();

            // Update rider status to active
            setRiders(prev => prev.map(r =>
                r.id === id
                    ? { ...r, is_active: true }
                    : r
            ));

            displayAlert(result.message || "Rider reactivated successfully", "success");
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Failed to reactivate rider";
            displayAlert(message, "error");
            console.error("Error reactivating rider:", error);
        }
    };

    // Filter riders by search input and active status
    const filteredRiders = riders.filter(rider => {
        const matchesSearch = rider.name.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = showInactive ? !rider.is_active : rider.is_active;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="flex h-screen overflow-hidden">
            <Helmet>
                <title>Riders - Rider Management System</title>
                <meta name="description" content="Manage riders, view their shifts and details." />
            </Helmet>
            {/* Alert in the top-right corner */}
            {alert && (
                <div className="fixed top-6 right-6 z-50">
                    <Alert message={alert.message} type={alert.type} />
                </div>
            )}

            {width > 968 ? <Menu /> : <SmallMenu />}

            <div className="flex flex-col items-center w-full">
                <h1 className="text-2xl font-bold text-center mt-2">Rider Management</h1>

                <div className="flex justify-between w-full max-w-4xl">
                    <SearchBar
                        onSearch={value => setSearch(value)}
                        onAddClick={() => setShowAddModal(true)}
                        onRefresh={fetchRiders}
                        loading={loading}
                        showInactive={showInactive}
                        onToggleInactive={setShowInactive}
                    />
                </div>

                {/* Riders count and status */}
                <div className="flex gap-4 mt-2 text-sm text-gray-600">
                    <span>
                        Showing {filteredRiders.length} {showInactive ? 'inactive' : 'active'} riders
                    </span>
                    <span>Total: {riders.length} riders</span>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center mt-10">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                        <span className="ml-3 text-gray-600">Loading riders...</span>
                    </div>
                ) : (
                    <div className="flex flex-wrap justify-around gap-3 mt-6 mb-1 overflow-y-auto max-h-[calc(100vh-200px)]">
                        {filteredRiders.length === 0 ? (
                            <div className="text-center text-gray-500 mt-10">
                                <p>No {showInactive ? 'inactive' : 'active'} riders found</p>
                                {search && <p className="text-sm">Try adjusting your search</p>}
                            </div>
                        ) : (
                            filteredRiders.map(rider => (
                                <RiderCard
                                    key={rider.id}
                                    rider={rider}
                                    onEdit={() => {
                                        setSelectedRider(rider);
                                        setShowEditModal(true);
                                    }}
                                    onDelete={() => setDeleteAlert({
                                        open: true,
                                        id: rider.id,
                                        name: rider.name
                                    })}
                                    onReactivate={() => handleReactivateRider(rider.id)}
                                />
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* Add Rider Modal */}
            {showAddModal && (
                <RiderModal
                    title="Add New Rider"
                    onClose={() => setShowAddModal(false)}
                    onSubmit={handleAddRider}
                    isEditing={false}  // Add this line
                />
            )}

            {/* Edit Rider Modal */}
            {showEditModal && selectedRider && (
                <RiderModal
                    title="Edit Rider"
                    rider={selectedRider}
                    onClose={() => {
                        setShowEditModal(false);
                        setSelectedRider(null);
                    }}
                    onSubmit={handleEditRider}
                    onDelete={() => handleDeleteRider(selectedRider.id)} // Add this line
                    isEditing={true}
                />
            )}

            {/* Delete Confirmation Alert */}
            {deleteAlert.open && (
                <div className="fixed inset-0 flex items-center justify-center bg-[#ffffff74] bg-opacity-50 z-50">
                    <div className="bg-white p-6 rounded-lg shadow-lg max-w-md">
                        <h3 className="text-lg font-semibold mb-2">Deactivate Rider</h3>
                        <p className="mb-4 text-gray-700">
                            Are you sure you want to deactivate <strong>{deleteAlert.name}</strong>?
                            <br />
                            <span className="text-sm text-gray-500">
                                This will hide them from active riders but preserve their data and shift history.
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
                                onClick={() => deleteAlert.id && handleDeleteRider(deleteAlert.id)}
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

export default Rider;

// Updated Search bar with refresh and inactive toggle
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
        <div className="flex flex-row items-center bg-white rounded-4xl shadow-sm py-3 px-2 sm:px-6 gap-2 w-full mt-6">
            {/* Search Input */}
            <div className="flex items-center flex-grow bg-gray-100 rounded-full px-3 py-2">
                <FiSearch className="text-gray-400 mr-2" />
                <input
                    type="text"
                    placeholder="Search by name..."
                    className="bg-transparent outline-none text-sm text-gray-700 w-full"
                    onChange={(e) => onSearch(e.target.value)}
                />
            </div>
            {/* Toggle Inactive/Active Button */}
            <button
                onClick={() => onToggleInactive(!showInactive)}
                className={`flex items-center justify-center px-3 py-2 rounded-md text-sm transition
                    ${showInactive
                        ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }
                `}
                title={showInactive ? 'Show Active' : 'Show Inactive'}
            >
                <span className="hidden sm:inline">
                    {showInactive ? 'Show Active' : 'Show Inactive'}
                </span>
                <span className="sm:hidden">
                    {showInactive ? <FaRegStar size={18} /> : <FaStar size={18} />}
                </span>
            </button>
            {/* Refresh Button */}
            <button
                onClick={onRefresh}
                disabled={loading}
                className="flex items-center justify-center px-3 py-2 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 transition disabled:opacity-50"
                title="Refresh"
            >
                {loading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                ) : (
                    <FiRefreshCw size={18} />
                )}
            </button>
            {/* Add Riders Button */}
            <button
                onClick={onAddClick}
                className="flex items-center justify-center gap-1 px-4 py-2 rounded-md bg-[#1680E4] text-white text-sm hover:bg-[#126dcc] transition"
                title="Add Rider"
            >
                <FiPlus size={18} />
                <span className="hidden sm:inline">Add Rider</span>
            </button>
        </div>
    );
};

// Enhanced Rider Card with complete information
interface RiderCardProps {
    rider: RiderType;
    onEdit: () => void;
    onDelete: () => void;
    onReactivate: () => void;
}

const RiderCard: FC<RiderCardProps> = ({ rider, onEdit, onDelete, onReactivate }) => {
    const canDelete = rider.active_shifts === 0 && rider.upcoming_shifts === 0;

    return (
        <div className={`bg-white rounded-2xl shadow-lg border border-gray-200 p-4 w-full max-w-2xs sm:w-70 space-y-3 mx-auto ${!rider.is_active ? 'opacity-75 border-2 border-orange-200' : ''}`}>
            {/* Status Badge */}
            {!rider.is_active && (
                <div className="flex justify-center">
                    <span className="px-4 py-2 bg-orange-100 text-orange-700 text-xs rounded-full">
                        Inactive
                    </span>
                </div>
            )}

            {/* Avatar + Name */}
            <div className="flex items-center space-x-3">
                <div className="bg-green-100 p-3 rounded-full">
                    <span className="text-green-600 text-xl">👤</span>
                </div>
                <div className="font-semibold text-gray-800">{rider.name}</div>
            </div>

            {/* Contact Info */}
            <div className="text-sm text-gray-600 space-y-1">
                <div className="flex items-center gap-2">
                    <FiPhone className="text-gray-500" /> <span>{rider.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                    <FiMail className="text-gray-500" /> <span>{rider.email}</span>
                </div>
            </div>

            {/* Shifts + Actions */}
            <div className="flex flex-col sm:flex-row sm:justify-between items-center pt-2 gap-2">
                <div className="text-sm text-gray-700 space-y-1 w-full">
                    <div>{rider.completed_shifts} shifts completed</div>
                    <div className="flex gap-2">
                        <span className="text-xs rounded-full px-2 py-0.5 bg-teal-100 text-teal-700">
                            {rider.active_shifts} active
                        </span>
                        <span className="text-xs rounded-full px-2 py-0.5 bg-purple-100 text-purple-700">
                            {rider.upcoming_shifts} upcoming
                        </span>
                    </div>
                </div>
                <div className="flex gap-2 w-full sm:w-auto justify-end">
                    <button
                        onClick={onEdit}
                        className="p-2 bg-[#1680E4] text-white rounded-md hover:bg-[#1268ba] focus:outline-none focus:ring-2 focus:ring-[#1680E4]"
                    >
                        <FiEdit2 size={16} />
                    </button>
                    <button
                        onClick={rider.is_active ? onDelete : onReactivate}
                        className={`p-2 rounded-md focus:outline-none focus:ring-2 ${rider.is_active ? 'bg-[#1680E4] text-white hover:bg-[#1268ba]' : 'bg-green-500 text-white hover:bg-green-600'}`}
                        disabled={!canDelete && rider.is_active}
                    >
                        {rider.is_active ? <FiTrash size={16} /> : <FiRefreshCw size={16} />}
                    </button>
                </div>
            </div>
        </div>
    );
};

// Fix the Modal interface-no more any!
const RiderModal: FC<{
    title: string;
    rider?: RiderType;
    onClose: () => void;
    onSubmit: (data: AddRiderData | EditRiderData) => void | Promise<void>;
    onDelete?: (id: string) => void;
    onReactivate?: (id: string) => void; // Add reactivate handler
    isEditing?: boolean;
}> = ({ title, rider, onClose, onSubmit, onDelete, onReactivate, isEditing = false }) => {
    const [name, setName] = useState(rider?.name || "");
    const [phone, setPhone] = useState(rider?.phone || "");
    const [email, setEmail] = useState(rider?.email || "");
    const [password, setPassword] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [updatePassword, setUpdatePassword] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showReactivateConfirm, setShowReactivateConfirm] = useState(false);
    const [modalAlert, setModalAlert] = useState<{ message: string; type?: 'success' | 'error' | 'info' } | null>(null);

    // Generate a random password for the rider
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
        if (!name || !phone || !email) return;
        if (!isValidPhone(phone)) {
            setModalAlert({ message: "Phone must be 10 digits and start with 0", type: "error" });
            return;
        }
        if (!isValidEmail(email)) {
            setModalAlert({ message: "Email not valid", type: "error" });
            return;
        }
        if (isEditing) {
            const editData: EditRiderData & { password?: string } = { name, phone, email };
            if (updatePassword && password) {
                editData.password = password;
            }
            onSubmit(editData);
        } else {
            if (!password) return;
            onSubmit({ name, phone, email, password });
        }
    };

    const handleDelete = () => {
        console.log('Modal delete clicked for rider:', rider?.id);
        if (rider && onDelete) {
            setShowDeleteConfirm(false);
            onDelete(rider.id);
        }
    };

    const handleReactivate = () => {
        console.log('Modal reactivate clicked for rider:', rider?.id);
        if (rider && onReactivate) {
            setShowReactivateConfirm(false);
            onReactivate(rider.id);
        }
    };

    // Check if rider can be deleted (no active or upcoming shifts)
    const canDelete = rider && rider.active_shifts === 0 && rider.upcoming_shifts === 0;
    const isActive = rider?.is_active ?? true; // Default to true for new riders

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-[#ffffff75] bg-opacity-50 z-50">
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md space-y-5 max-h-[90vh] overflow-y-auto">
                {modalAlert && (
                    <Alert message={modalAlert.message} type={modalAlert.type} />
                )}
                {/* Modal Title */}
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
                    {isEditing && rider && (
                        <>
                            {/* Show DEACTIVATE button only for ACTIVE riders */}
                            {isActive ? (
                                <button
                                    onClick={() => setShowDeleteConfirm(true)}
                                    disabled={!canDelete}
                                    className={`p-2 rounded-lg transition ${canDelete
                                        ? 'bg-red-500 hover:bg-red-600 text-white'
                                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                        } `}
                                    title={canDelete ? 'Deactivate rider' : 'Cannot deactivate: rider has active or upcoming shifts'}
                                >
                                    <FiTrash size={16} />
                                </button>
                            ) : (
                                /* Show REACTIVATE button for INACTIVE riders */
                                <button
                                    onClick={() => setShowReactivateConfirm(true)}
                                    className="p-2 rounded-lg transition bg-green-500 hover:bg-green-600 text-white"
                                    title="Reactivate rider"
                                >
                                    <FiRefreshCw size={16} />
                                </button>
                            )}
                        </>
                    )}
                </div>

                {/* Status Badge for inactive riders */}
                {isEditing && rider && !isActive && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                        <p className="text-sm text-orange-700">
                            <strong>Status:</strong> This rider is currently inactive.
                        </p>
                    </div>
                )}

                {/* Input Fields */}
                <div className="space-y-4">
                    <input
                        className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#1680E4] focus:border-transparent"
                        placeholder="Full Name *"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                    <input
                        className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#1680E4] focus:border-transparent"
                        placeholder="Phone Number *"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                    />
                    <input
                        type="email"
                        className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#1680E4] focus:border-transparent"
                        placeholder="Email Address *"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />

                    {/* Password field-for both adding and editing */}
                    {!isEditing ? (
                        // Add mode-password required
                        <div className="space-y-2">
                            <div className="flex gap-2 items-center">
                                <input
                                    className="flex-1 border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#1680E4] focus:border-transparent"
                                    placeholder="Password *"
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
                                The rider will use this password to login to their mobile app.
                            </p>
                        </div>
                    ) : (
                        // Edit mode-password optional with checkbox
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="updatePassword"
                                    checked={updatePassword}
                                    onChange={(e) => {
                                        setUpdatePassword(e.target.checked);
                                        if (!e.target.checked) {
                                            setPassword("");
                                        }
                                    }}
                                    className="w-4 h-4 text-[#1680E4] bg-gray-100 border-gray-300 rounded focus:ring-[#1680E4] focus:ring-2"
                                />
                                <label htmlFor="updatePassword" className="text-sm text-gray-700 cursor-pointer">
                                    Update password for this rider
                                </label>
                            </div>

                            {updatePassword && (
                                <div className="space-y-2">
                                    <div className="flex gap-2 items-center">
                                        <input
                                            className="flex-1 border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#1680E4] focus:border-transparent"
                                            placeholder="New Password"
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
                                        Leave empty to keep existing password, or generate/enter a new one.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Warning for active riders with shifts */}
                {isEditing && rider && isActive && !canDelete && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                        <p className="text-sm text-orange-700">
                            <strong>Note:</strong> This rider has {rider.active_shifts} active and {rider.upcoming_shifts} upcoming shifts.
                            Complete or cancel these shifts before deactivating the rider.
                        </p>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-between pt-4 border-t">
                    {/* Left side-Status change button (only in edit mode) */}
                    <div>
                        {isEditing && rider && (
                            <>
                                {isActive ? (
                                    /* Deactivate button for active riders */
                                    <button
                                        className={`px-4 py-2 rounded-xl transition ${canDelete
                                            ? 'bg-red-500 text-white hover:bg-red-600'
                                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                            } `}
                                        onClick={() => setShowDeleteConfirm(true)}
                                        disabled={!canDelete}
                                    >
                                        Deactivate Rider
                                    </button>
                                ) : (
                                    /* Reactivate button for inactive riders */
                                    <button
                                        className="px-4 py-2 rounded-xl transition bg-green-500 text-white hover:bg-green-600"
                                        onClick={() => setShowReactivateConfirm(true)}
                                    >
                                        Reactivate Rider
                                    </button>
                                )}
                            </>
                        )}
                    </div>

                    {/* Right side-Cancel & Save buttons */}
                    <div className="flex gap-3">
                        <button
                            className="px-6 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 transition"
                            onClick={onClose}
                        >
                            Cancel
                        </button>
                        <button
                            className="px-6 py-2 rounded-xl bg-[#1680E4] text-white hover:bg-[#126dcc] transition disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={handleSubmit}
                            disabled={!name || !phone || !email || (!isEditing && !password) || (isEditing && updatePassword && !password)}
                        >
                            {isEditing ? 'Update' : 'Create'} Rider
                        </button>
                    </div>
                </div>

                {/* Delete Confirmation Modal */}
                {showDeleteConfirm && (
                    <div className="absolute inset-0 flex items-center justify-center bg-[#ffffff74] bg-opacity-50 rounded-2xl">
                        <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm mx-4">
                            <h3 className="text-lg font-semibold mb-2">Confirm Deactivation</h3>
                            <p className="mb-4 text-gray-700">
                                Are you sure you want to deactivate <strong>{rider?.name}</strong>?
                                <br />
                                <span className="text-sm text-gray-500">
                                    This will hide them from active riders but preserve their data and shift history.
                                </span>
                            </p>
                            <div className="flex gap-3 justify-end">
                                <button
                                    className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 transition"
                                    onClick={() => setShowDeleteConfirm(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    className="px-4 py-2 rounded bg-red-500 text-white hover:bg-red-600 transition"
                                    onClick={handleDelete}
                                >
                                    Deactivate
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Reactivate Confirmation Modal */}
                {showReactivateConfirm && (
                    <div className="absolute inset-0 flex items-center justify-center bg-[#ffffff74] bg-opacity-50 rounded-2xl">
                        <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm mx-4">
                            <h3 className="text-lg font-semibold mb-2">Confirm Reactivation</h3>
                            <p className="mb-4 text-gray-700">
                                Are you sure you want to reactivate <strong>{rider?.name}</strong>?
                                <br />
                                <span className="text-sm text-gray-500">
                                    This will make them available for new shift assignments.
                                </span>
                            </p>
                            <div className="flex gap-3 justify-end">
                                <button
                                    className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 transition"
                                    onClick={() => setShowReactivateConfirm(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    className="px-4 py-2 rounded bg-green-500 text-white hover:bg-green-600 transition"
                                    onClick={handleReactivate}
                                >
                                    Reactivate
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const isValidPhone = (phone: string) => /^0\d{9}$/.test(phone);
const isValidEmail = (email: string) =>
    /^[\w.-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
