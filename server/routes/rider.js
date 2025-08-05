import bcrypt from 'bcrypt';
import crypto from 'crypto';
import express from 'express';
import jwt from 'jsonwebtoken';
import pool from '../database/dbPool.js';
import { sendRiderPasswordUpdateEmail, sendRiderWelcomeEmail } from '../emailService.js';
import { verifyAdmin, verifyRider, verifyToken } from '../middleware/auth.js';
// ==================== RIDER SELF-SERVICE ROUTES ====================
const router = express.Router();
// Get current rider's profile and assigned shifts (protected for riders only)
router.get('/me', verifyToken, verifyRider, async (req, res) => {
    try {
        const riderId = req.user.id;
        // Get rider details
        const riderResult = await pool.query(`
            SELECT id, name, email, phone, photo_url, is_active, created_at
            FROM riders WHERE id = $1
        `, [riderId]);
        if (riderResult.rows.length === 0) {
            return res.status(404).json({ error: 'Rider not found' });
        }
        // Get assigned shifts
        const shiftsResult = await pool.query(`
            SELECT 
                s.id as shift_id,
                s.start_date,
                s.end_date,
                s.start_time,
                s.end_time,
                s.status,
                s.created_at,
                z.name as zone_name,
                u.name as assigned_by_admin
            FROM shifts s
            JOIN zones z ON s.zone_id = z.id
            JOIN users u ON s.user_id = u.id
            WHERE s.rider_id = $1
              AND CURRENT_DATE BETWEEN s.start_date AND s.end_date
            ORDER BY s.start_date DESC, s.start_time DESC
        `, [riderId]);
        const rider = riderResult.rows[0];
        rider.shifts = shiftsResult.rows;
        res.status(200).json(rider);
    } catch (error) {
        console.error('Error fetching rider self profile:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Update current rider's profile (name, photo_url)
router.put('/me', verifyToken, verifyRider, async (req, res) => {
    try {
        const riderId = req.user.id;
        const { name, photo_url } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'Name is required' });
        }
        const result = await pool.query(
            `UPDATE riders SET name = $1, photo_url = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING id, name, email, phone, photo_url, is_active, created_at, updated_at`,
            [name, photo_url, riderId]
        );
        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('Error updating rider self profile:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});



// ==================== RIDER MANAGEMENT ROUTES ====================

// Get all riders with shift statistics (Any admin can view riders)
router.get('/riders', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                r.id,
                r.name,
                r.email,
                r.phone,
                r.photo_url,
                r.is_active,
                r.created_at,
                u.name as registered_by_admin,
                COALESCE(shift_stats.total_shifts, 0)::INTEGER as total_shifts,
                COALESCE(shift_stats.completed_shifts, 0)::INTEGER as completed_shifts,
                COALESCE(shift_stats.active_shifts, 0)::INTEGER as active_shifts,
                COALESCE(shift_stats.upcoming_shifts, 0)::INTEGER as upcoming_shifts
            FROM riders r
            LEFT JOIN users u ON r.user_id = u.id
            LEFT JOIN (
                SELECT 
                    rider_id,
                    COUNT(*)::INTEGER as total_shifts,
                    COUNT(CASE WHEN status = 'completed' THEN 1 END)::INTEGER as completed_shifts,
                    COUNT(CASE WHEN status IN ('ongoing', 'upcoming') AND end_date >= CURRENT_DATE THEN 1 END)::INTEGER as active_shifts,
                    COUNT(CASE WHEN status = 'upcoming' AND start_date > CURRENT_DATE THEN 1 END)::INTEGER as upcoming_shifts
                FROM shifts 
                WHERE status != 'cancelled'
                GROUP BY rider_id
            ) shift_stats ON r.id = shift_stats.rider_id
            ORDER BY r.name
        `);
        
        // Additional safety: ensure all counts are numbers
        const formattedResult = result.rows.map(rider => ({
            ...rider,
            total_shifts: parseInt(rider.total_shifts) || 0,
            completed_shifts: parseInt(rider.completed_shifts) || 0,
            active_shifts: parseInt(rider.active_shifts) || 0,
            upcoming_shifts: parseInt(rider.upcoming_shifts) || 0
        }));
        
        console.log('Sample rider data:', formattedResult[0]); // Debug log
        res.status(200).json(formattedResult);
    } catch (error) {
        console.error('Error fetching riders:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get specific rider by ID with detailed shift history
router.get('/rider/:id', verifyToken, verifyAdmin, async (req, res) => {
    const { id } = req.params;
    
    try {
        // Get rider details
        const riderResult = await pool.query(`
            SELECT 
                r.id,
                r.name,
                r.email,
                r.phone,
                r.photo_url,
                r.is_active,
                r.created_at,
                u.name as registered_by_admin
            FROM riders r
            LEFT JOIN users u ON r.user_id = u.id
            WHERE r.id = $1
        `, [id]);
        
        if (riderResult.rows.length === 0) {
            return res.status(404).json({ error: 'Rider not found' });
        }
        
        // Get rider's shift history
        const shiftsResult = await pool.query(`
            SELECT 
                s.id as shift_id,
                s.start_date,
                s.end_date,
                s.start_time,
                s.end_time,
                s.status,
                s.created_at,
                z.name as zone_name,
                u.name as assigned_by_admin
            FROM shifts s
            JOIN zones z ON s.zone_id = z.id
            JOIN users u ON s.user_id = u.id
            WHERE s.rider_id = $1
            ORDER BY s.start_date DESC, s.start_time DESC
        `, [id]);
        
        const rider = riderResult.rows[0];
        rider.shifts = shiftsResult.rows;
        
        res.status(200).json(rider);
    } catch (error) {
        console.error('Error fetching rider details:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update rider information (Only admins can update riders)
// Add the import at the top:

// Update your PUT /rider/:id route:
router.put('/rider/:id', verifyToken, verifyAdmin, async (req, res) => {
    const { id } = req.params;
    const { name, email, phone, photo_url, is_active, password } = req.body;
    
    // Validate input
    if (!name || !email || !phone) {
        return res.status(400).json({ 
            error: 'Name, email, and phone are required' 
        });
    }
    
    try {
        await pool.query("BEGIN");
        
        // Check if rider exists
        const riderCheck = await pool.query('SELECT id, name, email FROM riders WHERE id = $1', [id]);
        if (riderCheck.rows.length === 0) {
            await pool.query("ROLLBACK");
            return res.status(404).json({ error: 'Rider not found' });
        }
        
        const existingRider = riderCheck.rows[0];
        
        // Check if email is already taken by another rider
        const emailCheck = await pool.query(
            'SELECT id FROM riders WHERE email = $1 AND id != $2',
            [email, id]
        );
        
        if (emailCheck.rows.length > 0) {
            await pool.query("ROLLBACK");
            return res.status(400).json({ error: 'Email already exists for another rider' });
        }
        
        // Prepare update query based on whether password is being updated
        let updateQuery;
        let updateParams;
        
        if (password) {
            // Hash the new password
            const hashedPassword = await bcrypt.hash(password, 10);
            console.log('🔐 Updating rider with new password');
            
            updateQuery = `
                UPDATE riders 
                SET name = $1, email = $2, phone = $3, photo_url = $4, is_active = $5, password = $6, updated_at = CURRENT_TIMESTAMP
                WHERE id = $7 
                RETURNING id, name, email, phone, photo_url, is_active, created_at, updated_at
            `;
            updateParams = [name, email, phone, photo_url, is_active !== undefined ? is_active : true, hashedPassword, id];
        } else {
            // Update without changing password
            console.log('📝 Updating rider without password change');
            
            updateQuery = `
                UPDATE riders 
                SET name = $1, email = $2, phone = $3, photo_url = $4, is_active = $5, updated_at = CURRENT_TIMESTAMP
                WHERE id = $6 
                RETURNING id, name, email, phone, photo_url, is_active, created_at, updated_at
            `;
            updateParams = [name, email, phone, photo_url, is_active !== undefined ? is_active : true, id];
        }
        
        // Execute the update
        const result = await pool.query(updateQuery, updateParams);
        
        await pool.query("COMMIT");
        console.log("✅ Rider updated successfully:", result.rows[0].id);
        
        // Send password update email if password was changed
        let emailResult = { success: true, message: 'No email needed' };
        
        if (password) {
            console.log('📧 Attempting to send password update email...');
            emailResult = await sendRiderPasswordUpdateEmail(name, email, password);
            
            if (emailResult.success) {
                console.log('✅ Rider updated and password update email sent');
            } else {
                console.warn('⚠️ Rider updated but password email failed:', emailResult.error);
            }
        }
        
        // Return updated rider data with email status
        const updatedRiderData = {
            ...result.rows[0],
            password_updated: !!password,
            email_sent: password ? emailResult.success : undefined,
            email_message: password ? emailResult.message : undefined
        };
        
        res.status(200).json(updatedRiderData);
        
    } catch (error) {
        await pool.query("ROLLBACK");
        console.error('Error updating rider:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Deactivate rider (soft delete - Only admins can deactivate riders)
router.delete('/rider/:id', verifyToken, verifyAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query("BEGIN");
        
        // Check if rider exists
        const riderCheck = await pool.query('SELECT id, name FROM riders WHERE id = $1', [id]);
        if (riderCheck.rows.length === 0) {
            await pool.query("ROLLBACK");
            return res.status(404).json({ error: 'Rider not found' });
        }
        
        // Check if rider has active or future shifts
        const activeShiftsCheck = await pool.query(`
            SELECT COUNT(*) FROM shifts 
            WHERE rider_id = $1 
            AND end_date >= CURRENT_DATE 
            AND status NOT IN ('completed', 'cancelled')
        `, [id]);
        
        if (parseInt(activeShiftsCheck.rows[0].count) > 0) {
            await pool.query("ROLLBACK");
            return res.status(400).json({ 
                error: 'Cannot delete rider with active or future shifts. Please cancel or reassign their shifts first.' 
            });
        }
        
        // Soft delete - set is_active to false instead of deleting
        const result = await pool.query(`
            UPDATE riders 
            SET is_active = false, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1 
            RETURNING id, name, email, is_active
        `, [id]);
        
        await pool.query("COMMIT");
        res.status(200).json({ 
            message: `Rider ${result.rows[0].name} has been deactivated successfully`,
            rider: result.rows[0]
        });
    } catch (error) {
        await pool.query("ROLLBACK");
        console.error('Error deleting rider:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Reactivate rider (Only admins can reactivate riders)
router.put('/rider/:id/activate', verifyToken, verifyAdmin, async (req, res) => {
    const { id } = req.params;
    
    try {
        // Check if rider exists
        const riderCheck = await pool.query('SELECT id, name, is_active FROM riders WHERE id = $1', [id]);
        if (riderCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Rider not found' });
        }
        
        if (riderCheck.rows[0].is_active) {
            return res.status(400).json({ error: 'Rider is already active' });
        }
        
        // Reactivate rider
        const result = await pool.query(`
            UPDATE riders 
            SET is_active = true, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1 
            RETURNING id, name, email, is_active
        `, [id]);
        
        res.status(200).json({ 
            message: `Rider ${result.rows[0].name} has been reactivated successfully`,
            rider: result.rows[0]
        });
    } catch (error) {
        console.error('Error reactivating rider:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get riders available for shift assignment (active riders only)
router.get('/riders/available', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, name, email, phone, photo_url
            FROM riders 
            WHERE is_active = true
            ORDER BY name
        `);
        
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching available riders:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

//register a rider and hash password (Only Admins can register riders)
router.post('/registerRider', verifyToken, verifyAdmin, async (req, res) => {
    const { name, email, password, phone } = req.body;
    try {
        await pool.query("BEGIN"); // Start transaction
        
        // Validate input
        if (!name || !email || !password || !phone) {
            await pool.query("ROLLBACK");
            return res.status(400).json({ 
                error: 'All fields are required: name, email, password, phone' 
            });
        }
        
        // Check if email already exists in riders or users
        const riderEmailCheck = await pool.query('SELECT id FROM riders WHERE email = $1', [email]);
        const adminEmailCheck = await pool.query('SELECT id FROM users WHERE email = $1', [email]);

        if (riderEmailCheck.rowCount > 0 || adminEmailCheck.rowCount > 0) {
            await pool.query("ROLLBACK");
            return res.status(400).json({ error: 'Email already exists for another rider or admin!' });
        }

        // Hash password and insert new rider
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await pool.query(
            'INSERT INTO riders (name, email, phone, password, user_id, is_active) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, email, phone, photo_url, is_active, created_at',
            [name, email, phone, hashedPassword, req.user.id, true]
        );

        await pool.query("COMMIT"); // Commit the transaction
        console.log("✅ Rider created successfully:", result.rows[0].id);
        
        // Send welcome email (don't let email failure break the registration)
        console.log('📧 Attempting to send rider welcome email...');
        const emailResult = await sendRiderWelcomeEmail(name, email, password, phone);
        
        // Return rider without password and add admin info + email status
        const riderData = {
            ...result.rows[0],
            total_shifts: 0,
            completed_shifts: 0,
            active_shifts: 0,
            upcoming_shifts: 0,
            registered_by_admin: req.user.name || 'Admin',
            email_sent: emailResult.success,
            email_message: emailResult.message
        };
        
        if (emailResult.success) {
            console.log('✅ Rider created and welcome email sent');
        } else {
            console.warn('⚠️ Rider created but email failed:', emailResult.error);
        }
        
        res.status(201).json(riderData);
    } catch (error) {
        await pool.query("ROLLBACK"); // Rollback on any error
        console.error('Error registering rider:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Rider login route (Public)
router.post('/rlogin', async (req, res) => {
    const { email, password } = req.body;
    console.log('Rider login attempt:', email);

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }
    try {
        // Get rider by email
        const result = await pool.query(
            `SELECT * FROM riders WHERE email = $1`,
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const rider = result.rows[0];

        if (!rider.password) {
            console.error('No password found in database for rider:', rider.email);
            return res.status(500).json({ error: 'Account configuration error' });
        }

        // Compare password
        const isPasswordValid = await bcrypt.compare(password, rider.password);

        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Generate tokens
        const accessToken = jwt.sign(
            {
                id: rider.id,
                email: rider.email,
                role: 'rider',
                type: 'access'
            },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '1h' }
        );

        const refreshToken = jwt.sign(
            {
                id: rider.id,
                email: rider.email,
                role: 'rider',
                type: 'refresh',
                tokenId: crypto.randomUUID()
            },
            process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'your-refresh-secret-key',
            { expiresIn: '7d' }
        );

        // Set HTTP-only cookies
        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'none',
            maxAge: 60 * 60 * 1000, // 1 hour
        });

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'none',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        // Return rider data (without password)
        const { password: _, ...riderWithoutPassword } = rider;
        res.status(200).json({
            user: riderWithoutPassword,
            message: 'Login successful'
        });
    } catch (error) {
        console.error('Error logging in rider:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

export default router;