import { Paper, Table, TableBody, TableCell, TableHead, TablePagination, TableRow, TableSortLabel } from "@mui/material";
import TableContainer from "@mui/material/TableContainer";
import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import Menu from "./Menu";
import SmallMenu from "./SmallMenu";

const History = () => {
    const [width, setWidth] = useState(window.innerWidth);

    // Table column definitions
    interface Column {
        id: 'name' | 'location' | 'phone' | 'startTime' | 'endTime';
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
        }
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

    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [orderBy, setOrderBy] = useState<keyof Data>('name');
    const [order, setOrder] = useState<'asc' | 'desc'>('asc');
    const [rows, setRows] = useState<RiderWithCoords[]>([]);

    // Handle table page change
    const handleChangePage = (_event: unknown, newPage: number) => {
        setPage(newPage);
    };

    // Handle rows per page change
    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(+event.target.value);
        setPage(0);
    };

    // Handle sorting by column
    const handleSort = (property: keyof Data) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
    };

    // Sort rows based on selected column and order
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

    // Export table data to Excel
    const handleExport = () => {
        const exportData = rows.map((row) => {
            const formattedRow: Record<string, unknown> = {};
            columns.forEach((col) => {
                const key = col.id as keyof typeof row;
                formattedRow[col.label] = row[key];
            });
            return formattedRow;
        });

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "History");
        XLSX.writeFile(workbook, "rider-history.xlsx");
    };

    useEffect(() => {
        document.title = "History - Rider Management System";
        const handleResize = () => {
            setWidth(window.innerWidth);
        };
        window.addEventListener("resize", handleResize);

        // Fetch shift history from backend and map to table rows
        const fetchHistory = async () => {
            try {
                const res = await fetch("http://localhost:4000/shifts");
                if (!res.ok) throw new Error("Failed to fetch history");
                const data = await res.json();
                // Map backend fields to table fields
                interface ShiftItem {
                    id: number;
                    riderName: string;
                    location: string;
                    phone?: number;
                    startTime: string;
                    endTime: string;
                }
                const mapped = (data as ShiftItem[]).map((item) => ({
                    id: item.id,
                    name: item.riderName,
                    location: item.location,
                    pic: "",
                    phone: item.phone ?? 0,
                    startTime: item.startTime,
                    endTime: item.endTime,
                }));
                setRows(mapped);
            } catch (error) {
                console.error("Error fetching history:", error);
            }
        };
        fetchHistory();

        return () => {
            window.removeEventListener("resize", handleResize);
        };
    }, [width]);

    return (
        <div className="flex min-h-screen overflow-hidden bg-gray-50">
            {/* Sidebar navigation */}
            {width > 968 ? <Menu /> : <SmallMenu />}

            {/* Main Content */}
            <div className="flex flex-col flex-grow p-6 space-y-4">
                {/* Header Section */}
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-2xl font-bold text-gray-800">History</h1>
                    {/* Export to Excel */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleExport}
                            className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                        >
                            Export
                        </button>
                    </div>
                </div>

                {/* Table Section */}
                <Paper
                    sx={{
                        width: '100%',
                        overflow: 'hidden',
                        borderRadius: '12px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                        flexGrow: 1,
                        display: 'flex',
                        flexDirection: 'column',
                    }}
                >
                    <TableContainer sx={{ flexGrow: 1, maxHeight: '79vh', overflow: 'auto' }}>
                        <Table stickyHeader aria-label="sticky table">
                            <TableHead>
                                <TableRow>
                                    {columns.map((column) => (
                                        <TableCell
                                            key={column.id}
                                            align={column.align}
                                            style={{ minWidth: column.minWidth, fontWeight: 'bold' }}
                                        >
                                            <TableSortLabel
                                                active={orderBy === column.id}
                                                direction={orderBy === column.id ? order : 'asc'}
                                                onClick={() => handleSort(column.id as keyof Data)}
                                            >
                                                {column.label}
                                            </TableSortLabel>
                                        </TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {sortedRows
                                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                                    .map((row) => (
                                        <TableRow hover key={row.id}>
                                            {columns.map((column) => {
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

                    {/* Pagination */}
                    <TablePagination
                        rowsPerPageOptions={[10, 25, 100]}
                        component="div"
                        count={rows.length}
                        rowsPerPage={rowsPerPage}
                        page={page}
                        onPageChange={handleChangePage}
                        onRowsPerPageChange={handleChangeRowsPerPage}
                        sx={{
                            zIndex: 2,
                        }}
                    />
                </Paper>
            </div>
        </div>

    );
}

export default History;
