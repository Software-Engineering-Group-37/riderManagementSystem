import type { EventClickArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import Modal from '@mui/material/Modal';
import { useCallback, useEffect, useState } from "react";
import AsyncSelect from 'react-select/async';
import Alert from "./Alert"; // <-- Import Alert
import Menu from "./Menu";
import SmallMenu from "./SmallMenu";

// Modal for assigning or editing a shift
interface ShiftModalProps {
    isOpen: boolean;
    onClose: () => void;
    date: string;
    onAssign: (
        riderName: string,
        startDate: string,
        endDate: string,
        startTime: string,
        endTime: string,
        location: string,
        id?: string // for editing
    ) => void;
    onDelete: (id?: string) => void;
    editingShift?: {
        id?: string;
        riderName?: string;
        startDate: string;
        endDate: string;
        startTime: string;
        endTime: string;
        location?: string;
    } | null;
}
const ShiftModal = ({ isOpen, onClose, date, onAssign, onDelete, editingShift }: ShiftModalProps) => {
    const [riderName, setRiderName] = useState<string>(editingShift?.riderName || '');
    const [startDate, setStartDate] = useState(editingShift?.startDate || date);
    const [endDate, setEndDate] = useState(editingShift?.endDate || date);
    const [startTime, setStartTime] = useState(editingShift?.startTime || '');
    const [endTime, setEndTime] = useState(editingShift?.endTime || '');
    const [location, setLocation] = useState(editingShift?.location || '');
    const [rider, setRider] = useState<{ id: number; name: string; phone: number }[]>([]);

    // Fetch all riders for the select dropdown
    const fetchActiveRiders = useCallback(async () => {
        try {
            const response = await fetch('http://localhost:4000/riders');
            if (!response.ok) throw new Error('Network response was not ok');
            const data = await response.json();
            setRider(data.map((r: { id: number; name: string; phone: number }) => ({ id: r.id, name: r.name, phone: r.phone })));
        } catch (error) {
            console.error('Failed to fetch riders:', error);
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            fetchActiveRiders().catch(console.error);
            setRiderName(editingShift?.riderName || '');
            setStartDate(editingShift?.startDate || date);
            setEndDate(editingShift?.endDate || date);
            setStartTime(editingShift?.startTime || '');
            setEndTime(editingShift?.endTime || '');
            setLocation(editingShift?.location || '');
        }
    }, [isOpen, fetchActiveRiders, date, editingShift]);

    // Filter rider options for async select
    const filterName = (inputValue: string) =>
        rider.filter(r => r.name.toLowerCase().includes(inputValue.toLowerCase()));

    type OptionType = { label: string; value: string };
    const promiseOptions = (inputValue: string): Promise<OptionType[]> =>
        new Promise(resolve => {
            setTimeout(() => {
                resolve(
                    filterName(inputValue).map(r => ({
                        label: r.name,
                        value: r.name,
                    }))
                );
            }, 300);
        });

    const loadOptions = promiseOptions;

    if (!isOpen) return null;

    return (
        <Modal open={isOpen} onClose={onClose}>
            <div className="fixed inset-0 bg-[#ffffff4a] bg-opacity-30 flex items-center justify-center z-50">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8 space-y-6">
                    <h2 className="text-2xl font-semibold text-gray-800">📋 Assign Rider Shift</h2>

                    {/* Rider select dropdown */}
                    <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Rider</label>
                        <AsyncSelect
                            cacheOptions
                            defaultOptions={rider.map(r => ({ label: r.name, value: r.name }))}
                            loadOptions={loadOptions}
                            onChange={option => setRiderName(option ? option.value : '')}
                            value={riderName ? { label: riderName, value: riderName } : null}
                            placeholder="Select a rider..."
                            styles={{
                                control: (base) => ({
                                    ...base,
                                    borderColor: '#d1d5db',
                                    boxShadow: 'none',
                                    padding: '2px 4px',
                                    '&:hover': { borderColor: '#1680E4' },
                                }),
                            }}
                        />
                    </div>

                    {/* Date inputs */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Start Date</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">End Date</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    {/* Time inputs */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Start Time</label>
                            <input
                                type="time"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">End Time</label>
                            <input
                                type="time"
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    {/* Location input */}
                    <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Location</label>
                        <input
                            type="text"
                            placeholder="e.g. Accra - Zone 3"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Modal action buttons */}
                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition mr-auto"
                        >
                            Cancel
                        </button>
                        {editingShift?.id && (
                            <button
                                onClick={() => onDelete(editingShift.id)}
                                className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition"
                            >
                                Delete
                            </button>
                        )}
                        <button
                            onClick={() => {
                                if (riderName && startDate && endDate && startTime && endTime && location) {
                                    onAssign(riderName, startDate, endDate, startTime, endTime, location, editingShift?.id);
                                    onClose();
                                }
                            }}
                            disabled={!riderName || !startDate || !endDate || !startTime || !endTime || !location}
                            className="px-5 py-2 rounded-lg bg-[#1680E4] text-white hover:bg-[#1268ba] transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Assign
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

// Main Shift management component
// Define EditingShiftType interface
interface EditingShiftType {
    id?: string;
    riderName?: string;
    startDate: string;
    endDate: string;
    startTime: string;
    endTime: string;
    location?: string;
}

const Shift = () => {
    const [width, setWidth] = useState(window.innerWidth);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState('');
    const [editingShift, setEditingShift] = useState<EditingShiftType | null>(null);
    type CalendarEvent = {
        id?: string;
        title: string;
        start: string;
        end: string;
        allDay?: boolean;
        color?: string;
        extendedProps?: {
            location?: string;
        };
    };
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [alert, setAlert] = useState<{ message: string; type?: 'success' | 'error' | 'info' } | null>(null);

    // Helper to show alert for a short time
    const showAlert = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
        setAlert({ message, type });
        setTimeout(() => setAlert(null), 2500);
    };

    useEffect(() => {
        // Fetch all shifts from backend and map to calendar events
        const fetchShifts = async () => {
            try {
                const response = await fetch('http://localhost:4000/shifts');
                if (!response.ok) throw new Error('Network response was not ok');
                const data = await response.json();
                // Convert shifts to FullCalendar events
                type ShiftType = { id?: string; riderName?: string; startDate: string; endDate: string; startTime: string; endTime: string; location?: string };
                const calendarEvents = data.map((shift: ShiftType) => ({
                    id: shift.id,
                    title: `${shift.riderName || 'Assigned'} (${shift.startTime} - ${shift.endTime})${shift.location ? ' @ ' + shift.location : ''}`,
                    start: `${shift.startDate}T${shift.startTime}`,
                    end: `${shift.endDate}T${shift.endTime}`,
                    allDay: false,
                    color: '#1680E4',
                    extendedProps: { location: shift.location || '' },
                }));
                setEvents(calendarEvents);
            } catch (error) {
                console.error('Failed to fetch shifts:', error);
            }
        };
        fetchShifts().catch(console.error);
        document.title = "Shift - Rider Management System";
        const handleResize = () => setWidth(window.innerWidth);
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    interface DateClickInfo {
        dateStr: string;
        jsEvent: MouseEvent;
        view: {
            type: string;
        };
        dayEl: HTMLElement;
    }

    // Open modal for new shift assignment
    const dateClick = (info: DateClickInfo) => {
        setSelectedDate(info.dateStr);
        setEditingShift(null); // Not editing, just creating
        setModalOpen(true);
    };

    // Open modal for editing an existing shift
    const eventClick = (info: EventClickArg) => {
        setEditingShift({
            id: info.event.id,
            riderName: info.event.title.split(' (')[0],
            startDate: info.event.startStr.split('T')[0],
            endDate: info.event.endStr ? info.event.endStr.split('T')[0] : info.event.startStr.split('T')[0],
            startTime: info.event.startStr.split('T')[1]?.slice(0, 5) || '',
            endTime: info.event.endStr ? info.event.endStr.split('T')[1]?.slice(0, 5) : '',
            location: info.event.extendedProps.location || '',
        });
        setModalOpen(true);
    };

    // Open modal for range selection (multi-day/time)
    const handleSelect = (info: { startStr: string; endStr: string }) => {
        setSelectedDate(info.startStr.split('T')[0]);
        setEditingShift({
            startDate: info.startStr.split('T')[0],
            endDate: info.endStr ? info.endStr.split('T')[0] : info.startStr.split('T')[0],
            startTime: info.startStr.split('T')[1]?.slice(0, 5) || '',
            endTime: info.endStr ? info.endStr.split('T')[1]?.slice(0, 5) : '',
            riderName: '',
            location: '',
        });
        setModalOpen(true);
    };

    // Assign or update a shift (create or edit)
    const handleAssign = async (
        riderName: string,
        startDate: string,
        endDate: string,
        startTime: string,
        endTime: string,
        location: string,
        id?: string
    ) => {
        if (id) {
            // Edit existing shift
            try {
                await fetch(`http://localhost:4000/shifts/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ riderName, startDate, endDate, startTime, endTime, location }),
                });
                setEvents(prev => prev.map(ev =>
                    ev.id === id
                        ? {
                            ...ev,
                            title: `${riderName} (${startTime} - ${endTime})${location ? ' @ ' + location : ''}`,
                            start: `${startDate}T${startTime}`,
                            end: `${endDate}T${endTime}`,
                            extendedProps: { location },
                        }
                        : ev
                ));
                showAlert("Shift updated successfully", "success");
            } catch (error) {
                showAlert("Failed to update shift", "error");
                console.error('Failed to update shift:', error);
            }
        } else {
            // Create new shift
            try {
                await fetch('http://localhost:4000/shifts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ riderName, startDate, endDate, startTime, endTime, location }),
                });
                setEvents(prev => [
                    ...prev,
                    {
                        title: `${riderName} (${startTime} - ${endTime})${location ? ' @ ' + location : ''}`,
                        start: `${startDate}T${startTime}`,
                        end: `${endDate}T${endTime}`,
                        allDay: false,
                        color: '#1680E4',
                        extendedProps: { location },
                    }
                ]);
                showAlert("Shift assigned successfully", "success");
            } catch (error) {
                showAlert("Failed to assign shift", "error");
                console.error('Failed to create shift:', error);
            }
        }
        setModalOpen(false);
        setEditingShift(null);
    };

    // Delete a shift assignment
    const handleDelete = async (id?: string) => {
        if (!id) return;
        try {
            await fetch(`http://localhost:4000/shifts/${id}`, {
                method: 'DELETE',
            });
            setEvents(prev => prev.filter(ev => ev.id !== id));
            setModalOpen(false);
            setEditingShift(null);
            showAlert("Shift deleted successfully", "success");
        } catch (error) {
            showAlert("Failed to delete shift", "error");
            console.error('Failed to delete shift:', error);
        }
    };

    return (
        <div className="flex h-screen overflow-hidden">
            {/* Alert at the top */}
            {alert && <Alert message={alert.message} type={alert.type} />}
            {width > 968 ? <Menu /> : <SmallMenu />}
            <ShiftModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                date={selectedDate}
                onAssign={handleAssign}
                onDelete={handleDelete}
                editingShift={editingShift}
            />
            <div className="flex justify-center w-full">
                <div className='flex flex-col w-full'>
                    <h1 className="text-2xl font-bold text-center mt-4">Shift Management</h1>
                    <FullCalendar
                        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                        initialView="dayGridMonth"
                        headerToolbar={{
                            right: 'today prev,next AssignShift',
                            center: 'title',
                            left: 'dayGridMonth,timeGridWeek,timeGridDay'
                        }}
                        customButtons={{
                            AssignShift: {
                                text: 'Assign Shift',
                                click: () => {
                                    setModalOpen(true);
                                },
                            },
                        }}
                        dateClick={dateClick}
                        eventClick={eventClick}
                        select={handleSelect}
                        selectable={true}
                        height="100%"
                        contentHeight="100%"
                        aspectRatio={1.5}
                        events={events}
                        eventStartEditable={false}
                        eventDurationEditable={true}
                        eventResizableFromStart={true}
                    />
                </div>
            </div>
        </div>
    );
};

export default Shift;