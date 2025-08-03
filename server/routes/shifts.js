import express from 'express';
import pool from '../database/dbPool.js';
import { verifyAdmin, verifyToken } from '../middleware/auth.js';

const router = express.Router();
// Update shifts/today (REPLACE existing route)
// REPLACE your GET /shifts/today route with this:
router.get('/shifts/today', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        console.log('🔍 Fetching shifts for today:', today);
        
        const result = await pool.query(`
            SELECT 
                s.id as shift_id,
                s.start_date,
                s.end_date,
                s.start_time,
                s.end_time,
                s.status,
                s.created_at,
                r.id as rider_id,
                r.name as rider_name,
                r.email as rider_email,
                r.phone as rider_phone,
                r.photo_url as rider_pic,
                z.id as zone_id,
                z.name as zone_name,
                z.latitude,
                z.longitude,
                u.name as assigned_by_admin
            FROM shifts s
            JOIN riders r ON s.rider_id = r.id
            JOIN zones z ON s.zone_id = z.id
            JOIN users u ON s.user_id = u.id
            WHERE (
                s.start_date = $1 OR 
                s.end_date = $1 OR 
                (s.start_date <= $1 AND s.end_date >= $1)
            ) AND s.status != 'cancelled'
            ORDER BY s.start_time
        `, [today]);
        
        console.log('📊 Today shifts query result:');
        console.log('📈 Number of shifts found:', result.rows.length);
        
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('❌ Error fetching today shifts:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

// Add shift
// REPLACE your existing POST /shifts route with this:
router.post('/shifts', verifyToken, verifyAdmin, async (req, res) => {
    const { rider_id, zone_id, start_date, end_date, start_time, end_time, status } = req.body;
    
    // Validate input
    if (!rider_id || !zone_id || !start_date || !end_date || !start_time || !end_time) {
        return res.status(400).json({ 
            error: 'rider_id, zone_id, start_date, end_date, start_time, and end_time are required' 
        });
    }
    
    // Validate date range
    if (new Date(end_date) < new Date(start_date)) {
        return res.status(400).json({ 
            error: 'End date cannot be before start date' 
        });
    }
    
    try {
        // Auto-determine status unless manually cancelled
        const finalStatus = status === 'cancelled' ? 'cancelled' : 
                           determineShiftStatus(start_date, end_date, start_time, end_time);
        // Check if rider exists and is active
        const riderCheck = await pool.query('SELECT id, is_active FROM riders WHERE id = $1', [rider_id]);
        if (riderCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Rider not found' });
        }
        if (!riderCheck.rows[0].is_active) {
            return res.status(400).json({ error: 'Cannot assign shifts to inactive rider' });
        }
        
        // Check if zone exists
        const zoneCheck = await pool.query('SELECT id FROM zones WHERE id = $1', [zone_id]);
        if (zoneCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Zone not found' });
        }
        
        // Check for conflicting shifts (overlapping date ranges and times)
        const conflictCheck = await pool.query(`
            SELECT id FROM shifts 
            WHERE rider_id = $1 AND status != 'cancelled'
            AND (
                (start_date <= $2 AND end_date >= $2) OR
                (start_date <= $3 AND end_date >= $3) OR
                (start_date >= $2 AND end_date <= $3)
            )
            AND (
                (start_time <= $4 AND end_time > $4) OR
                (start_time < $5 AND end_time >= $5) OR
                (start_time >= $4 AND end_time <= $5)
            )
        `, [rider_id, start_date, end_date, start_time, end_time]);
        
        if (conflictCheck.rows.length > 0) {
            return res.status(400).json({ 
                error: 'Rider already has a conflicting shift during this period' 
            });
        }
        
        // Insert shift
        const result = await pool.query(`
            INSERT INTO shifts (rider_id, zone_id, start_date, end_date, start_time, end_time, status, user_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `, [rider_id, zone_id, start_date, end_date, start_time, end_time, finalStatus, req.user.id]);
        
        // Return formatted shift with full details
        const fullShift = await pool.query(`
            SELECT 
                s.id as shift_id,
                s.start_date,
                s.end_date,
                s.start_time,
                s.end_time,
                s.status,
                s.created_at,
                r.id as rider_id,
                r.name as rider_name,
                r.email as rider_email,
                r.phone as rider_phone,
                r.photo_url as rider_pic,
                z.id as zone_id,
                z.name as zone_name,
                z.latitude,
                z.longitude,
                u.name as assigned_by_admin
            FROM shifts s
            JOIN riders r ON s.rider_id = r.id
            JOIN zones z ON s.zone_id = z.id
            JOIN users u ON s.user_id = u.id
            WHERE s.id = $1
        `, [result.rows[0].id]);
        
        // Format the response
        const shift = fullShift.rows[0];
        const formattedShift = {
            ...shift,
            start_date: new Date(shift.start_date).toISOString().split('T')[0],
            end_date: new Date(shift.end_date).toISOString().split('T')[0],
            start_time: shift.start_time.toString().slice(0, 5),
            end_time: shift.end_time.toString().slice(0, 5),
            start_datetime: `${new Date(shift.start_date).toISOString().split('T')[0]}T${shift.start_time.toString().slice(0, 5)}:00`,
            end_datetime: `${new Date(shift.end_date).toISOString().split('T')[0]}T${shift.end_time.toString().slice(0, 5)}:00`
        };
        
        res.status(201).json(formattedShift);
    } catch (error) {
        console.error('Error creating shift:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get shifts for specific date
router.get('/shifts/date/:date', verifyToken, verifyAdmin, async (req, res) => {
    const { date } = req.params;
    
    try {
        const result = await pool.query(`
            SELECT 
                s.id as shift_id,
                s.date,
                s.start_time,
                s.end_time,
                s.status,
                r.id as rider_id,
                r.name as rider_name,
                r.phone as rider_phone,
                r.photo_url as rider_pic,
                z.id as zone_id,
                z.name as zone_name,
                z.latitude,
                z.longitude
            FROM shifts s
            JOIN riders r ON s.rider_id = r.id
            JOIN zones z ON s.zone_id = z.id
            WHERE s.date = $1
            ORDER BY s.start_time
        `, [date]);
        
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching shifts for date:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get all shifts with rider and zone details
// Get all shifts with rider and zone details
router.get('/shifts', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                s.id as shift_id,
                s.start_date,
                s.end_date,
                s.start_time,
                s.end_time,
                s.status,
                s.created_at,
                r.id as rider_id,
                r.name as rider_name,
                r.email as rider_email,
                r.phone as rider_phone,
                r.photo_url as rider_pic,
                z.id as zone_id,
                z.name as zone_name,
                z.latitude,
                z.longitude,
                u.name as assigned_by_admin
            FROM shifts s
            JOIN riders r ON s.rider_id = r.id
            JOIN zones z ON s.zone_id = z.id
            JOIN users u ON s.user_id = u.id
            WHERE s.status != 'cancelled'
            ORDER BY s.start_date DESC, s.start_time
        `);
        
        // Format the data properly for FullCalendar
        const formattedShifts = result.rows.map(shift => {
            // Ensure dates are in YYYY-MM-DD format
            const startDate = new Date(shift.start_date).toISOString().split('T')[0];
            const endDate = new Date(shift.end_date).toISOString().split('T')[0];
            
            // Ensure times are in HH:MM format (remove seconds if present)
            const startTime = shift.start_time.toString().slice(0, 5);
            const endTime = shift.end_time.toString().slice(0, 5);
            
            return {
                ...shift,
                start_date: startDate,
                end_date: endDate,
                start_time: startTime,
                end_time: endTime,
                // Add formatted datetime strings for FullCalendar
                start_datetime: `${startDate}T${startTime}:00`,
                end_datetime: `${endDate}T${endTime}:00`
            };
        });
        
        console.log('Formatted shifts sample:', formattedShifts[0]); // Debug log
        res.status(200).json(formattedShifts);
    } catch (error) {
        console.error('Error fetching shifts:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update shift (REPLACE existing PUT route)
router.put('/shift/:id', verifyToken, verifyAdmin, async (req, res) => {
    const { id } = req.params;
    const { rider_id, zone_id, start_date, end_date, start_time, end_time, status } = req.body;
    
    try {
        console.log('PUT /shift/:id - Request body:', req.body);
        console.log('Shift ID:', id);

        // Check if shift exists
        const shiftCheck = await pool.query('SELECT * FROM shifts WHERE id = $1', [id]);
        if (shiftCheck.rows.length === 0) {
            console.log('Shift not found:', id);
            return res.status(404).json({ error: 'Shift not found' });
        }
        
        const currentShift = shiftCheck.rows[0];
        console.log('Current shift:', currentShift);
        
        // Use current values if not provided
        const updateData = {
            rider_id: rider_id || currentShift.rider_id,
            zone_id: zone_id || currentShift.zone_id,
            start_date: start_date || currentShift.start_date,
            end_date: end_date || currentShift.end_date,
            start_time: start_time || currentShift.start_time,
            end_time: end_time || currentShift.end_time,
            status: status || currentShift.status
        };
        
        console.log('Update data:', updateData);
        
        // Auto-determine status unless manually cancelled
        const finalStatus = updateData.status === 'cancelled' ? 'cancelled' : 
                           determineShiftStatus(updateData.start_date, updateData.end_date, updateData.start_time, updateData.end_time);
        
        console.log('Final status calculated:', finalStatus);
        console.log('Request status param:', status);
        console.log('Current shift status:', currentShift.status);
        
        // If cancelling shift, log it in shifts_deletion table
        if (status === 'cancelled' && currentShift.status !== 'cancelled') {
            console.log('Taking cancellation path...');
            
            await pool.query('BEGIN');
            
            try {
                // Log the cancellation in shifts_deletion table
                await pool.query(`
                    INSERT INTO shifts_deletion (shift_id, deleted_by, deleted_at)
                    VALUES ($1, $2, CURRENT_TIMESTAMP)
                `, [id, req.user.id]);
                
                // Update shift status to cancelled
                const result = await pool.query(`
                    UPDATE shifts 
                    SET status = $1
                    WHERE id = $2 
                    RETURNING *
                `, ['cancelled', id]);
                
                await pool.query('COMMIT');
                console.log('Shift cancelled and logged successfully');
                return res.json(result.rows[0]);
                
            } catch (error) {
                await pool.query('ROLLBACK');
                throw error;
            }
        }
        
        console.log('Taking normal update path...');
        console.log('About to update with finalStatus:', finalStatus);
        
        // For other updates (not cancellation)
        const result = await pool.query(`
            UPDATE shifts 
            SET rider_id = $1, zone_id = $2, start_date = $3, end_date = $4, 
                start_time = $5, end_time = $6, status = $7
            WHERE id = $8 
            RETURNING *
        `, [updateData.rider_id, updateData.zone_id, updateData.start_date, updateData.end_date, 
            updateData.start_time, updateData.end_time, finalStatus, id]);
        
        console.log('Database update result:', result.rows[0]);
        console.log('Status in database after update:', result.rows[0].status);
        res.json(result.rows[0]);
        
    } catch (error) {
        console.error('Error updating shift:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

// Add this function to your backend admin.js
const determineShiftStatus = (startDate, endDate, startTime, endTime) => {
    const now = new Date();
    const shiftStart = new Date(`${startDate}T${startTime}`);
    const shiftEnd = new Date(`${endDate}T${endTime}`);
    
    if (now < shiftStart) {
        return 'upcoming';
    } else if (now >= shiftStart && now <= shiftEnd) {
        return 'ongoing';
    } else {
        return 'completed';
    }
};

// Enhanced shift deletion with proper audit logging
router.delete('/shift/:id', verifyToken, verifyAdmin, async (req, res) => {
    const { id } = req.params;
    
    try {
        await pool.query('BEGIN');
        
        // Check if shift exists
        const shiftCheck = await pool.query('SELECT * FROM shifts WHERE id = $1', [id]);
        if (shiftCheck.rows.length === 0) {
            await pool.query('ROLLBACK');
            return res.status(404).json({ error: 'Shift not found' });
        }
        
        // Log the deletion
        await pool.query(`
            INSERT INTO shifts_deletion (shift_id, deleted_by, deleted_at)
            VALUES ($1, $2, CURRENT_TIMESTAMP)
        `, [id, req.user.id]);
        
        // Cancel the shift instead of deleting it
        const result = await pool.query(`
            UPDATE shifts 
            SET status = 'cancelled'
            WHERE id = $1 
            RETURNING *
        `, [id]);
        
        await pool.query('COMMIT');
        
        res.status(200).json({ 
            message: 'Shift cancelled successfully',
            shift: result.rows[0]
        });
    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('Error cancelling shift:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;