/* eslint-disable @typescript-eslint/ban-ts-comment */
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import { Box, Paper, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, TableSortLabel, Tabs } from "@mui/material";
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import React, { useCallback, useEffect, useState } from "react";
import { Helmet } from 'react-helmet-async';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import { Link } from 'react-router-dom';
import Alert from './Alert';
import ConfirmDialog from './ConfirmDialog';
import Menu from './Menu';
import SmallMenu from './SmallMenu';
import { useSharedValue } from './context/shareValue';

// Updated Data type for today's shifts
interface ShiftData {
    shift_id: string;
    start_date: string;
    end_date: string;
    start_time: string;
    end_time: string;
    status: string;
    rider_id: string;
    rider_name: string;
    rider_email: string;
    rider_phone: string;
    rider_pic: string;
    zone_id: string;
    zone_name: string;
    latitude: number;
    longitude: number;
    assigned_by_admin: string;
}

// Dashboard stats interface
interface DashboardStats {
    totalRiders: number;
    activeRiders: number;
    totalAreas: number;
    shiftsToday: number;
}

const Dashboard = () => {
    // Table column definitions for shifts
    interface Column {
        id: 'rider_name' | 'zone_name' | 'rider_phone' | 'start_time' | 'end_time' | 'status' | 'actions';
        label: string;
        minWidth?: number;
        align?: 'right';
        format?: (value: number) => string;
    }

    const columns: readonly Column[] = [
        { id: 'rider_name', label: 'Rider Name', minWidth: 170 },
        { id: 'zone_name', label: 'Zone Assignment', minWidth: 150 },
        {
            id: 'rider_phone',
            label: 'Phone Number',
            minWidth: 130,
            align: 'right',
        },
        {
            id: 'start_time',
            label: 'Start Time',
            minWidth: 100,
            align: 'right',
        },
        {
            id: 'end_time',
            label: 'End Time',
            minWidth: 100,
            align: 'right',
        },
        {
            id: 'status',
            label: 'Status',
            minWidth: 100,
            align: 'right',
        },
        { id: 'actions', label: 'Actions', minWidth: 170, align: 'right' }
    ];

    // State management
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [orderBy, setOrderBy] = useState<keyof ShiftData>('rider_name');
    const [order, setOrder] = useState<'asc' | 'desc'>('asc');
    const [shifts, setShifts] = useState<ShiftData[]>([]);
    const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
        totalRiders: 0,
        activeRiders: 0,
        totalAreas: 0,
        shiftsToday: 0
    });
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedShiftId, setSelectedShiftId] = useState<string>('');
    const [width, setWidth] = useState(window.innerWidth);

    // NEW: Tab and fullscreen state
    const [activeTab, setActiveTab] = useState(0); // 0 = Map View, 1 = Table View
    const [isFullscreen, setIsFullscreen] = useState(false);

    const [pendingCancelShiftId, setPendingCancelShiftId] = useState<string | null>(null);

    // NEW: Alert state
    const [alert, setAlert] = useState<{ message: string; type?: 'success' | 'error' | 'info' } | null>(null);

    // Handlers
    const handleChangePage = (_event: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(+event.target.value);
        setPage(0);
    };

    const handleSort = (property: keyof ShiftData) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
    };

    const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
        setActiveTab(newValue);
    };

    const toggleFullscreen = () => {
        setIsFullscreen(!isFullscreen);
    };

    // Handle escape key for fullscreen exit
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isFullscreen) {
                setIsFullscreen(false);
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isFullscreen]);

    const sortedShifts = shifts.sort((a, b) => {
        const aValue = a[orderBy];
        const bValue = b[orderBy];
        if (aValue < bValue) {
            return order === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
            return order === 'asc' ? 1 : -1;
        }
        return 0;
    });

    // Get logged-in user's first name for greeting
    const { user } = useSharedValue();
    const name = user?.name?.split(" ")[0] || "User";

    // Fetch dashboard statistics
    const fetchDashboardStats = useCallback(async () => {
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/dashboard-stats`, {
                credentials: 'include'
            });

            if (response.status === 401) {
                sessionStorage.removeItem('user');
                window.location.href = '/login';
                return;
            }

            if (response.ok) {
                const stats = await response.json();
                setDashboardStats(stats);
            }
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
        }
    }, []);

    const fetchTodayShifts = useCallback(async () => {
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/shifts/today`, {
                credentials: 'include'
            });

            if (response.status === 401) {
                sessionStorage.removeItem('user');
                window.location.href = '/login';
                return;
            }

            if (!response.ok) {
                throw new Error('Failed to fetch today shifts');
            }

            const data = await response.json();
            console.log('Today shifts data:', data);
            setShifts(data);
        } catch (error) {
            console.error('Error fetching today shifts:', error);
        }
    }, []);

    // Authentication check and initial data fetch
    useEffect(() => {
        if (!user) {
            window.location.href = '/login';
            return;
        }

        document.title = 'Dashboard-Rider Management System';
        fetchDashboardStats();
        fetchTodayShifts();
    }, [user, fetchDashboardStats, fetchTodayShifts]);

    // Handle window resize
    useEffect(() => {
        const handleResize = () => {
            setWidth(window.innerWidth);
        };

        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    // Open edit modal
    const handleClickEdit = (shiftId: string) => {
        setSelectedShiftId(shiftId);
        setShowEditModal(true);
    };

    // Delete shift functionality
    const handleDeleteShift = async (shiftId: string) => {
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/shift/${shiftId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    reason: 'Cancelled from dashboard'
                }),
            });

            if (response.status === 401) {
                sessionStorage.removeItem('user');
                window.location.href = '/login';
                return;
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to cancel shift');
            }

            const result = await response.json();
            setShifts(prev => prev.map(shift =>
                shift.shift_id === shiftId
                    ? { ...shift, status: 'cancelled' }
                    : shift
            ));

            fetchDashboardStats();
            setAlert({ message: result.message || 'Shift cancelled successfully', type: 'success' });

        } catch (error) {
            console.error('Cancel failed:', error);
            setAlert({ message: `Failed to cancel shift: ${error instanceof Error ? error.message : 'Unknown error'}`, type: 'error' });
        } finally {
            setPendingCancelShiftId(null);
        }
    };

    // Add a retry handler for dashboard
    const fetchProfileAndShifts = () => {
        fetchDashboardStats();
        fetchTodayShifts();
        setAlert(null);
    };

    // Error alert UI
    if (alert && alert.type === 'error') {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="text-red-600 font-bold mb-2">Error</div>
                    <div className="mb-4">{alert.message}</div>
                    <div className='flex gap-4'>
                        <button
                            className="px-4 py-2 bg-blue-600 text-white rounded"
                            onClick={fetchProfileAndShifts}
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

    // Fullscreen layout
    if (isFullscreen) {
        return (
            <div className="fixed inset-0 z-50 bg-white">
                <Helmet>
                    <title>Dashboard - Rider Management System</title>
                    <meta name="description" content="Fullscreen view of today's shifts in the Rider Management System" />
                </Helmet>
                {/* Fullscreen Header */}
                <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-center">
                    <h1 className="text-xl font-semibold text-gray-800 bg-white px-4 py-2 rounded-lg shadow-md">
                        {`Hello ${name}-Today's Shifts`}
                    </h1>
                    <button
                        onClick={toggleFullscreen}
                        className="bg-white hover:bg-gray-100 p-3 rounded-lg shadow-md transition-colors"
                        title="Exit Fullscreen"
                    >
                        <FullscreenExitIcon className="w-6 h-6" />
                    </button>
                </div>

                {/* Fullscreen Map */}
                <MapContainer
                    //@ts-expect-error
                    center={[5.6037, -0.1870]}
                    zoom={12}
                    scrollWheelZoom={true}
                    style={{ width: '100%', height: '100%' }}
                    className='z-0'
                >
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        //@ts-expect-error
                        attribution='&copy; OpenStreetMap contributors'
                    />
                    {shifts.map(shift => (
                        shift.latitude && shift.longitude ? (
                            <Marker
                                key={shift.shift_id}
                                position={[shift.latitude, shift.longitude]}
                                //@ts-expect-error
                                // Use rider's picture or a default avatar works
                                icon={L.icon({
                                    iconUrl: shift.rider_pic || 'default-avatar.png',
                                    iconSize: [50, 50],
                                    iconAnchor: [25, 50],
                                    className: 'rounded-full border-2 border-white shadow-lg'
                                })}
                            >
                                <Popup>
                                    <div className="text-sm">
                                        <strong>{shift.rider_name}</strong><br />
                                        Zone: {shift.zone_name}<br />
                                        Time: {shift.start_time}-{shift.end_time}<br />
                                        Status: <span className={`capitalize font-medium ${shift.status === 'assigned' ? 'text-green-600' :
                                            shift.status === 'active' ? 'text-blue-600' :
                                                shift.status === 'completed' ? 'text-purple-600' :
                                                    shift.status === 'cancelled' ? 'text-red-600' :
                                                        'text-orange-600'
                                            }`}>
                                            {shift.status}
                                        </span>
                                    </div>
                                </Popup>
                            </Marker>
                        ) : null
                    ))}
                </MapContainer>
            </div>
        );
    }

    // Normal layout
    return (
        <div className="flex h-screen overflow-hidden">
            {width > 968 ? <Menu /> : <SmallMenu />}
            <Box className="relative flex-1 flex flex-col items-center mx-3 mt-2 h-screen overflow-hidden">
                {/* Header */}
                <h1 className="text-xl font-semibold pl-16 pb-3 mr-auto">{`Hello ${name}`}</h1>

                {/* Dashboard Stats Cards */}
                {width > 600 ? (
                    // Desktop: your original cards
                    <div className="p-4 m-1 w-9/10 rounded-[25px] shadow-md bg-white h-34 flex flex-row gap-4 justify-evenly items-center">
                        {/* Riders Card */}
                        <div className="flex items-center flex-1">
                            <img src="human.png" alt="Riders" />
                            <div className='group relative'>
                                <p className="text-sm text-gray-600">Riders</p>
                                <p className="text-lg font-medium">{dashboardStats.totalRiders}</p>
                                <div className="absolute left-0 top-full mt-1 w-max bg-gray-800 text-white text-xs rounded px-3 py-2 shadow-lg opacity-0 group-hover:opacity-100 transition z-20">
                                    Total Riders: {dashboardStats.totalRiders}<br />
                                    Active Today: {dashboardStats.activeRiders}
                                </div>
                            </div>
                        </div>
                        {/* Areas Card */}
                        <div className="border-t border-b border-gray-300 flex items-center flex-1 sm:border-x sm:border-t-0 sm:border-b-0">
                            <img src="loca.png" alt="Area" />
                            <div className='group relative'>
                                <p className="text-sm text-gray-600">Area Coverage</p>
                                <p className="text-lg font-medium">{dashboardStats.totalAreas}</p>
                                <div className="absolute left-0 top-full mt-1 w-max bg-gray-800 text-white text-xs rounded px-3 py-2 shadow-lg opacity-0 group-hover:opacity-100 transition z-20">
                                    Areas with shifts today: {dashboardStats.totalAreas}
                                </div>
                            </div>
                        </div>
                        {/* Shifts Card */}
                        <div className="flex items-center flex-1">
                            <img src="active.png" alt="Shifts" />
                            <div className='group relative'>
                                <p className="text-sm text-gray-600">Shifts Today</p>
                                <p className="text-lg font-medium">{dashboardStats.shiftsToday}</p>
                                <div className="absolute left-0 top-full mt-1 w-max bg-gray-800 text-white text-xs rounded px-3 py-2 shadow-lg opacity-0 group-hover:opacity-100 transition z-20">
                                    Total shifts scheduled for today: {dashboardStats.shiftsToday}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    // Mobile: compact row, always visible
                    <div className="w-full max-w-2xl mx-auto my-2 flex rounded-xl shadow bg-white justify-between py-2 px-2 gap-2">
                        <div className="flex flex-col items-center flex-1 min-w-0">
                            <img src="human.png" alt="Riders" className="w-7 h-7" />
                            <span className="text-xs">Riders</span>
                            <span className="font-bold text-base">{dashboardStats.totalRiders}</span>
                        </div>
                        <div className="flex flex-col items-center flex-1 min-w-0">
                            <img src="loca.png" alt="Area" className="w-7 h-7" />
                            <span className="text-xs">Areas</span>
                            <span className="font-bold text-base">{dashboardStats.totalAreas}</span>
                        </div>
                        <div className="flex flex-col items-center flex-1 min-w-0">
                            <img src="active.png" alt="Shifts" className="w-7 h-7" />
                            <span className="text-xs">Shifts</span>
                            <span className="font-bold text-base">{dashboardStats.shiftsToday}</span>
                        </div>
                    </div>
                )}

                {/* Tab Navigation */}
                <div className="w-9/10 bg-white rounded-t-lg shadow-sm mt-4">
                    <Tabs
                        value={activeTab}
                        onChange={handleTabChange}
                        variant="fullWidth"
                        sx={{
                            '& .MuiTab-root': {
                                textTransform: 'none',
                                fontWeight: 500,
                                fontSize: '0.95rem',
                                color: '#6b7280',
                                '&.Mui-selected': {
                                    color: '#1680E4',
                                }
                            },
                            '& .MuiTabs-indicator': {
                                backgroundColor: '#1680E4',
                                height: 3,
                            }
                        }}
                    >
                        <Tab label="Map View" />
                        <Tab label="Table View" />
                    </Tabs>
                </div>

                {/* Content Area */}
                <div className="w-9/10 flex-1 bg-white rounded-b-lg shadow-sm overflow-hidden">
                    {activeTab === 0 ? (
                        // Map View
                        <div className="relative h-full">
                            {/* Fullscreen Toggle Button */}
                            <button
                                onClick={toggleFullscreen}
                                className="absolute top-4 right-4 z-10 bg-white hover:bg-gray-100 p-2 rounded-lg shadow-md transition-colors"
                                title="Enter Fullscreen"
                            >
                                <FullscreenIcon className="w-5 h-5" />
                            </button>

                            {/* Map Container */}
                            <MapContainer
                                //@ts-expect-error
                                center={[5.6037, -0.1870]}
                                zoom={12}
                                scrollWheelZoom={true}
                                style={{ width: '100%', height: '100%' }}
                                className='z-0'
                            >
                                <TileLayer
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    //@ts-expect-error
                                    attribution='&copy; OpenStreetMap contributors'
                                />
                                {shifts.map(shift => (
                                    shift.latitude && shift.longitude ? (
                                        <Marker
                                            key={shift.shift_id}
                                            position={[shift.latitude, shift.longitude]}
                                            //@ts-expect-error
                                            icon={L.icon({
                                                iconUrl: shift.rider_pic || 'default-avatar.png',
                                                iconSize: [40, 40],
                                                iconAnchor: [20, 40],
                                                className: 'rounded-full border border-white shadow-md'
                                            })}
                                        >
                                            <Popup>
                                                <div className="text-sm">
                                                    <strong>{shift.rider_name}</strong><br />
                                                    Zone: {shift.zone_name}<br />
                                                    Time: {shift.start_time}-{shift.end_time}<br />
                                                    Status: <span className={`capitalize font-medium ${shift.status === 'assigned' ? 'text-green-600' :
                                                        shift.status === 'active' ? 'text-blue-600' :
                                                            shift.status === 'completed' ? 'text-purple-600' :
                                                                shift.status === 'cancelled' ? 'text-red-600' :
                                                                    'text-orange-600'
                                                        }`}>
                                                        {shift.status}
                                                    </span>
                                                </div>
                                            </Popup>
                                        </Marker>
                                    ) : null
                                ))}
                            </MapContainer>
                        </div>
                    ) : (
                        width > 600 ? (
                            // Table View for desktop
                            <Paper sx={{ width: '100%', height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                                <div className="flex items-center justify-between p-4 border-b">
                                    <h2 className="text-lg font-semibold">Today's Shift Assignments</h2>
                                    <span className="text-sm text-gray-500">{shifts.length} shifts</span>
                                </div>

                                <TableContainer sx={{ flexGrow: 1, overflow: 'auto' }}>
                                    <Table stickyHeader aria-label="shifts table">
                                        <TableHead>
                                            <TableRow>
                                                {columns.map((column) => (
                                                    <TableCell
                                                        key={column.id}
                                                        align={column.align}
                                                        style={{ minWidth: column.minWidth }}
                                                    >
                                                        {column.id !== 'actions' ? (
                                                            <TableSortLabel
                                                                active={orderBy === column.id}
                                                                direction={orderBy === column.id ? order : 'asc'}
                                                                onClick={() => handleSort(column.id as keyof ShiftData)}
                                                            >
                                                                {column.label}
                                                            </TableSortLabel>
                                                        ) : (
                                                            column.label
                                                        )}
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {sortedShifts
                                                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                                                .map((shift) => (
                                                    <TableRow hover role="checkbox" tabIndex={-1} key={shift.shift_id}>
                                                        {columns.map((column) => {
                                                            if (column.id === 'actions') {
                                                                return (
                                                                    <TableCell key={column.id} align={column.align}>
                                                                        <div className="flex gap-2">
                                                                            <button
                                                                                type='button'
                                                                                className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs transition-colors disabled:opacity-50"
                                                                                onClick={() => handleClickEdit(shift.shift_id)}
                                                                                disabled={shift.status === 'cancelled'}
                                                                            >
                                                                                Edit
                                                                            </button>
                                                                            {shift.status !== 'cancelled' ? (
                                                                                <button
                                                                                    type='button'
                                                                                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs transition-colors"
                                                                                    onClick={() => setPendingCancelShiftId(shift.shift_id)}
                                                                                >
                                                                                    Cancel
                                                                                </button>
                                                                            ) : (
                                                                                <span className="text-gray-400 px-3 py-1 text-xs">
                                                                                    Cancelled
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </TableCell>
                                                                );
                                                            }
                                                            const value = shift[column.id as keyof ShiftData];
                                                            return (
                                                                <TableCell key={column.id} align={column.align}>
                                                                    {column.id === 'status' ? (
                                                                        <span className={`capitalize px-2 py-1 rounded text-xs font-medium ${value === 'assigned' ? 'bg-green-100 text-green-800' :
                                                                            value === 'active' ? 'bg-blue-100 text-blue-800' :
                                                                                value === 'completed' ? 'bg-purple-100 text-purple-800' :
                                                                                    value === 'cancelled' ? 'bg-red-100 text-red-800' :
                                                                                        'bg-gray-100 text-gray-800'
                                                                            }`}>
                                                                            {value}
                                                                        </span>
                                                                    ) : (
                                                                        <span className={shift.status === 'cancelled' ? 'text-gray-400 line-through' : ''}>
                                                                            {value}
                                                                        </span>
                                                                    )}
                                                                </TableCell>
                                                            );
                                                        })}
                                                    </TableRow>
                                                ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>

                                <TablePagination
                                    rowsPerPageOptions={[10, 25, 50]}
                                    component="div"
                                    count={shifts.length}
                                    rowsPerPage={rowsPerPage}
                                    page={page}
                                    onPageChange={handleChangePage}
                                    onRowsPerPageChange={handleChangeRowsPerPage}
                                    sx={{ borderTop: 1, borderColor: 'divider' }}
                                />
                            </Paper>
                        ) : (
                            // Card View for mobile
                            <div className="px-2 py-2 space-y-3 h-full overflow-auto">
                                {sortedShifts.length === 0 ? (
                                    <div className="text-center text-gray-500 mt-10">
                                        <p>No shifts assigned today</p>
                                    </div>
                                ) : (
                                    sortedShifts
                                        .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                                        .map((shift) => (
                                            <div key={shift.shift_id} className="bg-white rounded-xl shadow p-4 flex flex-col gap-2">
                                                <div className="flex items-center gap-2">
                                                    <img
                                                        src={shift.rider_pic || 'default-avatar.png'}
                                                        alt={shift.rider_name}
                                                        className="w-10 h-10 rounded-full border border-gray-300"
                                                    />
                                                    <div>
                                                        <div className="font-bold text-gray-800">{shift.rider_name}</div>
                                                        <div className="text-xs text-gray-500">{shift.rider_phone}</div>
                                                    </div>
                                                    <span className={`ml-auto capitalize px-2 py-1 rounded text-xs font-medium ${shift.status === 'assigned' ? 'bg-green-100 text-green-800' :
                                                        shift.status === 'active' ? 'bg-blue-100 text-blue-800' :
                                                            shift.status === 'completed' ? 'bg-purple-100 text-purple-800' :
                                                                shift.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                                                    'bg-gray-100 text-gray-800'
                                                        }`}>
                                                        {shift.status}
                                                    </span>
                                                </div>
                                                <div className="text-sm text-gray-700">
                                                    <strong>Zone:</strong> {shift.zone_name}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    <strong>Time:</strong> {shift.start_time} - {shift.end_time}
                                                </div>
                                                <div className="flex gap-2 mt-2">
                                                    <button
                                                        type='button'
                                                        className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs transition-colors disabled:opacity-50"
                                                        onClick={() => handleClickEdit(shift.shift_id)}
                                                        disabled={shift.status === 'cancelled'}
                                                    >
                                                        Edit
                                                    </button>
                                                    {shift.status !== 'cancelled' ? (
                                                        <button
                                                            type='button'
                                                            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs transition-colors"
                                                            onClick={() => {
                                                                setPendingCancelShiftId(shift.shift_id);

                                                            }}
                                                        >
                                                            Cancel
                                                        </button>
                                                    ) : (
                                                        <span className="text-gray-400 px-3 py-1 text-xs">
                                                            Cancelled
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                )}
                                {/* Pagination for mobile */}
                                {sortedShifts.length > 0 && (
                                    <div className="flex justify-between items-center mt-4">
                                        <button
                                            onClick={() => setPage(page - 1)}
                                            disabled={page === 0}
                                            className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                                        >
                                            Previous
                                        </button>
                                        <span className="text-sm text-gray-700">
                                            Page {page + 1} of {Math.ceil(sortedShifts.length / rowsPerPage)}
                                        </span>
                                        <button
                                            onClick={() => setPage(page + 1)}
                                            disabled={page + 1 >= Math.ceil(sortedShifts.length / rowsPerPage)}
                                            className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                                        >
                                            Next
                                        </button>
                                    </div>
                                )}
                            </div>
                        )
                    )}
                </div>

                {/* Edit Modal */}
                <EditShiftModal
                    shiftId={selectedShiftId}
                    showEditModal={showEditModal}
                    fetchTodayShifts={fetchTodayShifts}
                    shifts={shifts}
                    handleClickCancel={() => setShowEditModal(false)}
                />

                {/* Confirm Dialog for shift cancellation */}
                <ConfirmDialog
                    isOpen={!!pendingCancelShiftId}
                    title="Cancel Shift"
                    message="Are you sure you want to cancel this shift? This action cannot be undone."
                    confirmText="Cancel Shift"
                    cancelText="Keep Shift"
                    onConfirm={() => pendingCancelShiftId && handleDeleteShift(pendingCancelShiftId)}
                    onCancel={() => setPendingCancelShiftId(null)}
                    type="danger"
                />

                {/* Alert Message */}
                {alert && <Alert message={alert.message} type={alert.type} />}
            </Box>
        </div>
    );
}

export default Dashboard;

// EditShiftModal component remains the same
interface EditShiftModalProps {
    showEditModal: boolean;
    handleClickCancel: () => void;
    shiftId: string;
    shifts: ShiftData[];
    fetchTodayShifts: () => void;
}

const EditShiftModal: React.FC<EditShiftModalProps> = ({
    showEditModal,
    handleClickCancel,
    shifts,
    shiftId,
    fetchTodayShifts
}) => {
    const shift = shifts.find((s) => s.shift_id === shiftId);
    const [startTime, setStartTime] = useState(shift?.start_time || '');
    const [endTime, setEndTime] = useState(shift?.end_time || '');
    const [manualStatus, setManualStatus] = useState<'auto' | 'cancelled'>('auto');

    // Function to determine automatic status based on time
    const determineAutomaticStatus = (startTime: string, endTime: string): string => {
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        const currentTime = now.toTimeString().slice(0, 5);

        const shiftStart = `${today}T${startTime}:00`;
        const shiftEnd = `${today}T${endTime}:00`;
        const currentDateTime = `${today}T${currentTime}:00`;

        if (currentDateTime < shiftStart) {
            return 'upcoming';
        } else if (currentDateTime >= shiftStart && currentDateTime <= shiftEnd) {
            return 'ongoing';
        } else {
            return 'completed';
        }
    };

    const automaticStatus = determineAutomaticStatus(startTime, endTime);
    const finalStatus = manualStatus === 'cancelled' ? 'cancelled' : automaticStatus;

    useEffect(() => {
        if (shift) {
            setStartTime(shift.start_time);
            setEndTime(shift.end_time);
            setManualStatus(shift.status === 'cancelled' ? 'cancelled' : 'auto');
        }
    }, [shift]);

    const handleEdit = async (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        try {
            const requestBody = {
                start_time: startTime,
                end_time: endTime,
                status: finalStatus
            };

            const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/shift/${shiftId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(requestBody)
            });

            if (response.status === 401) {
                sessionStorage.removeItem('user');
                window.location.href = '/login';
                return;
            }

            if (response.ok) {
                const result = await response.json();
                console.log('✅ Update result from server:', result);
                console.log('✅ Status returned from server:', result.status);

                // Refresh the data to get updated status from database
                await fetchTodayShifts();
                handleClickCancel();

                alert('Shift updated successfully');
            } else {
                const errorData = await response.json();
                console.error('❌ Update error:', errorData);
                throw new Error(errorData.error || 'Failed to update shift');
            }
        } catch (error) {
            console.error("💥 Update error:", error);
            alert(`Failed to update shift: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    if (!shift) return null;

    return (
        <div className={`fixed ${showEditModal ? 'flex' : 'hidden'} items-center justify-center h-full z-50 inset-0 bg-[#ffffff74] bg-opacity-50`}>
            <div className='flex flex-col gap-4 p-6 bg-white shadow-lg rounded-lg w-full max-w-md mx-auto'>
                <h3 className="text-lg font-semibold">Edit Shift</h3>

                <input
                    type="text"
                    value={shift.rider_name}
                    placeholder="Rider Name"
                    className="w-full border border-gray-300 px-3 py-2 rounded-md text-sm bg-gray-100"
                    readOnly
                />

                <input
                    type="text"
                    value={shift.zone_name}
                    placeholder="Zone Assignment"
                    className="w-full border border-gray-300 px-3 py-2 rounded-md text-sm bg-gray-100"
                    readOnly
                />

                <div className="flex gap-2">
                    <input
                        type="time"
                        value={startTime}
                        className="w-full border border-gray-300 px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#1680E4]"
                        onChange={(e) => setStartTime(e.target.value)}
                    />
                    <input
                        type="time"
                        value={endTime}
                        className="w-full border border-gray-300 px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#1680E4]"
                        onChange={(e) => setEndTime(e.target.value)}
                    />
                </div>

                {/* Status Section-Similar to Shift Modal */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Status
                    </label>

                    <div className="space-y-2">
                        {/* Show current automatic status */}
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-blue-700">🔄 Status will be automatically determined:</span>
                                <span className={`capitalize px-2 py-1 rounded text-xs font-medium ${automaticStatus === 'upcoming' ? 'bg-blue-100 text-blue-800' :
                                    automaticStatus === 'ongoing' ? 'bg-green-100 text-green-800' :
                                        automaticStatus === 'completed' ? 'bg-purple-100 text-purple-800' :
                                            'bg-gray-100 text-gray-800'
                                    }`}>
                                    {automaticStatus}
                                </span>
                            </div>
                            <p className="text-xs text-blue-600 mt-1">
                                Status updates automatically based on current date/time vs shift schedule.
                            </p>
                        </div>

                        {/* Cancel option */}
                        {manualStatus !== 'cancelled' && (
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={manualStatus === 'cancelled' as typeof manualStatus}
                                    onChange={(e) => setManualStatus(e.target.checked ? 'cancelled' : 'auto')}
                                    className="w-4 h-4 text-red-600 bg-gray-100 border-gray-300 rounded focus:ring-red-500"
                                />
                                <span className="text-sm text-red-600 font-medium">Cancel this shift</span>
                            </label>
                        )}

                        {manualStatus === 'cancelled' && (
                            <div className="p-2 bg-red-50 border border-red-200 rounded">
                                <p className="text-xs text-red-700">
                                    ⚠️ This shift will be marked as cancelled and removed from active assignments.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex gap-2">
                    <button
                        type="button"
                        className="w-full bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 rounded-md text-sm transition"
                        onClick={handleClickCancel}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleEdit}
                        className="w-full bg-[#1680E4] hover:bg-[#126dcc] text-white py-2 rounded-md text-sm transition"
                    >
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
}