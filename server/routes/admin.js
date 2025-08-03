import bcrypt from 'bcrypt';
import crypto from 'crypto';
import express from 'express';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import pool from '../database/dbPool.js';
import { sendAdminPasswordUpdateEmail, sendAdminWelcomeEmail } from '../emailService.js';
import { verifyAdmin, verifySuperAdmin, verifyToken } from '../middleware/auth.js';

const router = express.Router();

//register an admin and hash password (Only superadmin can register new admins)
// Add this import at the top


// Update your registerAdmin route:
router.post('/registerAdmin', verifyToken, verifySuperAdmin, async (req, res) => {
    const { name, email, password, roleName } = req.body;
    
    try {
        await pool.query("BEGIN");
        
        // Validate input
        if (!name || !email || !password || !roleName) {
            await pool.query("ROLLBACK");
            return res.status(400).json({ 
                error: 'All fields are required: name, email, password, roleName' 
            });
        }
        
        // Look up role ID by role name
        const roleResult = await pool.query(
            'SELECT id FROM roles WHERE name = $1',
            [roleName]
        );
        
        if (roleResult.rows.length === 0) {
            await pool.query("ROLLBACK");
            return res.status(400).json({ 
                error: `Role '${roleName}' not found`,
                hint: 'Available roles can be fetched from GET /admin/roles'
            });
        }
        
        const roleId = roleResult.rows[0].id;
        
        // Check if email already exists in users table
        const checkResult = await pool.query(
            'SELECT id FROM users WHERE email = $1',
            [email]
        );

        if (checkResult.rowCount > 0) {
            await pool.query("ROLLBACK");
            return res.status(400).json({ error: 'Email already exists!' });
        }

        // Hash password and insert new admin
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await pool.query(
            'INSERT INTO users (name, email, password, role_id, user_id, is_active) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [name, email, hashedPassword, roleId, req.user.id, true]
        );

        await pool.query("COMMIT");
        console.log("✅ Admin created successfully:", result.rows[0].id);
        
        // Send welcome email (don't let email failure break the registration)
        console.log('📧 Attempting to send welcome email...');
        const emailResult = await sendAdminWelcomeEmail(name, email, password, roleName);
        
        // Return admin data with email status
        const adminWithRole = {
            ...result.rows[0],
            role_name: roleName,
            email_sent: emailResult.success,
            email_message: emailResult.message
        };
        
        if (emailResult.success) {
            console.log('✅ Admin created and welcome email sent');
        } else {
            console.warn('⚠️ Admin created but email failed:', emailResult.error);
        }
        
        res.status(201).json(adminWithRole);
        
    } catch (error) {
        await pool.query("ROLLBACK");
        console.error('❌ Error registering admin:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

//sign in a admin (Public route)
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    console.log('Admin login attempt:', email);
    
    // Validate input
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }
    
    try {
        // Get admin by email from users table where they have a role
        const result = await pool.query(
    `SELECT u.*, r.name as role_name
     FROM users u
     JOIN roles r ON u.role_id = r.id
     WHERE u.email = $1 AND u.role_id IS NOT NULL`,
    [email]
);
        
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const user = result.rows[0];
        
        // Check if
        if (!user.password) {
            console.error('No password found in database for user:', user.email);
            return res.status(500).json({ error: 'Account configuration error' });
        }
        
        // Compare password with hashed password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Generate tokens
        const accessToken = jwt.sign(
            { 
                id: user.id, 
                email: user.email, 
                role: 'admin',
                type: 'access'
            },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '1h' } // 1 hour access token
        );

        const refreshToken = jwt.sign(
            { 
                id: user.id, 
                email: user.email, 
                role: 'admin',
                type: 'refresh',
                tokenId: crypto.randomUUID() // Unique token ID for rotation
            },
            process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'your-refresh-secret-key',
            { expiresIn: '7d' } // 7 day refresh token
        );

        // Set HTTP-only cookies
        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 60 * 60 * 1000 // 1 hour
        });

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        // Return user data (without password and tokens)
        const { password: _, ...userWithoutPassword } = user;
        res.status(200).json({
            user: userWithoutPassword,
            message: 'Login successful'
        });
    } catch (error) {
        console.error('Error logging in admin:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

// Add refresh token route
router.post('/refresh', async (req, res) => {
    try {
        const { refreshToken } = req.cookies;
        
        if (!refreshToken) {
            return res.status(401).json({ error: 'Refresh token not found' });
        }

        // Verify refresh token
        const decoded = jwt.verify(
            refreshToken, 
            process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'your-refresh-secret-key'
        );

        // Check if it's actually a refresh token
        if (decoded.type !== 'refresh') {
            return res.status(401).json({ error: 'Invalid token type' });
        }

        // Verify user still exists and has admin role
        const result = await pool.query(
            'SELECT * FROM users WHERE id = $1 AND role_id IS NOT NULL',
            [decoded.id]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'User not found or no longer admin' });
        }

        const user = result.rows[0];

        // Generate new tokens
        const newAccessToken = jwt.sign(
            { 
                id: user.id, 
                email: user.email, 
                role: 'admin',
                type: 'access'
            },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '1h' }
        );

        const newRefreshToken = jwt.sign(
            { 
                id: user.id, 
                email: user.email, 
                role: 'admin',
                type: 'refresh',
                tokenId: crypto.randomUUID() // New token ID for rotation
            },
            process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'your-refresh-secret-key',
            { expiresIn: '7d' }
        );

        // Set new cookies
        res.cookie('accessToken', newAccessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 60 * 60 * 1000 // 1 hour
        });

        res.cookie('refreshToken', newRefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        res.json({ message: 'Tokens refreshed successfully' });
    } catch (error) {
        console.error('Error refreshing token:', error);
        res.status(401).json({ error: 'Invalid refresh token' });
    }
});

