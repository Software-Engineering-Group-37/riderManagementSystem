import type { FC } from "react";
import { useEffect, useState } from "react";
import { FiEdit2, FiMail, FiPhone, FiPlus, FiSearch, FiTrash } from "react-icons/fi";
import Alert from "./Alert"; // <-- Import Alert
import Menu from "./Menu";
import SmallMenu from "./SmallMenu";

// Rider type definition
interface RiderType {
    id: string;
    name: string;
    phone: string;
    email: string;
    shiftsCompleted: number;
}

const Rider = () => {
    const [width, setWidth] = useState(window.innerWidth);
    const [riders, setRiders] = useState<RiderType[]>([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedRider, setSelectedRider] = useState<RiderType | null>(null);
    const [deleteAlert, setDeleteAlert] = useState<{ open: boolean; id?: string }>({ open: false });
    const [search, setSearch] = useState("");
    const [alert, setAlert] = useState<{ message: string; type?: 'success' | 'error' | 'info' } | null>(null);

    // Helper to show alert for a short time
    const showAlert = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
        setAlert({ message, type });
        setTimeout(() => setAlert(null), 2500);
    };

    // Fetch riders from backend on mount
    useEffect(() => {
        document.title = "Rider - Rider Management System";
        const handleResize = () => setWidth(window.innerWidth);
        window.addEventListener("resize", handleResize);

        const fetchRiders = async () => {
            try {
                const res = await fetch("http://localhost:4000/riders");
                if (!res.ok) throw new Error("Failed to fetch riders");
                const data = await res.json();
                setRiders(data);
            } catch (error) {
                console.error("Error fetching riders:", error);
            }
        };
        fetchRiders();

        return () => window.removeEventListener("resize", handleResize);
    }, []);

    // Add Rider handler
    const handleAddRider = async (rider: Omit<RiderType, "id" | "shiftsCompleted">) => {
        try {
            const res = await fetch("http://localhost:4000/riders", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(rider),
            });
            if (!res.ok) throw new Error("Failed to add rider");
            const newRider = await res.json();
            setRiders(prev => [...prev, newRider]);
            setShowAddModal(false);
            showAlert("Rider added successfully", "success");
        } catch (error) {
            showAlert("Failed to add rider", "error");
            console.error("Error adding rider:", error);
        }
    };

    // Edit Rider handler
    const handleEditRider = async (rider: RiderType) => {
        try {
            const res = await fetch(`http://localhost:4000/riders/${rider.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(rider),
            });
            if (!res.ok) throw new Error("Failed to update rider");
            setRiders(prev => prev.map(r => (r.id === rider.id ? rider : r)));
            setShowEditModal(false);
            setSelectedRider(null);
            showAlert("Rider updated successfully", "success");
        } catch (error) {
            showAlert("Failed to update rider", "error");
            console.error("Error editing rider:", error);
        }
    };

    // Delete Rider handler
    const handleDeleteRider = async (id: string) => {
        try {
            const res = await fetch(`http://localhost:4000/riders/${id}`, {
                method: "DELETE",
            });
            if (!res.ok) throw new Error("Failed to delete rider");
            setRiders(prev => prev.filter(r => r.id !== id));
            setDeleteAlert({ open: false });
            showAlert("Rider deleted", "success");
        } catch (error) {
            showAlert("Failed to delete rider", "error");
            console.error("Error deleting rider:", error);
        }
    };

    // Filter riders by search input
    const filteredRiders = riders.filter(rider =>
        rider.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="flex h-screen overflow-hidden">
            {/* Alert in the top-right corner */}
            {alert && (
                <div className="fixed top-6 right-6 z-50">
                    <Alert message={alert.message} type={alert.type} />
                </div>
            )}
            {width > 968 ? <Menu /> : <SmallMenu />}
            <div className="flex flex-col items-center w-full ">
                <h1 className="text-2xl font-bold text-center mt-2">Rider Management</h1>
                <div className="flex justify-between w-full max-w-3xl">
                    <SearchBar
                        onSearch={value => setSearch(value)}
                        onAddClick={() => setShowAddModal(true)}
                    />
                </div>
                <div className="flex flex-wrap justify-around gap-3 mt-6 mb-1 overflow-y-auto">
                    {filteredRiders.map(rider => (
                        <RiderCard
                            key={rider.id}
                            name={rider.name}
                            phone={rider.phone}
                            email={rider.email}
                            shiftsCompleted={rider.shiftsCompleted}
                            onEdit={() => {
                                setSelectedRider(rider);
                                setShowEditModal(true);
                            }}
                            onDelete={() => setDeleteAlert({ open: true, id: rider.id })}
                        />
                    ))}
                </div>
            </div>

            {/* Add Rider Modal */}
            {showAddModal && (
                <RiderModal
                    title="Add Rider"
                    onClose={() => setShowAddModal(false)}
                    onSubmit={handleAddRider}
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
                    onSubmit={rider => handleEditRider({ ...selectedRider, ...rider })}
                />
            )}

            {/* Delete Confirmation Alert */}
            {deleteAlert.open && (
                <div className="fixed inset-0 flex items-center justify-center bg-[#fdfdfd42] bg-opacity-40 z-50">
                    <div className="bg-white p-6 rounded-lg shadow-lg">
                        <p className="mb-4">Are you sure you want to delete this rider?</p>
                        <div className="flex gap-4 justify-end">
                            <button
                                className="px-4 py-2 rounded bg-gray-200"
                                onClick={() => setDeleteAlert({ open: false })}
                            >
                                Cancel
                            </button>
                            <button
                                className="px-4 py-2 rounded bg-red-500 text-white"
                                onClick={() => deleteAlert.id && handleDeleteRider(deleteAlert.id)}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Rider;

// Search bar for filtering riders and adding new ones
interface SearchBarProps {
    onSearch: (value: string) => void;
    onAddClick: () => void;
}

const SearchBar: FC<SearchBarProps> = ({ onSearch, onAddClick }) => {
    return (
        <div className="flex items-center bg-white rounded-4xl shadow-sm py-4 px-10 space-x-2 max-w-3xl w-full h-14 mt-6">
            {/* Search Input */}
            <div className="flex items-center flex-grow bg-gray-100 rounded-full px-4 py-2">
                <FiSearch className="text-gray-400 mr-2" />
                <input
                    type="text"
                    placeholder="Search by Name"
                    className="bg-transparent outline-none text-sm text-gray-700 w-full"
                    onChange={(e) => onSearch(e.target.value)}
                />
            </div>

            {/* Add Riders Button */}
            <button
                onClick={onAddClick}
                className="flex items-center gap-1 px-4 py-2 rounded-md bg-[#1680E4] text-white text-sm hover:bg-[#1680E4] transition"
            >
                <FiPlus />
                Add Riders
            </button>
        </div>
    );
};

// Card displaying rider info and actions
interface RiderCardProps {
    name: string;
    phone: string;
    email: string;
    shiftsCompleted: number;
    onEdit: () => void;
    onDelete: () => void;
}

const RiderCard: FC<RiderCardProps> = ({
    name,
    phone,
    email,
    shiftsCompleted,
    onEdit,
    onDelete,
}) => {
    return (
        <div className="bg-white rounded-2xl shadow p-4 w-72 space-y-2">
            {/* Avatar + Name */}
            <div className="flex items-center space-x-3">
                <div className="bg-green-100 p-3 rounded-full">
                    <span className="text-green-600 text-xl">👤</span>
                </div>
                <div className="font-semibold text-gray-800">{name}</div>
            </div>

            {/* Contact Info */}
            <div className="text-sm text-gray-600 space-y-1">
                <div className="flex items-center gap-2">
                    <FiPhone /> <span>{phone}</span>
                </div>
                <div className="flex items-center gap-2">
                    <FiMail /> <span>{email}</span>
                </div>
            </div>

            {/* Shifts + Actions */}
            <div className="flex justify-between items-center pt-2">
                <span className="text-sm text-gray-700">{shiftsCompleted} shifts completed</span>
                <div className="flex gap-2">
                    <button
                        onClick={onEdit}
                        className="p-2 bg-[#1680E4] text-white rounded-md hover:bg-[#1268ba]"
                    >
                        <FiEdit2 size={16} />
                    </button>
                    <button
                        onClick={onDelete}
                        className="p-2 bg-[#1680E4] text-white rounded-md hover:bg-[#1268ba]"
                    >
                        <FiTrash size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};

// Modal for adding or editing a rider
const RiderModal: FC<{
    title: string;
    rider?: Partial<RiderType & { password?: string }>;
    onClose: () => void;
    onSubmit: (rider: Omit<RiderType, "id" | "shiftsCompleted"> & { password?: string }) => void;
}> = ({ title, rider = {}, onClose, onSubmit }) => {
    const [name, setName] = useState(rider.name || "");
    const [phone, setPhone] = useState(rider.phone || "");
    const [email, setEmail] = useState(rider.email || "");
    const [password, setPassword] = useState(rider.password || "");
    const [isGenerating, setIsGenerating] = useState(false);

    // Generate a random password for the rider
    const generatePassword = () => {
        const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
        let pass = "";
        for (let i = 0; i < 10; i++) {
            pass += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setPassword(pass);
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-[#fdfdfd42] bg-opacity-40 z-50">
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md space-y-5">
                {/* Modal Title */}
                <h2 className="text-xl font-semibold text-gray-800">{title}</h2>

                {/* Input Fields */}
                <div className="space-y-4">
                    <input
                        className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#1680E4]"
                        placeholder="Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                    <input
                        className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#1680E4]"
                        placeholder="Phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                    />
                    <input
                        className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#1680E4]"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />

                    {/* Password + Generate */}
                    <div className="flex gap-2 items-center">
                        <input
                            className="flex-1 border border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#1680E4]"
                            placeholder="Password"
                            type="text"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        <button
                            type="button"
                            className="px-4 py-2 rounded-xl bg-[#1680E4] text-white flex items-center justify-center min-w-[100px] hover:bg-[#126dcc] disabled:opacity-60"
                            onClick={() => {
                                generatePassword();
                                setIsGenerating(false);
                            }}
                            disabled={isGenerating}
                        >
                            {isGenerating ? (
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                "Generate"
                            )}
                        </button>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-4">
                    <button
                        className="px-4 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 transition"
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                    <button
                        className="px-4 py-2 rounded-xl bg-[#1680E4] text-white hover:bg-[#126dcc] transition disabled:opacity-50"
                        onClick={() => {
                            if (name && phone && email) {
                                onSubmit({ name, phone, email, password });
                            }
                        }}
                        disabled={!name || !phone || !email}
                    >
                        Save
                    </button>
                </div>
            </div>
        </div>

    );
};
