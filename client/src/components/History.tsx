import type { FC } from "react";
import { useCallback, useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import {
    FiClock,
    FiDownload,
    FiFileText,
    FiFilter,
    FiRotateCw,
    FiTrash,
    FiUser,
    FiUserPlus
} from "react-icons/fi";
import Alert from "./Alert";
import Menu from "./Menu";
import SmallMenu from "./SmallMenu";
import { useSharedValue } from './context/shareValue';

// Audit log data types
interface AuditLog {
    audit_id: string;
    audit_type: string;
    audit_date: string;
    description: string;
    performed_by_admin: string;
    admin_email?: string;
    // Specific fields based on audit type
    rider_name?: string;
    rider_email?: string;
    rider_phone?: string;
    zone_name?: string;
    start_date?: string;
    end_date?: string;
    start_time?: string;
    end_time?: string;
    status?: string;
    role_name?: string;
    admin_name?: string;
    is_active?: boolean;
}

interface AuditResponse {
    data: AuditLog[];
    pagination: {
        currentPage: number;
        totalPages: number;
        totalCount: number;
        hasNextPage: boolean;
        hasPreviousPage: boolean;
    };
    filters: {
        type: string;
        startDate?: string;
        endDate?: string;
        search?: string;
        adminId?: string;
    };
}

interface AuditStats {
    summary: {
        total_past_shifts: number;
        total_rider_registrations: number;
        total_shift_deletions: number;
        total_admin_activities: number;
        most_active_admin: string;
    };
    dailyActivity: Array<{
        date: string;
        audit_type: string;
        count: number;
    }>;
}

interface AdminOption {
    id: string;
    name: string;
    email: string;
    total_activities: number;
}

// Audit type options
const AUDIT_TYPES = [
    {
        value: 'rider-shift-assignments',
        label: 'Rider Shift Assignments',
        icon: FiClock,
        description: 'Past shift assignments and completions'
    },
    {
        value: 'rider-registrations',
        label: 'Rider Registrations',
        icon: FiUserPlus,
        description: 'New rider registrations by admins'
    },
    {
        value: 'shift-deletions',
        label: 'Shift Deletions',
        icon: FiTrash,
        description: 'Deleted or cancelled shifts'
    },
    {
        value: 'admin-registrations',
        label: 'Admin Registrations',
        icon: FiUser,
        description: 'Admin registrations and role changes'
    }
];

const History = () => {
    const { isRegularAdmin } = useSharedValue();

    // Filter audit types based on user role
    const getAvailableAuditTypes = () => {
        if (isRegularAdmin) {
            // Regular Admin: Only rider and shift related audits
            return AUDIT_TYPES.filter(type =>
                type.value === 'rider-shift-assignments' ||
                type.value === 'rider-registrations'
            );
        } else {
            // superadmin: All audit types
            return AUDIT_TYPES;
        }
    };

    const availableAuditTypes = getAvailableAuditTypes();

    // Update initial selected type based on role
    const [selectedType, setSelectedType] = useState(() => {
        if (isRegularAdmin) {
            return 'rider-shift-assignments'; // Default for regular admin
        }
        return 'rider-shift-assignments'; // Default for superadmin
    });

    const [width, setWidth] = useState(window.innerWidth);
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(false);
    const [alert, setAlert] = useState<{ message: string; type?: 'success' | 'error' | 'info' } | null>(null);

    // Filter states
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [search, setSearch] = useState('');
    const [selectedAdmin, setSelectedAdmin] = useState('');

    // Pagination and data states
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [pageSize, setPageSize] = useState(25);

    // Additional data
    const [stats, setStats] = useState<AuditStats | null>(null);
    const [adminOptions, setAdminOptions] = useState<AdminOption[]>([]);
    const [exporting, setExporting] = useState(false);
    const [showFilters, setShowFilters] = useState(window.innerWidth > 968); // true on desktop, false on mobile

    // Helper to show alert
    const displayAlert = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
        setAlert({ message, type });
        setTimeout(() => setAlert(null), 3000);
    };

    // Fetch audit logs with filters
    const fetchAuditLogs = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: currentPage.toString(),
                limit: pageSize.toString(),
            });

            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);
            if (search) params.append('search', search);
            if (selectedAdmin) params.append('adminId', selectedAdmin);

            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/admin/audit-logs/${selectedType}?${params}`,
                { credentials: 'include' }
            );

            if (response.status === 401) {
                sessionStorage.removeItem('user');
                window.location.href = '/login';
                return;
            }

            if (response.status === 403) {
                displayAlert("You don't have permission to view audit logs", "error");
                return;
            }

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: Failed to fetch audit logs`);
            }

            const data: AuditResponse = await response.json();
            setAuditLogs(data.data);
            setCurrentPage(data.pagination.currentPage);
            setTotalPages(data.pagination.totalPages);
            setTotalCount(data.pagination.totalCount);
        } catch (error) {
            console.error("Error fetching audit logs:", error);
            displayAlert("Failed to load audit logs", "error");
        } finally {
            setLoading(false);
        }
    }, [currentPage, pageSize, startDate, endDate, search, selectedAdmin, selectedType]);

    // Fetch audit statistics
    const fetchStats = useCallback(async () => {
        try {
            const params = new URLSearchParams();
            console.log("Fetching stats with params:", params.toString());
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);

            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/admin/audit-stats?${params}`,
                { credentials: 'include' }
            );

            if (response.ok) {
                const data: AuditStats = await response.json();
                setStats(data);
            }
        } catch (error) {
            console.error("Error fetching audit stats:", error);
        }
    }, [startDate, endDate]);

    // Fetch admin options for filtering
    const fetchAdminOptions = useCallback(async () => {
        try {
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/admin/audit-admins`,
                { credentials: 'include' }
            );

            if (response.ok) {
                const data: AdminOption[] = await response.json();
                setAdminOptions(data);
            }
        } catch (error) {
            console.error("Error fetching admin options:", error);
        }
    }, []);

    // Export audit logs
    const handleExport = async () => {
        setExporting(true);
        try {
            const params = new URLSearchParams();
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);
            if (search) params.append('search', search);
            if (selectedAdmin) params.append('adminId', selectedAdmin);

            const response = await fetch(
                `{ import.meta.env.VITE_API_URL }/admin/audit-logs/${selectedType} /export?${params}`,
                { credentials: 'include' }
            );

            if (!response.ok) {
                throw new Error('Export failed');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${selectedType}-audit-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            displayAlert("Audit logs exported successfully", "success");
        } catch (error) {
            console.error("Error exporting audit logs:", error);
            displayAlert("Failed to export audit logs", "error");
        } finally {
            setExporting(false);
        }
    };

    // Reset filters
    const resetFilters = () => {
        setStartDate('');
        setEndDate('');
        setSearch('');
        setSelectedAdmin('');
        setCurrentPage(1);
    };

    // Handle type change
    const handleTypeChange = (newType: string) => {
        setSelectedType(newType);
        setCurrentPage(1);
    };

    // Handle page change
    const handlePageChange = (newPage: number) => {
        setCurrentPage(newPage);
    };

    // Initialize component
    useEffect(() => {
        document.title = "History-Rider Management System";
        const handleResize = () => {
            setWidth(window.innerWidth);
            if (window.innerWidth > 968) setShowFilters(true);
            else setShowFilters(false);
        };
        window.addEventListener("resize", handleResize);

        fetchAdminOptions();
        fetchStats();

        return () => window.removeEventListener("resize", handleResize);
    }, [fetchAdminOptions, fetchStats]);

    // Fetch data when filters change
    useEffect(() => {
        const debounceTimer = setTimeout(() => {
            fetchAuditLogs();
        }, 300);

        return () => clearTimeout(debounceTimer);
    }, [fetchAuditLogs]);

    // Fetch stats when date range changes
    useEffect(() => {
        fetchStats();
    }, [startDate, endDate, fetchStats]);

    return (
        <div className="flex h-screen overflow-hidden">
            <Helmet>
                <title>History - Rider Management System</title>
                <meta name="description" content="View the history of rider activities and shifts." />
            </Helmet>
            {alert && <Alert message={alert.message} type={alert.type} />}
            {width > 968 ? <Menu /> : <SmallMenu />}

            <div className="flex flex-col w-full overflow-auto">
                {/* Header with role indicator */}
                <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">📄 History</h1>
                        <p className="text-sm text-gray-600 mt-1">
                            {isRegularAdmin
                                ? "Rider and shift activity tracking"
                                : "Complete audit logs and system activity tracking"
                            }
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs text-gray-500">Total Records:</span>
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {totalCount}
                            </span>
                            {stats && (
                                <div className="flex items-center gap-6 text-sm text-gray-600">
                                    {stats.summary.most_active_admin && (
                                        <span className="text-xs text-gray-500">Most Active: <strong>{stats.summary.most_active_admin}</strong></span>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                    {/* Desktop Buttons */}
                    {width > 600 && (
                        <div className="flex items-center gap-3">
                            <button
                                onClick={resetFilters}
                                className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition"
                            >
                                Reset Filters
                            </button>
                            <button
                                onClick={handleExport}
                                disabled={exporting || auditLogs.length === 0}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition disabled:opacity-50"
                            >
                                {exporting ? (
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <FiDownload size={16} />
                                )}
                                Export CSV
                            </button>
                        </div>
                    )}
                </div>

                {/* Filters Section */}
                {showFilters && (
                    <div className={`bg-white border-b border-gray-200 px-4 py-4 ${width <= 600 ? 'space-y-4' : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'}`}>
                        {/* Audit Type */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">📂 Audit Type</label>
                            <select
                                value={selectedType}
                                onChange={(e) => handleTypeChange(e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                {availableAuditTypes.map(type => (
                                    <option key={type.value} value={type.value}>
                                        {type.label}
                                    </option>
                                ))}
                            </select>
                            {availableAuditTypes.find(t => t.value === selectedType) && (
                                <p className="text-xs text-gray-500 mt-1">
                                    {availableAuditTypes.find(t => t.value === selectedType)?.description}
                                </p>
                            )}
                        </div>

                        {/* Search */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">🔍 Search</label>
                            <input
                                type="text"
                                placeholder={isRegularAdmin
                                    ? "Search riders, zones..."
                                    : "Search names, emails, zones..."
                                }
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>

                        {/* Date Range */}
                        <div className={`${width <= 600 ? '' : 'flex gap-2'}`}>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">📅 Start Date</label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                            <div className={`${width <= 600 ? 'mt-2' : ''}`}>
                                <label className="block text-sm font-medium text-gray-700 mb-2">📅 End Date</label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                        </div>

                        {/* Admin Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">👤 Admin</label>
                            <select
                                value={selectedAdmin}
                                onChange={(e) => setSelectedAdmin(e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="">All Admins</option>
                                {adminOptions.map(admin => (
                                    <option key={admin.id} value={admin.id}>
                                        {admin.name} ({admin.total_activities} activities)
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Buttons */}
                        <div className={`${width <= 600 ? 'flex flex-col gap-2 mt-4' : 'flex items-center gap-2 mt-4'}`}>
                            <button
                                onClick={fetchAuditLogs}
                                disabled={loading}
                                className={`w-full px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition disabled:opacity-50`}
                            >
                                {loading ? (
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                                ) : (
                                    "Apply"
                                )}
                            </button>
                            <button
                                onClick={resetFilters}
                                className="w-full px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition"
                            >
                                Reset
                            </button>
                        </div>
                    </div>
                )}

                {/* Mobile Top Bar with Icon Buttons */}
                {width <= 600 && (
                    <div className="flex justify-end gap-2 px-4 py-2 bg-white border-b border-gray-200 sticky top-0 z-10">
                        <button
                            onClick={() => setShowFilters(f => !f)}
                            className="p-2 rounded-full bg-blue-600 text-white"
                            title="Show Filters"
                        >
                            <FiFilter size={20} />
                        </button>
                        <button
                            onClick={resetFilters}
                            className="p-2 rounded-full bg-gray-100 text-gray-700"
                            title="Reset Filters"
                        >
                            <FiRotateCw size={20} />
                        </button>
                        <button
                            onClick={handleExport}
                            disabled={exporting || auditLogs.length === 0}
                            className="p-2 rounded-full bg-blue-600 text-white disabled:opacity-50"
                            title="Export CSV"
                        >
                            {exporting ? (
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <FiDownload size={20} />
                            )}
                        </button>
                    </div>
                )}

                {/* Table or Cards Section */}
                <div className="flex-1 overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-center">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                                <p className="mt-4 text-gray-600">Loading audit logs...</p>
                            </div>
                        </div>
                    ) : (
                        width > 600 ? (
                            <div className="h-full overflow-auto">
                                <AuditTable
                                    logs={auditLogs}
                                    auditType={selectedType}
                                    currentPage={currentPage}
                                    totalPages={totalPages}
                                    totalCount={totalCount}
                                    pageSize={pageSize}
                                    onPageChange={handlePageChange}
                                    onPageSizeChange={setPageSize}
                                />
                            </div>
                        ) : (
                            <div className="h-full overflow-auto px-2 py-2 space-y-3">
                                {auditLogs.length === 0 ? (
                                    <div className="text-center text-gray-500 mt-10">
                                        <p>No audit logs found</p>
                                        <p className="text-sm">Try adjusting your filters or date range</p>
                                    </div>
                                ) : (
                                    auditLogs.map((log) => (
                                        <div key={log.audit_id} className="bg-white rounded-xl shadow p-4 flex flex-col gap-1">
                                            <div className="flex items-center gap-2 text-sm text-gray-700">
                                                {selectedType === 'rider-shift-assignments' && <FiClock className="text-blue-600" />}
                                                {selectedType === 'rider-registrations' && <FiUserPlus className="text-green-600" />}
                                                {selectedType === 'shift-deletions' && <FiTrash className="text-red-600" />}
                                                {selectedType === 'admin-registrations' && <FiUser className="text-purple-600" />}
                                                <span className="font-bold">{new Date(log.audit_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                <span className="text-blue-600">·</span>
                                                <span>{log.description || log.audit_type}</span>
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {log.performed_by_admin}
                                                {log.rider_name && <> · {log.rider_name}</>}
                                                {log.zone_name && <> · {log.zone_name}</>}
                                                {log.admin_name && <> · {log.admin_name}</>}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    );
};

export default History;

// Audit Table Component
interface AuditTableProps {
    logs: AuditLog[];
    auditType: string;
    currentPage: number;
    totalPages: number;
    totalCount: number;
    pageSize: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: number) => void;
}

const AuditTable: FC<AuditTableProps> = ({
    logs,
    auditType,
    currentPage,
    totalPages,
    totalCount,
    pageSize,
    onPageChange,
    onPageSizeChange
}) => {
    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'rider-shift-assignments':
                return <FiClock className="text-blue-600" />;
            case 'rider-registrations':
                return <FiUserPlus className="text-green-600" />;
            case 'shift-deletions':
                return <FiTrash className="text-red-600" />;
            case 'admin-registrations':
                return <FiUser className="text-purple-600" />;
            default:
                return <FiFileText className="text-gray-600" />;
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString();
    };

    const renderRowContent = (log: AuditLog) => {
        switch (auditType) {
            case 'rider-shift-assignments':
                return (
                    <>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {log.rider_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {log.zone_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {log.start_date?.split('T')[0]} to {log.end_date?.split('T')[0]}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {log.start_time}-{log.end_time}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs rounded-full ${log.status === 'completed' ? 'bg-green-100 text-green-800' :
                                log.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                    'bg-yellow-100 text-yellow-800'
                                }`}>
                                {log.status}
                            </span>
                        </td>
                    </>
                );

            case 'rider-registrations':
                return (
                    <>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {log.rider_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {log.rider_email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {log.rider_phone}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs rounded-full ${log.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                {log.is_active ? 'Active' : 'Inactive'}
                            </span>
                        </td>
                    </>
                );

            case 'shift-deletions':
                return (
                    <>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {log.rider_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {log.zone_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {log.start_date?.split('T')[0]} to {log.end_date?.split('T')[0]}
                        </td>
                    </>
                );

            case 'admin-registrations':
                return (
                    <>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {log.admin_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {log.admin_email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {log.role_name}
                        </td>
                    </>
                );

            default:
                return (
                    <td className="px-6 py-4 text-sm text-gray-500" colSpan={4}>
                        {log.description}
                    </td>
                );
        }
    };

    const getColumnHeaders = () => {
        switch (auditType) {
            case 'rider-shift-assignments':
                return ['Rider', 'Zone', 'Date Range', 'Time Range', 'Status'];
            case 'rider-registrations':
                return ['Rider Name', 'Email', 'Phone', 'Status'];
            case 'shift-deletions':
                return ['Rider', 'Zone', 'Date Range'];
            case 'admin-registrations':
                return ['Admin Name', 'Email', 'Role'];
            default:
                return ['Details'];
        }
    };

    return (
        <div className="bg-white">
            {/* Table */}
            <div className="overflow-auto shadow ring-1 ring-black ring-opacity-5">
                <table className="min-w-full divide-y divide-gray-300">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Type & Date
                            </th>
                            {getColumnHeaders().map((header, index) => (
                                <th
                                    key={index}
                                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                >
                                    {header}
                                </th>
                            ))}
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Performed By
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {logs.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                                    <div className="flex flex-col items-center">
                                        <FiFileText size={48} className="text-gray-300 mb-4" />
                                        <p className="text-lg font-medium">No audit logs found</p>
                                        <p className="text-sm">Try adjusting your filters or date range</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            logs.map((log) => (
                                <tr key={log.audit_id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="mr-3">
                                                {getTypeIcon(auditType)}
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">
                                                    {formatDate(log.audit_date)}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {log.audit_type}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    {renderRowContent(log)}
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {log.performed_by_admin}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {logs.length > 0 && (
                <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-700">Show:</span>
                                <select
                                    value={pageSize}
                                    onChange={(e) => onPageSizeChange(Number(e.target.value))}
                                    className="border border-gray-300 rounded px-2 py-1 text-sm"
                                >
                                    <option value={10}>10</option>
                                    <option value={25}>25</option>
                                    <option value={50}>50</option>
                                    <option value={100}>100</option>
                                </select>
                                <span className="text-sm text-gray-700">per page</span>
                            </div>

                            <div className="text-sm text-gray-700">
                                Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} results
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => onPageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                            >
                                Previous
                            </button>

                            <div className="flex items-center gap-1">
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    const startPage = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
                                    const pageNum = startPage + i;
                                    if (pageNum > totalPages) return null;
                                    return (
                                        <button
                                            key={pageNum}
                                            onClick={() => onPageChange(pageNum)}
                                            className={`px-3 py-1 text-sm rounded ${pageNum === currentPage
                                                ? 'bg-blue-600 text-white'
                                                : 'border border-gray-300 hover:bg-gray-50'
                                                }`
                                            }
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                })}
                            </div>

                            <button
                                onClick={() => onPageChange(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </div>
            )
            }
        </div >
    );
};