// Add logout route
router.post('/logout', (req, res) => {
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    res.json({ message: 'Logged out successfully' });
});


router.get('/dashboard-stats', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        
        // Total riders count
        const totalRiders = await pool.query('SELECT COUNT(*) FROM riders');
        
        // Riders with shifts active today (excluding cancelled)
        const activeRiders = await pool.query(`
            SELECT COUNT(DISTINCT rider_id) 
            FROM shifts 
            WHERE (
                start_date = $1 OR 
                end_date = $1 OR 
                (start_date <= $1 AND end_date >= $1)
            ) AND status != 'cancelled'
        `, [today]);
        
        // Active zones today (excluding cancelled)
        const activeZones = await pool.query(`
            SELECT COUNT(DISTINCT zone_id) 
            FROM shifts 
            WHERE (
                start_date = $1 OR 
                end_date = $1 OR 
                (start_date <= $1 AND end_date >= $1)
            ) AND status != 'cancelled'
        `, [today]);
        
        // Total shifts active today (excluding cancelled)
        const shiftsToday = await pool.query(`
            SELECT COUNT(*) 
            FROM shifts 
            WHERE (
                start_date = $1 OR 
                end_date = $1 OR 
                (start_date <= $1 AND end_date >= $1)
            ) AND status != 'cancelled'
        `, [today]);
        
        res.json({
            totalRiders: parseInt(totalRiders.rows[0].count),
            activeRiders: parseInt(activeRiders.rows[0].count),
            totalAreas: parseInt(activeZones.rows[0].count),
            shiftsToday: parseInt(shiftsToday.rows[0].count)
        });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Deactivate admin
router.put('/admin/:id/deactivate', verifyToken, verifySuperAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await pool.query(
            'UPDATE users SET is_active = false WHERE id = $1 RETURNING *',
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Admin not found' });
        }
        
        res.json({ message: 'Admin deactivated successfully', admin: result.rows[0] });
    } catch (error) {
        console.error('Error deactivating admin:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Reactivate admin
router.put('/admin/:id/activate', verifyToken, verifySuperAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await pool.query(
            'UPDATE users SET is_active = true WHERE id = $1 RETURNING *',
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Admin not found' });
        }
        
        res.json({ message: 'Admin reactivated successfully', admin: result.rows[0] });
    } catch (error) {
        console.error('Error reactivating admin:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// GET /admins route with this:
router.get('/admins', verifyToken, verifySuperAdmin, async (req, res) => {
    try {
        console.log('🔍 Fetching admins list...');
        
        // Get admin information including is_active status
        const result = await pool.query(`
            SELECT 
                u.id,
                u.name,
                u.email,
                u.created_at,
                u.updated_at,
                u.is_active,
                r.name as role_name,
                creator.name as registered_by_admin
            FROM users u
            JOIN roles r ON u.role_id = r.id
            LEFT JOIN users creator ON u.user_id = creator.id
            WHERE u.role_id IS NOT NULL
            ORDER BY u.created_at DESC
        `);
        
        console.log(`📊 Found ${result.rows.length} admins`);
        
        // Get statistics separately for each admin
        const adminsWithStats = await Promise.all(
            result.rows.map(async (admin) => {
                try {
                    const statsQuery = await pool.query(`
                        SELECT 
                            (SELECT COUNT(*) FROM riders WHERE user_id = $1) as riders_registered,
                            (SELECT COUNT(*) FROM shifts WHERE user_id = $1) as shifts_created
                    `, [admin.id]);
                    
                    return {
                        ...admin,
                        riders_registered: parseInt(statsQuery.rows[0].riders_registered) || 0,
                        shifts_created: parseInt(statsQuery.rows[0].shifts_created) || 0
                    };
                } catch (error) {
                    console.error(`Error fetching stats for admin ${admin.id}:`, error);
                    return {
                        ...admin,
                        riders_registered: 0,
                        shifts_created: 0
                    };
                }
            })
        );
        
        console.log('✅ Admin data with statistics prepared');
        res.status(200).json(adminsWithStats);
        
    } catch (error) {
        console.error('❌ Error fetching admins:', error);
        res.status(500).json({ 
            error: 'Internal server error', 
            details: error.message 
        });
    }
});

// Get specific admin by ID (Only superadmin can view admin details)
router.get('/admin/:id', verifyToken, verifySuperAdmin, async (req, res) => {
    const { id } = req.params;
    
    try {
        const result = await pool.query(`
            SELECT 
                u.id,
                u.name,
                u.email,
                u.created_at,
                u.updated_at,
                r.name as role_name,
                creator.name as registered_by_admin
            FROM users u
            JOIN roles r ON u.role_id = r.id
            LEFT JOIN users creator ON u.user_id = creator.id
            WHERE u.id = $1 AND u.role_id IS NOT NULL
        `, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Admin not found' });
        }
        
        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching admin details:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Add/update the PUT /admin/:id route:
router.put('/admin/:id', verifyToken, verifySuperAdmin, async (req, res) => {
    const { id } = req.params;
    const { name, email, roleName, password } = req.body;
    
    // Validate input
    if (!name || !email || !roleName) {
        return res.status(400).json({ 
            error: 'Name, email, and role name are required' 
        });
    }
    
    try {
        await pool.query("BEGIN");
        
        // Check if admin exists
        const adminCheck = await pool.query('SELECT id, name, email FROM users WHERE id = $1 AND role_id IS NOT NULL', [id]);
        if (adminCheck.rows.length === 0) {
            await pool.query("ROLLBACK");
            return res.status(404).json({ error: 'Admin not found' });
        }
        
        const existingAdmin = adminCheck.rows[0];
        
        // Look up role ID by role name
        const roleResult = await pool.query('SELECT id FROM roles WHERE name = $1', [roleName]);
        if (roleResult.rows.length === 0) {
            await pool.query("ROLLBACK");
            return res.status(400).json({ error: `Role '${roleName}' not found` });
        }
        
        const roleId = roleResult.rows[0].id;
        
        // Check if email is already taken by another admin
        const emailCheck = await pool.query(
            'SELECT id FROM users WHERE email = $1 AND id != $2',
            [email, id]
        );
        
        if (emailCheck.rows.length > 0) {
            await pool.query("ROLLBACK");
            return res.status(400).json({ error: 'Email already exists for another admin' });
        }
        
        // Prepare update query based on whether password is being updated
        let updateQuery;
        let updateParams;
        
        if (password) {
            // Hash the new password
            const hashedPassword = await bcrypt.hash(password, 10);
            console.log('🔐 Updating admin with new password');
            
            updateQuery = `
                UPDATE users 
                SET name = $1, email = $2, role_id = $3, password = $4
                WHERE id = $5 
                RETURNING id, name, email, created_at
            `;
            updateParams = [name, email, roleId, hashedPassword, id];
        } else {
            // Update without changing password
            console.log('📝 Updating admin without password change');
            
            updateQuery = `
                UPDATE users 
                SET name = $1, email = $2, role_id = $3
                WHERE id = $4 
                RETURNING id, name, email, created_at
            `;
            updateParams = [name, email, roleId, id];
        }
        
        // Execute the update
        const result = await pool.query(updateQuery, updateParams);
        
        await pool.query("COMMIT");
        console.log("✅ Admin updated successfully:", result.rows[0].id);
        
        // Send password update email if password was changed
        let emailResult = { success: true, message: 'No email needed' };
        
        if (password) {
            console.log('📧 Attempting to send admin password update email...');
            emailResult = await sendAdminPasswordUpdateEmail(name, email, password, roleName);
            
            if (emailResult.success) {
                console.log('✅ Admin updated and password update email sent');
            } else {
                console.warn('⚠️ Admin updated but password email failed:', emailResult.error);
            }
        }
        
        // Return updated admin data with role name and email status
        const updatedAdminData = {
            ...result.rows[0],
            role_name: roleName,
            password_updated: !!password,
            email_sent: password ? emailResult.success : undefined,
            email_message: password ? emailResult.message : undefined
        };
        
        res.status(200).json(updatedAdminData);
        
    } catch (error) {
        await pool.query("ROLLBACK");
        console.error('Error updating admin:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete admin (Only superadmin can delete admins)
router.delete('/admin/:id', verifyToken, verifySuperAdmin, async (req, res) => {
    const { id } = req.params;
    
    try {
        await pool.query("BEGIN");
        
        // Check if admin exists
        const adminCheck = await pool.query(
            'SELECT id, name FROM users WHERE id = $1 AND role_id IS NOT NULL', 
            [id]
        );
        if (adminCheck.rows.length === 0) {
            await pool.query("ROLLBACK");
            return res.status(404).json({ error: 'Admin not found' });
        }
        
        // Prevent self-deletion
        if (id === req.user.id.toString()) {
            await pool.query("ROLLBACK");
            return res.status(400).json({ 
                error: 'Cannot delete your own admin account' 
            });
        }
        
        // Check if admin has created riders or shifts
        const hasCreatedData = await pool.query(`
            SELECT 
                (SELECT COUNT(*) FROM riders WHERE user_id = $1) as riders_registered,
                (SELECT COUNT(*) FROM shifts WHERE user_id = $1) as shifts_created
        `, [id]);
        
        const { riders_registered, shifts_created } = hasCreatedData.rows[0];
        
        if (parseInt(riders_registered) > 0 || parseInt(shifts_created) > 0) {
            await pool.query("ROLLBACK");
            return res.status(400).json({ 
                error: `Cannot delete admin who has created ${riders_registered} riders and ${shifts_created} shifts. Transfer ownership first.` 
            });
        }
        
        // Delete admin
        const result = await pool.query(
            'DELETE FROM users WHERE id = $1 RETURNING id, name, email', 
            [id]
        );
        
        await pool.query("COMMIT");
        res.status(200).json({ 
            message: `Admin ${result.rows[0].name} has been deleted successfully`,
            admin: result.rows[0]
        });
    } catch (error) {
        await pool.query("ROLLBACK");
        console.error('Error deleting admin:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/auth/forgot-password', async (req, res) => {
    const { email } = req.body;
    try {
        // Find all super admins
        const superAdmins = await pool.query(
            "SELECT email FROM users u JOIN roles r ON u.role_id = r.id WHERE r.name = 'superadmin'"
        );
        const superAdminEmails = superAdmins.rows.map(row => row.email);

        // Send email to all super admins
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            secure: false,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        await transporter.sendMail({
            from: `"Rider Management" <${process.env.SMTP_USER}>`,
            to: superAdminEmails,
            subject: "Password Reset Request",
            text: `A password reset was requested for: ${email}. Please review and assist if appropriate.`,
            html: `<b>A password reset was requested for: ${email}</b><br/>Please review and assist if appropriate.`,
        });

        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to notify super admins." });
    }
});


export default router;