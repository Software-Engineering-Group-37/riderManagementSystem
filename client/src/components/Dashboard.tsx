import ArrowDropDownCircleIcon from '@mui/icons-material/ArrowDropDownCircle';
import { Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, TableSortLabel } from "@mui/material";
import React, { useEffect } from "react";
import Menu from "./Menu";

interface Data {
    id: number;
    name: string;
    location: string;
    phone: number;
    startTime: string;
    endTime: string;
}

const Dashboard = () => {

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
        phone: number;
        startTime: string;
        endTime: string;
    }

    const [page, setPage] = React.useState(0);
    const [rowsPerPage, setRowsPerPage] = React.useState(10);
    const [orderBy, setOrderBy] = React.useState<keyof Data>('name');
    const [order, setOrder] = React.useState<'asc' | 'desc'>('asc');
    const [onClicked, setOnClicked] = React.useState(false);
    const [rows, setRows] = React.useState<Data[]>([]);
    const [showEditModal, setShowEditModal] = React.useState(false);
    const [id, setId] = React.useState<number>(0);
    const [tableBottom, setTableBottom] = React.useState<number>(-window.innerHeight * 0.60);

    const handleChangePage = (event: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(+event.target.value);
        setPage(0);
    };

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

    const name = JSON.parse(localStorage.getItem('loggedInUser') || '{}').name.split(" ")[0];

    useEffect(() => {
        function createData(
            id: number,
            name: string,
            location: string,
            phone: number,
            startTime: string,
            endTime: string
        ): Data {
            return { id, name, location, phone, startTime, endTime };
        }

        const fetchActiveRiders = async () => {
            const response = await fetch('http://localhost:3000/activeRiders');
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json();
            const riderRows: Data[] = data.map((rider: Data) =>
                createData(
                    rider.id,
                    rider.name,
                    rider.location,
                    rider.phone,
                    rider.startTime,
                    rider.endTime
                )
            );
            setRows(riderRows);

        };
        fetchActiveRiders().catch(error => {
            console.error('Error fetching active riders:', error);
        });

        document.title = 'Dashboard - Rider Management System';
        const table = document.getElementById('floating-table');
        if (!table) return;

        // const pullArrow = document.getElementById('pull-arrow');
        // if (pullArrow) {
        //     pullArrow.addEventListener('click', () => {
        //         setOnClicked(!onClicked);
        //         if (onClicked) {

        //             table.classList.remove('bottom-[10%]');
        //             table.classList.add('-bottom-[68%]');
        //             pullArrow.classList.remove('rotate-0');
        //             pullArrow.classList.add('rotate-180');
        //         } else {
        //             table.classList.add('bottom-[10%]');
        //             table.classList.remove('-bottom-[68%]');
        //             pullArrow.classList.remove('rotate-180');
        //             pullArrow.classList.add('rotate-0');
        //         }
        //     });
        // }
        const pullArrow = document.getElementById('pull-arrow');
        if (pullArrow) {
            pullArrow.addEventListener('click', () => {
                const hiddenPos = -window.innerHeight * 0.60;
                const visiblePos = window.innerHeight * 0.1;
                if (onClicked) {
                    setTableBottom(hiddenPos);
                    pullArrow.classList.remove('rotate-0');
                    pullArrow.classList.add('rotate-180');
                } else {
                    setTableBottom(visiblePos);
                    pullArrow.classList.remove('rotate-180');
                    pullArrow.classList.add('rotate-0');
                }
                setOnClicked(!onClicked);
            });
        }

    }, [onClicked]);

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
        //from use effect get the data and set it to the modal
        const modalInputs = document.querySelectorAll('#modal input');
        if (modalInputs.length > 0) {
            (modalInputs[0] as HTMLInputElement).value = rows[rowIndex].name; // Replace with actual data
            console.log(rows[rowIndex]);
            (modalInputs[1] as HTMLInputElement).value = rows[rowIndex].location; // Replace with actual data
            (modalInputs[2] as HTMLInputElement).value = rows[rowIndex].startTime; // Replace with actual data
            (modalInputs[3] as HTMLInputElement).value = rows[rowIndex].endTime; // Replace with actual data
        }
    }
    console.log(id);

    const handleDelete = async (row: Data) => {
        await fetch(`http://localhost:3000/riders/${row.name}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        setRows(rows.filter(r => r.name !== row.name));
    };

    return (
        <div className="flex h-screen overflow-hidden">
            <Menu />
            <Box className="relative flex-1 flex flex-col justify-center items-center mx-3 mt-1 h-screen">
                <h1 className="text-xl font-semibold mr-auto">{`Hello ${name}`}</h1>
                <div className="p-4 m-1 w-9/10 rounded-[25px] shadow-md flex justify-evenly items-center gap-4 bg-white">
                    <div className="flex items-center flex-1">
                        <img src="human.png" alt="" />
                        <div>
                            <p className="text-sm">Riders</p>
                            <p className="text-lg font-medium">100</p>
                        </div>
                    </div>
                    <div className="border-x-1  border-gray-300 flex items-center flex-1">
                        <img src="loca.png" alt="" />
                        <div>
                            <p className="text-sm">Area Coverage</p>
                            <p className="text-lg font-medium">100</p>
                        </div>
                    </div>
                    <div className="flex items-center flex-1">
                        <img src="active.png" alt="" />
                        <div>
                            <p className="text-sm">Active Riders</p>
                            <p className="text-lg font-medium">10</p>
                        </div>
                    </div>
                </div>
                <iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d254133.5171535812!2d-0.17972945000002716!3d5.591208700000012!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xfdf9084b2b7a773%3A0xbed14ed8650e2dd3!2sAccra!5e0!3m2!1sen!2sgh!4v1752542600242!5m2!1sen!2sgh" height="400" className="border-1 rounded-md m-1 w-9/10" allowFullScreen={false} loading="lazy" referrerPolicy="no-referrer-when-downgrade"></iframe>
                <div id="floating-table" style={{ bottom: `${tableBottom}px` }} className="absolute transition-all duration-1500 ease-in-out z-10 bg-white max-h-[75vh] w-9/10 shadow-lg">
                    <Paper sx={{ width: '100%', overflow: 'hidden', marginTop: 1 }}>
                        <ArrowDropDownCircleIcon id="pull-arrow" className='rotate-180' />
                        <TableContainer sx={{ maxHeight: 400, height: 400, overflow: 'auto' }}>
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
                                                                <button
                                                                    className="bg-blue-500 text-white px-2 py-1 rounded mr-2"
                                                                    onClick={() => handleClickEdit(rowIndex)}
                                                                >
                                                                    Edit
                                                                </button>
                                                                <button
                                                                    className="bg-red-500 text-white px-2 py-1 rounded"
                                                                    onClick={() => handleDelete(row)}
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
                <EditModal id={id} showEditModal={showEditModal} row={rows} handleClickCancel={() => setShowEditModal(false)} />
            </Box>
        </div >
    );
}

export default Dashboard;

interface EditModalProps {
    showEditModal: boolean;
    handleClickCancel: () => void;
    id: number;
    row: Data[];
}

const EditModal: React.FC<EditModalProps> = ({ showEditModal, handleClickCancel, row, id }) => {

    const handleEdit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const rider = row.find((ro) => ro.id === id);
        const form = event.currentTarget;
        const name = (form.elements[0] as HTMLInputElement).value;
        console.log(name);
        const location = (form.elements[1] as HTMLInputElement).value;
        console.log(location);
        const phone = rider?.phone;
        const startTime = (form.elements[2] as HTMLInputElement).value;
        const endTime = (form.elements[3] as HTMLInputElement).value;


        const res = await fetch(`http://localhost:3000/activeRiders/${id}`, {
            method: 'PUT',
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
        if (!res.ok) {
            console.log("Rider not found!");
            return;
        }
    };

    return (
        <div
            id='modal'
            className={`fixed ${showEditModal ? 'flex' : 'hidden'} items-center justify-center w-6/7 h-full z-10 bg-gray-200 opacity-90`}
        >
            <form onSubmit={handleEdit} className=' flex flex-col gap-4 p-6 bg-white shadow-lg rounded-lg w-full max-w-md mx-auto mt-10'>
                <input
                    type="text"
                    placeholder="Rider Name"
                    className="read-only w-full border border-gray-300 px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#5932EA]" readOnly />
                <input
                    type="text"
                    placeholder="Location"
                    className="w-full border border-gray-300 px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#5932EA]"
                />
                <div className="flex gap-2">
                    <input
                        type="text"
                        placeholder="Start Time"
                        className="w-full border border-gray-300 px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#5932EA]"
                    />
                    <input
                        type="text"
                        placeholder="End Time"
                        className="w-full border border-gray-300 px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#5932EA]"
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
                        type="submit"
                        className="w-full bg-[#5932EA] hover:bg-[#4a28c2] text-white py-2 rounded-md text-sm transition mt-4"
                    >
                        Save Changes
                    </button>
                </div>

            </form>
        </div>
    );
}