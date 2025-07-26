import ArrowDropDownCircleIcon from '@mui/icons-material/ArrowDropDownCircle';
import { Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, TableSortLabel } from "@mui/material";
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import React, { useCallback, useEffect, useRef, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import Menu from './Menu';
import SmallMenu from './SmallMenu';

// Data type for rider and table row
interface Data {
    id: number;
    name: string;
    location: string;
    phone: number;
    startTime: string;
    endTime: string;
}

const Dashboard = () => {
    // Table column definitions
    interface Column {
        id: 'name' | 'location' | 'phone' | 'startTime' | 'endTime' | 'actions';
        label: string;
        minWidth?: number;
        align?: 'right';
        format?: (value: number) => string;
    }

    const columns: readonly Column[] = [
        { id: 'name', label: 'RiderName', minWidth: 170 },
        { id: 'location', label: 'Venue', minWidth: 100 },
        {
            id: 'phone',
            label: 'Phone Number',
            minWidth: 130,
            align: 'right',
            format: (value: number) => value.toLocaleString('en-US'),
        },
        {
            id: 'startTime',
            label: 'Start Time',
            minWidth: 100,
            align: 'right',
            format: (value: number) => value.toLocaleString('en-US'),
        },
        {
            id: 'endTime',
            label: 'End Time',
            minWidth: 100,
            align: 'right',
            format: (value: number) => value.toLocaleString('en-US'),
        },
        { id: 'actions', label: 'Actions', minWidth: 170, align: 'right' }
    ];

    interface Data {
        id: number;
        name: string;
        location: string;
        pic: string;
        phone: number;
        startTime: string;
        endTime: string;
    }

    type RiderWithCoords = Data & { lat?: string; lon?: string };

    // State for table, map, and modal
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [orderBy, setOrderBy] = useState<keyof Data>('name');
    const [order, setOrder] = useState<'asc' | 'desc'>('asc');
    const isClicked = useRef(false);
    const [rows, setRows] = useState<RiderWithCoords[]>([]);
    const [showEditModal, setShowEditModal] = useState(false);
    const [id, setId] = useState<number>(0);
    const [tableBottom, setTableBottom] = useState<number>(-window.innerHeight * 0.59);
    const [width, setWidth] = useState(window.innerWidth);

    const handleChangePage = (_event: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(+event.target.value);
        setPage(0);
    };

    // Sort table rows by selected column and order
    const handleSort = (property: keyof Data) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
    };

    const sortedRows = rows.sort((a, b) => {
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
    const name = JSON.parse(localStorage.getItem('loggedInUser') || '{}').name.split(" ")[0];

    // Fetch all active riders and map to table/map data
    const fetchActiveRiders = useCallback(async () => {
        const response = await fetch('http://localhost:4000/activeRiders');
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();
        // Map backend data to Data objects
        const riderRows: RiderWithCoords[] = data.map((rider: RiderWithCoords) => ({
            id: rider.id,
            name: rider.name,
            location: rider.location,
            phone: rider.phone,
            pic: rider?.pic,
            startTime: rider.startTime,
            endTime: rider.endTime,
            lat: rider.lat ? parseFloat(rider.lat) : 0,
            lon: rider.lon ? parseFloat(rider.lon) : 0
        }));
        setRows(riderRows);
    }, []);

    // Update coordinates for riders missing lat/lon
    const updatedActiveRiders = useCallback(async (rows: RiderWithCoords[]) => {
        for (const rider of rows) {
            if (rider.lat && rider.lon) continue;
            const coords = await getCoordinates(rider.location);
            if (!coords) continue;

            const { lat, lon } = coords;
            await fetch(`http://localhost:4000/activeRiders/${rider.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ lat, lon }),
            });
        }
        await new Promise(resolve => setTimeout(resolve, 1500));
    }, []);

    // Update coordinates when rows change
    useEffect(() => {
        updatedActiveRiders(rows).catch(error => {
            console.error('Error fetching active riders:', error);
        });
    }, [rows, updatedActiveRiders])

    // Fetch riders and set up UI event listeners on mount
    useEffect(() => {
        fetchActiveRiders().catch(error => {
            console.error('Error fetching active riders:', error);
        });

        document.title = 'Dashboard - Rider Management System';
        const table = document.getElementById('floating-table');
        if (!table) return;
        const pullArrow = document.getElementById('pull-arrow');
        if (!pullArrow || !table) return;

        // Toggle floating table visibility on arrow click
        const handleClick = () => {
            const hiddenPos = -window.innerHeight * 0.59;
            const visiblePos = window.innerHeight * 0.1;

            if (isClicked.current) {
                setTableBottom(hiddenPos);
                pullArrow.classList.remove('rotate-0');
                pullArrow.classList.add('rotate-180');
            } else {
                setTableBottom(visiblePos);
                pullArrow.classList.remove('rotate-180');
                pullArrow.classList.add('rotate-0');
            }

            isClicked.current = !isClicked.current;
        };

        const handleResize = () => {
            setWidth(window.innerWidth);
            console.log("Resized Width:", window.innerWidth);
        }
        window.addEventListener("resize", handleResize);

        pullArrow.addEventListener('click', handleClick);

        return () => {
            pullArrow.removeEventListener('click', handleClick);
            window.removeEventListener("resize", handleResize);
        };
    }, [fetchActiveRiders]);

    // Open edit modal and prefill fields
    const handleClickEdit = (rowIndex: number) => {
        setId(rows[rowIndex].id);
        setShowEditModal(!showEditModal);

        const modal = document.querySelector('#modal');
        if (modal) {
            if (showEditModal) {
                modal.classList.remove('hidden');
                modal.classList.add('flex');
            }
        }
        const modalInputs = document.querySelectorAll('#modal input');
        if (modalInputs.length > 0) {
            (modalInputs[0] as HTMLInputElement).value = rows[rowIndex].name;
            (modalInputs[1] as HTMLInputElement).value = rows[rowIndex].location;
            (modalInputs[2] as HTMLInputElement).value = rows[rowIndex].startTime;
            (modalInputs[3] as HTMLInputElement).value = rows[rowIndex].endTime;
        }
    }

    // Delete rider and update table
    const handleDelete = async (event: React.MouseEvent<HTMLButtonElement>, row: Data) => {
        event.preventDefault();
        try {
            const res = await fetch(`http://localhost:4000/activeRiders/${row.id}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!res.ok) {
                console.error('Delete failed with status:', res.status);
                return;
            }
            setRows(prev => prev.filter(r => r.id !== row.id));
        } catch (err) {
            console.error('Delete failed with error:', err);
        }
    };

    // Get coordinates for a location using Nominatim API
    const getCoordinates = async (place: string) => {
        try {
            const res = await fetch(
                `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
                    place + ", Accra, Ghana"
                )}&format=json`, {
                headers: {
                    'User-Agent': 'Riders Management System/1.0 (emamonoo@st.ug.edu.gh)'
                }
            });
            if (!res.ok) {
                console.error("Nominatim request failed:", res.status, res.statusText);
            }
            const data = await res.json();
            if (data.length > 0) {
                const lat = parseFloat(data[0].lat);
                const lon = parseFloat(data[0].lon);
                return { lat, lon };
            }
        } catch (error) {
            console.error("Error fetching coordinates:", error);
        }
    };

    return (
        <div className="flex h-screen overflow-hidden">
            {width > 968 ? <Menu /> : <SmallMenu />}
            <Box className="relative flex-1 flex flex-col items-center mx-3 mt-2 h-screen">
                <h1 className="text-xl font-semibold pl-16 pb-3 mr-auto">{`Hello ${name}`}</h1>
                <div className="p-4 m-1 w-9/10 rounded-[25px] shadow-md flex justify-evenly items-center gap-4 bg-white">
                    {/* Rider, Area, and Shift summary cards */}
                    <div className="flex items-center flex-1">
                        <img src="human.png" alt="Riders" />
                        <div className='group relative'>
                            <p className="text-sm">Riders</p>
                            <p className="text-lg font-medium">100</p>
                            <div className="absolute left-0 top-full mt-1 w-max bg-gray-800 text-white text-xs rounded px-3 py-2 shadow-lg opacity-0 group-hover:opacity-100 transition z-20">
                                Total Riders: 100<br />
                                Active Riders: 23
                            </div>
                        </div>
                    </div>
                    <div className="border-x border-gray-300 flex items-center flex-1">
                        <img src="loca.png" alt="Area" />
                        <div className='group relative'>
                            <p className="text-sm">Area Coverage</p>
                            <p className="text-lg font-medium">15</p>
                            <div className="absolute left-0 top-full mt-1 w-max bg-gray-800 text-white text-xs rounded px-3 py-2 shadow-lg opacity-0 group-hover:opacity-100 transition z-20">
                                <p className="font-semibold mb-1">Areas Covered (15)</p>
                                <ul className="list-disc list-inside">
                                    <li>Adabraka</li>
                                    <li>Osu</li>
                                    <li>Madina</li>
                                    <li>East Legon</li>
                                    <li>Dansoman</li>
                                    <li>Circle</li>
                                    <li>Labadi</li>
                                    <li>Achimota</li>
                                    <li>Ashaiman</li>
                                    <li>Teshie</li>
                                    <li>Spintex</li>
                                    <li>Kaneshie</li>
                                    <li>Airport</li>
                                    <li>Sakumono</li>
                                    <li>Ashaley Botwe</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center flex-1">
                        <img src="active.png" alt="Shifts" />
                        <div className='group relative'>
                            <p className="text-sm">Shifts Today</p>
                            <p className="text-lg font-medium">12</p>
                            <div className="absolute left-0 top-full mt-1 w-max bg-gray-800 text-white text-xs rounded px-3 py-2 shadow-lg opacity-0 group-hover:opacity-100 transition z-20">
                                7AM – 11AM : 5 riders<br />
                                11AM – 3PM : 4 riders<br />
                                3PM – 6PM : 3 riders<br />
                                Total Shifts: 12
                            </div>
                        </div>
                    </div>
                </div>

                {/* Map with rider markers */}
                <MapContainer center={[5.6037, -0.1870]} zoom={12} scrollWheelZoom={true} style={{ width: '90%' }} className='border-1 rounded-md m-1 h-5/9 z-0'>
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; OpenStreetMap contributors'
                    />
                    {rows.map(rider => (
                        (typeof rider.lat === 'number' && typeof rider.lon === 'number') ? (
                            <Marker
                                key={rider.id}
                                position={[rider.lat, rider.lon]}
                                icon={L.icon({
                                    iconUrl: rider.pic,
                                    iconSize: [40, 40],
                                    iconAnchor: [20, 40],
                                    className: 'rounded-full border border-white shadow-md object-fit'
                                })}
                            >
                                <Popup>
                                    <div className="text-sm">
                                        <strong>{rider.name}</strong><br />
                                        {rider.location}<br />
                                        {rider.startTime} - {rider.endTime}
                                    </div>
                                </Popup>
                            </Marker>
                        ) : null
                    ))}
                </MapContainer>

                {/* Floating table for active riders */}
                <div id="floating-table" style={{ bottom: `${tableBottom}px` }} className="absolute transition-all duration-1500 ease-in-out z-9 bg-white max-h-[75vh] w-9/10 shadow-lg">
                    <Paper sx={{ width: '100%', overflow: 'hidden', marginTop: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
                        <div className="flex items-center justify-between p-4">
                            <h2 className="text-lg font-semibold">Active Riders</h2>
                            <ArrowDropDownCircleIcon id="pull-arrow" className='rotate-180 ml-auto mr-15' />
                        </div>
                        <TableContainer sx={{ maxHeight: 400, height: 400, overflow: 'auto', animation: 'slideIn 0.5s ease-in-out' }}>
                            <Table stickyHeader aria-label="sticky table">
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
                                                        onClick={() => handleSort(column.id as keyof Data)}
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
                                    {sortedRows
                                        .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                                        .map((row, rowIndex) => (
                                            <TableRow hover role="checkbox" tabIndex={-1} key={row.id}>
                                                {columns.map((column) => {
                                                    if (column.id === 'actions') {
                                                        return (
                                                            <TableCell key={column.id} align={column.align}>
                                                                <button type='submit'
                                                                    className="bg-blue-500 text-white px-2 py-1 rounded mr-2"
                                                                    onClick={() => handleClickEdit(rowIndex)}
                                                                >
                                                                    Edit
                                                                </button>
                                                                <button type='submit'
                                                                    className="bg-red-500 text-white px-2 py-1 rounded"
                                                                    onClick={(e) => handleDelete(e, row)}
                                                                >
                                                                    Delete
                                                                </button>
                                                            </TableCell>
                                                        );
                                                    }
                                                    const value = row[column.id as keyof Data];
                                                    return (
                                                        <TableCell key={column.id} align={column.align}>
                                                            {column.format && typeof value === 'number'
                                                                ? column.format(value)
                                                                : value}
                                                        </TableCell>
                                                    );
                                                })}
                                            </TableRow>
                                        ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                        <TablePagination
                            rowsPerPageOptions={[10, 25, 100]}
                            component="div"
                            count={rows.length}
                            rowsPerPage={rowsPerPage}
                            page={page}
                            onPageChange={handleChangePage}
                            onRowsPerPageChange={handleChangeRowsPerPage}
                            sx={{
                                zIndex: 2
                            }}
                        />
                    </Paper>
                </div>
                {/* Edit modal for rider info */}
                <EditModal id={id} showEditModal={showEditModal} fetchActiveRiders={fetchActiveRiders} row={rows} handleClickCancel={() => setShowEditModal(false)} />
            </Box>
        </div >
    );
}

export default Dashboard;

// Props for EditModal
interface EditModalProps {
    showEditModal: boolean;
    handleClickCancel: () => void;
    id: number;
    row: Data[];
    fetchActiveRiders: () => void;
}

// Modal for editing rider info
const EditModal: React.FC<EditModalProps> = ({ showEditModal, handleClickCancel, row, id, fetchActiveRiders }) => {
    const rider = row.find((ro) => ro.id === id);
    const [location, setLocation] = useState(rider?.location);
    const [startTime, setStartTime] = useState(rider?.startTime);
    const [endTime, setEndTime] = useState(rider?.endTime);
    const name = rider?.name;
    const phone = rider?.phone;

    // PATCH updated rider info to backend and refresh table
    const handleEdit = async (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        try {
            const response = await fetch(`http://localhost:4000/activeRiders/${id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    id,
                    name,
                    location,
                    phone,
                    startTime,
                    endTime
                })
            });
            if (response.ok) {
                fetchActiveRiders();
                handleClickCancel();
            }
            // Log response for debugging
            console.log("Fetch status:", response.status);
            console.log("Content-Type:", response.headers.get("content-type"));
            const text = await response.text();
            console.log("Response body:", text);
        } catch (error) {
            console.error("Fetch error:", error);
        }
    };

    return (
        <div
            id='modal'
            className={`fixed ${showEditModal ? 'flex' : 'hidden'} items-center justify-center h-full z-10`}
        >
            <div className=' flex flex-col gap-4 p-6 bg-white shadow-lg rounded-lg w-full max-w-md mx-auto mt-10'>
                <input
                    type="text"
                    placeholder="Rider Name"
                    className="read-only w-full border border-gray-300 px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#1680E4]" readOnly />
                <input
                    type="text"
                    placeholder="Location"
                    className="w-full border border-gray-300 px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#1680E4]" onChange={(e) => setLocation(e.target.value)} value={location}
                />
                <div className="flex gap-2">
                    <input
                        type="text"
                        placeholder="Start Time"
                        className="w-full border border-gray-300 px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#1680E4]" onChange={(e) => setStartTime(e.target.value)} value={startTime}
                    />
                    <input
                        type="text"
                        placeholder="End Time"
                        className="w-full border border-gray-300 px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#1680E4]" onChange={(e) => setEndTime(e.target.value)} value={endTime}
                    />
                </div>
                <div className="flex gap-2">
                    <button
                        type="button"
                        className="w-full bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 rounded-md text-sm transition mt-4"
                        onClick={handleClickCancel}
                    >
                        Cancel
                    </button>
                    <button
                        type="button" onClick={(e) => handleEdit(e)}
                        className="w-full bg-[#1680E4] hover:bg-[#4a28c2] text-white py-2 rounded-md text-sm transition mt-4"
                    >
                        Save Changes
                    </button>
                </div>

            </div>
        </div>
    );
}