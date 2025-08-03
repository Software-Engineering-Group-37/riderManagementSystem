import jwt from 'jsonwebtoken';
import pool from '../database/dbPool.js';

// Middleware to verify JWT token from cookies
export const verifyToken = async (req, res, next) => {
    try {
        const { accessToken, refreshToken } = req.cookies;
        
        if (!accessToken && !refreshToken) {
            return res.status(401).json({ error: 'Access denied. No token provided.' });
        }

        // Try to verify access token first
        if (accessToken) {
            try {
                const decoded = jwt.verify(accessToken, process.env.JWT_SECRET || 'your-secret-key');
                
                // Check if it's an access token
                if (decoded.type !== 'access') {
                    throw new Error('Invalid token type');
                }
                
                req.user = decoded;
                return next();
            } catch (error) {
                // Access token is invalid/expired, try refresh token
                console.log('Access token expired, attempting refresh...');
            }
        }

        // If access token failed, try to refresh
        if (refreshToken) {
            try {
                const decoded = jwt.verify(
                    refreshToken, 
                    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'your-refresh-secret-key'
                );

                if (decoded.type !== 'refresh') {
                    throw new Error('Invalid refresh token type');
                }

                // Generate new access token
                const newAccessToken = jwt.sign(
                    { 
                        id: decoded.id, 
                        email: decoded.email, 
                        role: decoded.role,
                        type: 'access'
                    },
                    process.env.JWT_SECRET || 'your-secret-key',
                    { expiresIn: '1h' }
                );

                // Set new access token cookie
                res.cookie('accessToken', newAccessToken, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'strict',
                    maxAge: 60 * 60 * 1000 // 1 hour
                });

                req.user = {
                    id: decoded.id,
                    email: decoded.email,
                    role: decoded.role,
                    type: 'access'
                };
                
                return next();
            } catch (error) {
                console.error('Refresh token verification failed:', error);
            }
        }

        return res.status(401).json({ error: 'Invalid or expired tokens' });
    } catch (error) {
        console.error('Token verification error:', error);
        res.status(401).json({ error: 'Token verification failed' });
    }
};

// Middleware to verify admin role (any admin - super or sub)
export const verifyAdmin = async (req, res, next) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied. Admin role required.' });
        }
        
        // Verify admin exists and get role information from users table
        const result = await pool.query(`
            SELECT u.id, u.role_id, r.name as role_name 
            FROM users u 
            LEFT JOIN roles r ON u.role_id = r.id 
            WHERE u.id = $1 AND u.role_id IS NOT NULL
        `, [req.user.id]);
        
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Admin not found.' });
        }
        
        req.admin = result.rows[0];
        next();
    } catch (error) {
        console.error('Error verifying admin:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Middleware to verify superadmin role
export const verifySuperAdmin = async (req, res, next) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied. Admin role required.' });
        }
        
        const result = await pool.query(`
            SELECT u.id, u.role_id, r.name as role_name 
            FROM users u 
            LEFT JOIN roles r ON u.role_id = r.id 
            WHERE u.id = $1
        `, [req.user.id]);
        
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Admin not found.' });
        }
        
        const admin = result.rows[0];
        
        if (!admin.role_name || admin.role_name.toLowerCase() !== 'superadmin') {
            return res.status(403).json({ error: 'Access denied. superadmin role required.' });
        }
        
        req.admin = admin;
        next();
    } catch (error) {
        console.error('Error verifying superadmin:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Middleware to verify rider role
export const verifyRider = async (req, res, next) => {
    try {
        if (req.user.role !== 'rider') {
            return res.status(403).json({ error: 'Access denied. Rider role required.' });
        }
        
        const result = await pool.query(
            'SELECT id FROM riders WHERE id = $1',
            [req.user.id]
        );
        
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Rider not found.' });
        }
        
        next();
    } catch (error) {
        console.error('Error verifying rider:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};