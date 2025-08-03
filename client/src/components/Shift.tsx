import type { EventClickArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import { useCallback, useEffect, useState } from "react";
import Select from 'react-select';
import Alert from "./Alert";
import Menu from "./Menu";
import SmallMenu from "./SmallMenu";
import { useSharedValue } from './context/shareValue';

// Types for our data
interface Rider {
    id: string;
    name: string;
    email: string;
    phone: string;
    photo_url?: string;
}

interface Zone {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
}

interface ShiftData {
    shift_id: string;
    start_date: string;  // Changed from 'date'
    end_date: string;    // Added end_date
    start_time: string;
    end_time: string;
    status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
    rider_id: string;
    rider_name: string;
    zone_id: string;
    zone_name: string;
    latitude: number;
    longitude: number;
}

// Modal for assigning or editing a shift
interface ShiftModalProps {
    isOpen: boolean;
    onClose: () => void;
    date: string;
    onAssign: (
        riderId: string,
        zoneId: string,
        startDate: string,
        endDate: string,
        startTime: string,
        endTime: string,
        status: string,
        id?: string
    ) => void;
    onCancel: (id?: string) => void;
    editingShift?: {
        id?: string;
        riderId?: string;
        riderName?: string;
        zoneId?: string;
        zoneName?: string;
        startDate: string;
        endDate: string;
        startTime: string;
        endTime: string;
        status?: string;
    } | null;
}

// Main Shift management component
interface EditingShiftType {
    id?: string;
    riderId?: string;
    riderName?: string;
    zoneId?: string;
    zoneName?: string;
    startDate: string;
    endDate: string;
    startTime: string;
    endTime: string;
    status?: string;
}

// // Add the function here, before ShiftModal component
// const determineShiftStatus = (startDate: string, endDate: string, startTime: string, endTime: string): string => {
//     if (!startDate || !endDate || !startTime || !endTime) {
//         return 'upcoming'; // default status
//     }

//     const now = new Date();
//     const shiftStart = new Date(`${startDate}T${startTime}`);
//     const shiftEnd = new Date(`${endDate}T${endTime}`);

//     if (now < shiftStart) {
//         return 'upcoming';
//     } else if (now >= shiftStart && now <= shiftEnd) {
//         return 'ongoing';
//     } else {
//         return 'completed';
//     }
// };

const ShiftModal = ({ isOpen, onClose, date, onAssign, editingShift }: ShiftModalProps) => {
    const [selectedRider, setSelectedRider] = useState<{ value: string, label: string } | null>(null);
    const [selectedZone, setSelectedZone] = useState<{ value: string, label: string } | null>(null);
    const [startDate, setStartDate] = useState(editingShift?.startDate || date);
    const [endDate, setEndDate] = useState(editingShift?.endDate || date);
    const [startTime, setStartTime] = useState(editingShift?.startTime || '09:00');
    const [endTime, setEndTime] = useState(editingShift?.endTime || '17:00');
    const [isManuallyToCancelled, setIsManuallyToCancelled] = useState(false);

    const [riders, setRiders] = useState<Rider[]>([]);
    const [zones, setZones] = useState<Zone[]>([]);
    const [submitting, setSubmitting] = useState(false);

    // Calculate automatic status based on dates/times
    const getAutomaticStatus = () => {
        if (!startDate || !endDate || !startTime || !endTime) return 'upcoming';

        const now = new Date();
        const shiftStart = new Date(`${startDate}T${startTime}`);
        const shiftEnd = new Date(`${endDate}T${endTime}`);

        if (now < shiftStart) return 'upcoming';
        if (now >= shiftStart && now <= shiftEnd) return 'ongoing';
        return 'completed';
    };

    const automaticStatus = getAutomaticStatus();
    const finalStatus = isManuallyToCancelled ? 'cancelled' : automaticStatus;

    // Validation
    const isValidDateRange = new Date(endDate) >= new Date(startDate);
    const isValidTimeRange = startDate === endDate ? endTime > startTime : true;
    const isFormValid = selectedRider && selectedZone && startDate && endDate &&
        startTime && endTime && isValidDateRange && isValidTimeRange;

    // Fetch data when modal opens
    const fetchData = useCallback(async () => {
        if (!isOpen) return;

        try {
            const [ridersRes, zonesRes] = await Promise.all([
                fetch(`${import.meta.env.VITE_API_URL}/admin/riders`, { credentials: 'include' }),
                fetch(`${import.meta.env.VITE_API_URL}/admin/zones`, { credentials: 'include' })
            ]);

            if (ridersRes.status === 401 || zonesRes.status === 401) {
                sessionStorage.removeItem('user');
                window.location.href = '/login';
                return;
            }

            if (ridersRes.ok) {
                const ridersData = await ridersRes.json();
                setRiders(ridersData);
            }

            if (zonesRes.ok) {
                const zonesData = await zonesRes.json();
                setZones(zonesData);
            }
        } catch (error) {
            console.error('Failed to fetch data:', error);
        }
    }, [isOpen]);

    // Reset form when modal opens/closes
    useEffect(() => {
        if (isOpen) {
            fetchData();

            if (editingShift) {
                // Editing existing shift
                setSelectedRider(editingShift.riderId ?
                    { value: editingShift.riderId, label: editingShift.riderName || '' } : null
                );
                setSelectedZone(editingShift.zoneId ?
                    { value: editingShift.zoneId, label: editingShift.zoneName || '' } : null
                );
                setStartDate(editingShift.startDate);
                setEndDate(editingShift.endDate);
                setStartTime(editingShift.startTime);
                setEndTime(editingShift.endTime);
                setIsManuallyToCancelled(editingShift.status === 'cancelled');
            } else {
                // Creating new shift
                setSelectedRider(null);
                setSelectedZone(null);
                setStartDate(date);
                setEndDate(date);
                setStartTime('09:00');
                setEndTime('17:00');
                setIsManuallyToCancelled(false);
            }
        }
    }, [isOpen, editingShift, date, fetchData]);

    // Handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!isFormValid) return;

        setSubmitting(true);
        try {
            await onAssign(
                selectedRider!.value,
                selectedZone!.value,
                startDate,
                endDate,
                startTime,
                endTime,
                finalStatus,
                editingShift?.id
            );
            onClose();
        } catch (error) {
            console.error('Error submitting shift:', error);
        } finally {
            setSubmitting(false);
        }
    };

    // // Handle delete
    // const handleDelete = async () => {
    //     if (!editingShift?.id) return;

    //     if (!window.confirm('Are you sure you want to delete this shift? This action cannot be undone.')) {
    //         return;
    //     }

    //     setSubmitting(true);
    //     try {
    //         await onCancel(editingShift.id);
    //         onClose();
    //     } catch (error) {
    //         console.error('Error deleting shift:', error);
    //     } finally {
    //         setSubmitting(false);
    //     }
    // };

    const riderOptions = riders.map(rider => ({
        value: rider.id,
        label: `${rider.name} (${rider.phone})`
    }));

    const zoneOptions = zones.map(zone => ({
        value: zone.id,
        label: zone.name
    }));

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-[#ffffff74] bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
                    <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                        📋 {editingShift ? 'Edit Shift' : 'Create New Shift'}
                    </h3>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                    <form onSubmit={handleSubmit} className="p-6 space-y-6">
                        {/* Current Status (for editing) */}
                        {editingShift && (
                            <div className="bg-gray-50 rounded-lg p-4">
                                <h4 className="font-medium text-gray-800 mb-2">Current Status</h4>
                                <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${editingShift.status === 'upcoming' ? 'bg-blue-100 text-blue-800' :
                                    editingShift.status === 'ongoing' ? 'bg-amber-100 text-amber-800' :
                                        editingShift.status === 'completed' ? 'bg-purple-100 text-purple-800' :
                                            editingShift.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                                'bg-gray-100 text-gray-800'
                                    }`}>
                                    {editingShift.status}
                                </span>
                            </div>
                        )}

                        {/* Rider and Zone Selection */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    👤 Select Rider *
                                </label>
                                <Select
                                    value={selectedRider}
                                    onChange={setSelectedRider}
                                    options={riderOptions}
                                    placeholder="Choose a rider..."
                                    isSearchable
                                    className="text-sm"
                                    styles={{
                                        control: (base) => ({
                                            ...base,
                                            borderColor: selectedRider ? '#10B981' : '#D1D5DB',
                                            boxShadow: 'none',
                                            '&:hover': { borderColor: '#1680E4' },
                                        }),
                                    }}
                                    isDisabled={submitting}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    📍 Select Zone *
                                </label>
                                <Select
                                    value={selectedZone}
                                    onChange={setSelectedZone}
                                    options={zoneOptions}
                                    placeholder="Choose a zone..."
                                    isSearchable
                                    className="text-sm"
                                    styles={{
                                        control: (base) => ({
                                            ...base,
                                            borderColor: selectedZone ? '#10B981' : '#D1D5DB',
                                            boxShadow: 'none',
                                            '&:hover': { borderColor: '#1680E4' },
                                        }),
                                    }}
                                    isDisabled={submitting}
                                />
                            </div>
                        </div>

                        {/* Date Selection */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    📅 Start Date *
                                </label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    disabled={submitting}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    📅 End Date *
                                </label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    min={startDate}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    disabled={submitting}
                                />
                            </div>
                        </div>

                        {/* Time Selection */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    🕐 Start Time *
                                </label>
                                <input
                                    type="time"
                                    value={startTime}
                                    onChange={(e) => setStartTime(e.target.value)}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    disabled={submitting}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    🕐 End Time *
                                </label>
                                <input
                                    type="time"
                                    value={endTime}
                                    onChange={(e) => setEndTime(e.target.value)}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    disabled={submitting}
                                />
                            </div>
                        </div>

                        {/* Validation Messages */}
                        {!isValidDateRange && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                <p className="text-red-700 text-sm">⚠️ End date must be after or equal to start date</p>
                            </div>
                        )}

                        {startDate === endDate && endTime <= startTime && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                <p className="text-red-700 text-sm">⚠️ End time must be after start time for same-day shifts</p>
                            </div>
                        )}

                        {/* Status Information */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <h4 className="font-medium text-blue-800 mb-2">📊 Shift Status</h4>
                            <div className="flex items-center gap-2 mb-3">
                                <span className="text-sm text-blue-700">Automatic Status:</span>
                                <span className={`px-2 py-1 rounded text-xs font-medium ${automaticStatus === 'upcoming' ? 'bg-blue-100 text-blue-800' :
                                    automaticStatus === 'ongoing' ? 'bg-amber-100 text-amber-800' :
                                        automaticStatus === 'completed' ? 'bg-purple-100 text-purple-800' :
                                            'bg-gray-100 text-gray-800'
                                    }`}>
                                    {automaticStatus}
                                </span>
                            </div>

                            {/* Cancel Option for existing shifts */}
                            {editingShift && (
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={isManuallyToCancelled}
                                        onChange={(e) => setIsManuallyToCancelled(e.target.checked)}
                                        className="w-4 h-4 text-red-600 bg-gray-100 border-gray-300 rounded focus:ring-red-500"
                                        disabled={submitting}
                                    />
                                    <span className="text-sm text-red-600 font-medium">Mark as cancelled</span>
                                </label>
                            )}

                            <p className="text-xs text-blue-600 mt-2">
                                Status automatically updates based on current date/time vs shift schedule.
                            </p>
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-200 flex-shrink-0">
                    <div className="flex justify-between items-center">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={submitting}
                            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        >
                            Cancel
                        </button>

                        <div className="flex items-center gap-3">

                            <button
                                onClick={handleSubmit}
                                disabled={!isFormValid || submitting}
                                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                            >
                                {submitting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                                {editingShift ? 'Update Shift' : 'Create Shift'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const Shift = () => {
    const [width, setWidth] = useState(window.innerWidth);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState('');
    const [editingShift, setEditingShift] = useState<EditingShiftType | null>(null);

    // Update the CalendarEvent type to match what you're actually using
    type CalendarEvent = {
        id?: string;
        title: string;
        start: string;
        end: string;
        allDay?: boolean;
        color?: string;
        extendedProps?: {
            status?: string;
            riderId?: string;  // Add these missing properties
            zoneId?: string;   // Add these missing properties
        };
    };

    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [alert, setAlert] = useState<{ message: string; type?: 'success' | 'error' | 'info' } | null>(null);
    // Add this state to force re-render
    const [calendarKey, setCalendarKey] = useState(0);

    const { user } = useSharedValue();


    // Helper to show alert
    const showAlert = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
        setAlert({ message, type });
        setTimeout(() => setAlert(null), 2500);
    };

    // Get status color for calendar events
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'upcoming': return '#8B5CF6';
            case 'ongoing': return '#F59E0B';
            case 'completed': return '#FFFFFF';
            case 'cancelled': return '#EF4444';
            default: return '#1680E4';
        }
    };

    useEffect(() => {
        if (!user) {
            console.log('No user found, redirecting to login');
            window.location.href = '/login';
            return;
        }

        // Fetch all shifts from backend
        const fetchShifts = async () => {
            try {
                console.log('Fetching shifts...');
                const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/shifts`, {
                    credentials: 'include'
                });

                if (response.status === 401) {
                    sessionStorage.removeItem('user');
                    window.location.href = '/login';
                    return;
                }

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: Failed to fetch shifts`);
                }

                const data: ShiftData[] = await response.json();
                console.log('Fetched shifts data:', data);

                // Convert to FullCalendar events - now using pre-formatted datetime strings
                const calendarEvents: CalendarEvent[] = data
                    .filter((shift) => shift.shift_id && shift.rider_name && shift.zone_name)
                    .map((shift) => ({
                        id: shift.shift_id,
                        title: `${shift.rider_name} @${shift.zone_name}`,
                        start: `${shift.start_date}T${shift.start_time}`,
                        end: `${shift.end_date}T${shift.end_time}`,
                        allDay: false,
                        color: getStatusColor(shift.status),
                        extendedProps: {
                            status: shift.status || 'upcoming',
                            riderId: shift.rider_id,
                            zoneId: shift.zone_id,
                            riderName: shift.rider_name,
                            zoneName: shift.zone_name
                        },
                    }));

                console.log('Calendar events:', calendarEvents);
                setEvents(calendarEvents);
                setCalendarKey(prev => prev + 1);

                showAlert(`Loaded ${calendarEvents.length} shifts`, 'success');

            } catch (error) {
                console.error('Failed to fetch shifts:', error);
                showAlert(`Failed to load shifts: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
            }
        };

        fetchShifts();
        document.title = "Shift - Rider Management System";

        const handleResize = () => setWidth(window.innerWidth);
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, [user]);

    interface DateClickInfo {
        dateStr: string;
        jsEvent: MouseEvent;
        view: { type: string };
        dayEl: HTMLElement;
    }

    // Open modal for new shift assignment
    const dateClick = (info: DateClickInfo) => {
        setSelectedDate(info.dateStr);
        setEditingShift(null);
        setModalOpen(true);
    };

    // Update the eventClick function to handle missing data better
    const eventClick = (info: EventClickArg) => {
        console.log('Event clicked:', info.event);

        setEditingShift({
            id: info.event.id || undefined,
            riderId: info.event.extendedProps?.riderId,
            riderName: info.event.extendedProps?.riderName || info.event.title.split(' @ ')[0] || '',
            zoneId: info.event.extendedProps?.zoneId,
            zoneName: info.event.extendedProps?.zoneName || info.event.title.split(' @ ')[1] || '',
            startDate: info.event.startStr?.split('T')[0] || '',
            endDate: info.event.endStr ? info.event.endStr.split('T')[0] : info.event.startStr?.split('T')[0] || '',
            startTime: info.event.startStr?.split('T')[1]?.slice(0, 5) || '',
            endTime: info.event.endStr ? info.event.endStr.split('T')[1]?.slice(0, 5) : '',
            status: info.event.extendedProps?.status || 'upcoming',
        });
        setModalOpen(true);
    };

    // Assign or update a shift
    const handleAssign = async (
        riderId: string,
        zoneId: string,
        startDate: string,
        endDate: string,
        startTime: string,
        endTime: string,
        status: string,
        id?: string
    ) => {
        try {
            const requestData = {
                rider_id: riderId,
                zone_id: zoneId,
                start_date: startDate,  // Changed from 'date'
                end_date: endDate,      // Added end_date
                start_time: startTime,
                end_time: endTime,
                status: status
            };

            let response;
            if (id) {
                // Edit existing shift
                response = await fetch(`${import.meta.env.VITE_API_URL}/admin/shift/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(requestData),
                });
            } else {
                // Create new shift
                response = await fetch(`${import.meta.env.VITE_API_URL}/admin/shifts`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(requestData),
                });
            }

            if (response.status === 401) {
                sessionStorage.removeItem('user');
                window.location.href = '/login';
                return;
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to save shift');
            }

            // Re-fetch shifts to update calendar
            const shiftsResponse = await fetch(`${import.meta.env.VITE_API_URL}/admin/shifts`, {
                credentials: 'include'
            });

            if (shiftsResponse.ok) {
                const data: ShiftData[] = await shiftsResponse.json();
                const calendarEvents: CalendarEvent[] = data
                    .filter((shift) => shift.shift_id && shift.rider_name && shift.zone_name)
                    .map((shift) => ({
                        id: shift.shift_id,
                        title: `${shift.rider_name} @${shift.zone_name}`,
                        start: `${shift.start_date}T${shift.start_time}`,
                        end: `${shift.end_date}T${shift.end_time}`,
                        allDay: false,
                        color: getStatusColor(shift.status),
                        extendedProps: {
                            status: shift.status,
                            riderId: shift.rider_id,
                            zoneId: shift.zone_id
                        },
                    }));
                setEvents(calendarEvents);
                setCalendarKey(prev => prev + 1); // Force re-render
            }

            showAlert(id ? "Shift updated successfully" : "Shift assigned successfully", "success");
        } catch (error: unknown) {
            if (error instanceof Error) {
                showAlert(error.message || "Failed to save shift", "error");
                console.error('Failed to save shift:', error);
            } else {
                showAlert("Failed to save shift", "error");
                console.error('Failed to save shift:', error);
            }
        }

        setModalOpen(false);
        setEditingShift(null);
    };

    // Cancel a shift (change status to cancelled)
    // Update the handleCancel function in your Shift.tsx component
    const handleCancel = async (id?: string) => {
        if (!id) return;

        if (!window.confirm('Are you sure you want to cancel this shift?')) {
            return;
        }

        try {
            console.log('Cancelling shift with ID:', id);

            const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/shift/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ status: 'cancelled' }),
            });

            console.log('Cancel response status:', response.status);

            if (response.status === 401) {
                sessionStorage.removeItem('user');
                window.location.href = '/login';
                return;
            }

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Cancel error data:', errorData);
                throw new Error(errorData.error || 'Failed to cancel shift');
            }

            const updatedShift = await response.json();
            console.log('Updated shift:', updatedShift);

            // Update the local events state with the cancelled status
            setEvents(prev => prev.map(ev =>
                ev.id === id
                    ? {
                        ...ev,
                        color: getStatusColor('cancelled'),
                        extendedProps: {
                            ...ev.extendedProps,
                            status: 'cancelled'
                        }
                    }
                    : ev
            ));

            setModalOpen(false);
            setEditingShift(null);
            showAlert("Shift cancelled successfully", "success");

        } catch (error) {
            console.error('Failed to cancel shift:', error);
            const message = error instanceof Error ? error.message : "Failed to cancel shift";
            showAlert(message, "error");
        }
    };

    // Handle selecting a range on the calendar (for multi-day shift assignment)
    const handleSelect = (info: { startStr: string; endStr: string }) => {
        const startDate = info.startStr.split('T')[0];
        const endDate = info.endStr ?
            new Date(new Date(info.endStr).getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0] : // Subtract 1 day from endStr
            startDate;

        setSelectedDate(startDate);
        setEditingShift({
            startDate: startDate,
            endDate: endDate,
            startTime: info.startStr.split('T')[1]?.slice(0, 5) || '09:00',
            endTime: info.endStr ? info.endStr.split('T')[1]?.slice(0, 5) : '17:00',
            riderName: '',
            zoneName: '',
        });
        setModalOpen(true);
    };



    return (
        <div className="flex h-screen overflow-hidden">
            {alert && <Alert message={alert.message} type={alert.type} />}
            {width > 968 ? <Menu /> : <SmallMenu />}

            <ShiftModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                date={selectedDate}
                onAssign={handleAssign}
                onCancel={handleCancel}
                editingShift={editingShift}
            />

            <div className="flex justify-center w-full">
                <div className='flex flex-col w-full'>
                    <h1 className="text-2xl font-bold text-center mt-2 mr-24">Shift Management</h1>
                    <FullCalendar
                        key={calendarKey} // Add this line
                        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                        initialView="dayGridMonth"
                        timeZone="local" // Add this line
                        headerToolbar={{
                            right: 'today prev,next AssignShift',
                            center: 'title',
                            left: 'dayGridMonth,timeGridWeek,timeGridDay'
                        }}
                        customButtons={{
                            AssignShift: {
                                text: 'Assign Shift',
                                click: () => {
                                    setEditingShift(null);
                                    setSelectedDate(new Date().toISOString().split('T')[0]);
                                    setModalOpen(true);
                                },
                            },
                        }}
                        dateClick={dateClick}
                        eventClick={eventClick}
                        selectable={true}
                        selectMirror={true}  // Shows preview while selecting
                        height="100%"
                        contentHeight="100%"
                        aspectRatio={1.5}
                        events={events}
                        eventStartEditable={false}
                        eventDurationEditable={false}  // Disable drag-to-resize for now
                        eventResizableFromStart={false}
                        select={handleSelect}  // Handle multi-day selection
                        selectConstraint={{  // Only allow future date selection
                            start: new Date().toISOString().split('T')[0]
                        }}
                    />
                </div>
            </div>
        </div>
    );
};

export default Shift;