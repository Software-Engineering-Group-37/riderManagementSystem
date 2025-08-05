import express from 'express';
import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

import bcrypt from 'bcrypt';
import { v2 as cloudinary } from 'cloudinary';
import pool from '../database/dbPool.js';
import { verifyAdmin, verifyToken } from '../middleware/auth.js';
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure Cloudinary storage
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'rms_profile_picture',
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
        transformation: [
            { width: 400, height: 400, crop: 'fill', gravity: 'face' },
            { quality: 'auto', fetch_format: 'auto' }
        ],
        public_id: (req, file) => {
            return `user_${req.user.id}_${Date.now()}`;
        }
    }
});

const upload = multer({
    storage: storage,
    limits: { 
        fileSize: 5 * 1024 * 1024, // 5MB
        files: 1
    },
    fileFilter: (req, file, cb) => {
        console.log('🔍 Multer fileFilter called with:', file);
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
});
const router = express.Router();

// ==================== SYSTEM CONFIGURATION ====================

// Get system configuration
router.get('/system-config', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT key, value, description, data_type, updated_at, updated_by_admin
            FROM system_config
            ORDER BY key
        `);
        
        // Convert to object format for easier frontend consumption
        const config = {};
        result.rows.forEach(row => {
            let value = row.value;
            // Parse based on data type
            if (row.data_type === 'number') {
                value = parseFloat(value);
            } else if (row.data_type === 'boolean') {
                value = value === 'true';
            } else if (row.data_type === 'json') {
                try {
                    value = JSON.parse(value);
                } catch (e) {
                    console.warn(`Failed to parse JSON for ${row.key}:`, e);
                }
            }
            
            config[row.key] = {
                value,
                description: row.description,
                data_type: row.data_type,
                updated_at: row.updated_at,
                updated_by_admin: row.updated_by_admin
            };
        });
        
        res.status(200).json(config);
    } catch (error) {
        console.error('Error fetching system config:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update system configuration
router.put('/system-config', verifyToken, verifyAdmin, async (req, res) => {
    const { configs } = req.body; // Array of {key, value} objects
    
    if (!configs || !Array.isArray(configs)) {
        return res.status(400).json({ error: 'configs array is required' });
    }
    
    try {
        await pool.query('BEGIN');
        
        const updatedConfigs = [];
        
        for (const config of configs) {
            const { key, value } = config;
            
            if (!key) continue;
            
            // Convert value to string for storage
            let stringValue = value;
            if (typeof value === 'object') {
                stringValue = JSON.stringify(value);
            } else {
                stringValue = String(value);
            }
            
            const result = await pool.query(`
                UPDATE system_config 
                SET value = $1, updated_at = CURRENT_TIMESTAMP, updated_by_admin = $2
                WHERE key = $3
                RETURNING *
            `, [stringValue, req.user.name, key]);
            
            if (result.rows.length > 0) {
                updatedConfigs.push(result.rows[0]);
            }
        }
        
        await pool.query('COMMIT');
        res.status(200).json({ 
            message: 'System configuration updated successfully',
            updated: updatedConfigs
        });
    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('Error updating system config:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get user profile (include photo_url)
router.get('/profile', verifyToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                u.id,
                u.name,
                u.email,
                u.photo_url,
                u.created_at,
                r.name as role_name
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            WHERE u.id = $1
        `, [req.user.id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = result.rows[0];
        res.status(200).json(user);
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/riders/profile', verifyToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                u.id,
                u.name,
                u.email,
                u.photo_url,
                u.created_at,
            FROM riders u
            WHERE u.id = $1
        `, [req.user.id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = result.rows[0];
        res.status(200).json(user);
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Update profile information
router.put('/profile', verifyToken, async (req, res) => {
    try {
        const { name, email, deletePhoto } = req.body; // Add deletePhoto parameter

        if (!name || !email) {
            return res.status(400).json({ error: 'Name and email are required' });
        }

        // Check if email already exists for another user
        const emailCheck = await pool.query(
            'SELECT id FROM users WHERE email = $1 AND id != $2',
            [email, req.user.id]
        );

        if (emailCheck.rows.length > 0) {
            return res.status(400).json({ error: 'Email already exists' });
        }

        // Handle photo deletion if requested
        if (deletePhoto) {
            console.log('🗑️ Deleting profile photo...');
            
            // Get current photo info
            const currentUser = await pool.query(
                'SELECT photo_url, photo_public_id FROM users WHERE id = $1',
                [req.user.id]
            );

            if (currentUser.rows[0]?.photo_public_id) {
                try {
                    console.log('☁️ Deleting from Cloudinary:', currentUser.rows[0].photo_public_id);
                    await cloudinary.uploader.destroy(currentUser.rows[0].photo_public_id);
                    console.log('✅ Photo deleted from Cloudinary');
                } catch (deleteError) {
                    console.warn('⚠️ Failed to delete photo from Cloudinary:', deleteError);
                    // Continue with database update even if Cloudinary deletion fails
                }
            }

            // Update user without photo
            const result = await pool.query(`
                UPDATE users 
                SET name = $1, email = $2, photo_url = NULL, photo_public_id = NULL, updated_at = CURRENT_TIMESTAMP 
                WHERE id = $3 
                RETURNING id, name, email, photo_url, created_at
            `, [name, email, req.user.id]);

            console.log('✅ Profile updated and photo deleted');
        } else {
            // Normal update without touching photo
            const result = await pool.query(`
                UPDATE users 
                SET name = $1, email = $2, updated_at = CURRENT_TIMESTAMP 
                WHERE id = $3 
                RETURNING id, name, email, photo_url, created_at
            `, [name, email, req.user.id]);
        }

        // Get updated user with role name
        const userWithRole = await pool.query(`
            SELECT 
                u.id,
                u.name,
                u.email,
                u.photo_url,
                u.created_at,
                r.name as role_name
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            WHERE u.id = $1
        `, [req.user.id]);

        res.status(200).json(userWithRole.rows[0]);
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Upload avatar
// Enhance the existing avatar upload route:
router.post('/profile/avatar', verifyToken, upload.single('avatar'), async (req, res) => {
    try {
        console.log('🔍 Avatar upload request received');
        console.log('📁 File info:', req.file);
        
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const photoUrl = req.file.path; // Cloudinary URL
        const publicId = req.file.filename; // Cloudinary public_id
        
        console.log('☁️ Cloudinary URL:', photoUrl);
        console.log('🆔 Public ID:', publicId);

        await pool.query('BEGIN');

        try {
            // Get and delete old avatar if exists
            const oldAvatar = await pool.query(
                'SELECT photo_url, photo_public_id FROM users WHERE id = $1',
                [req.user.id]
            );

            if (oldAvatar.rows[0]?.photo_public_id) {
                try {
                    console.log('🗑️ Deleting old avatar:', oldAvatar.rows[0].photo_public_id);
                    await cloudinary.uploader.destroy(oldAvatar.rows[0].photo_public_id);
                    console.log('✅ Old avatar deleted from Cloudinary');
                } catch (deleteError) {
                    console.warn('⚠️ Failed to delete old avatar:', deleteError);
                    // Continue with update even if deletion fails
                }
            }

            // Update user's photo in database
            console.log('💾 Updating database with new photo...');
            
            const updateResult = await pool.query(
                'UPDATE users SET photo_url = $1, photo_public_id = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING photo_url, photo_public_id',
                [photoUrl, publicId, req.user.id]
            );
            
            await pool.query('COMMIT');
            
            console.log('✅ Database updated successfully');

            const response = {
                message: 'Avatar uploaded successfully',
                photo_url: photoUrl,
                public_id: publicId,
                success: true
            };

            console.log('📤 Sending response:', response);
            res.status(200).json(response);

        } catch (dbError) {
            await pool.query('ROLLBACK');
            
            // If database update fails, clean up the newly uploaded file
            try {
                await cloudinary.uploader.destroy(publicId);
                console.log('🧹 Cleaned up uploaded file after database error');
            } catch (cleanupError) {
                console.warn('⚠️ Failed to cleanup uploaded file:', cleanupError);
            }
            
            throw dbError;
        }

    } catch (error) {
        console.error('❌ Error uploading avatar:', error);
        res.status(500).json({ 
            error: 'Failed to upload avatar',
            details: error.message 
        });
    }
});

// Remove profile photo only
router.delete('/profile/photo', verifyToken, async (req, res) => {
    try {
        console.log('🗑️ Profile photo deletion request received');
        
        // Get current photo info
        const user = await pool.query(
            'SELECT photo_url, photo_public_id FROM users WHERE id = $1',
            [req.user.id]
        );

        if (!user.rows[0]?.photo_url) {
            return res.status(400).json({ error: 'No profile photo to delete' });
        }

        // Delete from Cloudinary if public_id exists
        if (user.rows[0].photo_public_id) {
            try {
                console.log('☁️ Deleting from Cloudinary:', user.rows[0].photo_public_id);
                await cloudinary.uploader.destroy(user.rows[0].photo_public_id);
                console.log('✅ Photo deleted from Cloudinary');
            } catch (deleteError) {
                console.warn('⚠️ Failed to delete photo from Cloudinary:', deleteError);
                // Continue with database update even if Cloudinary deletion fails
            }
        }

        // Update database to remove photo
        await pool.query(
            'UPDATE users SET photo_url = NULL, photo_public_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
            [req.user.id]
        );

        console.log('✅ Profile photo deleted successfully');
        res.status(200).json({ 
            message: 'Profile photo deleted successfully',
            success: true 
        });
    } catch (error) {
        console.error('❌ Error deleting profile photo:', error);
        res.status(500).json({ 
            error: 'Failed to delete profile photo',
            details: error.message 
        });
    }
});

// Replace your current password change route with this:
router.put('/profile/password', verifyToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Both current and new passwords are required' });
        }

        // Get current password hash
        const user = await pool.query('SELECT password FROM users WHERE id = $1', [req.user.id]);
        
        if (user.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Verify current password - USE THE IMPORTED bcrypt, not require it again
        const isValidPassword = await bcrypt.compare(currentPassword, user.rows[0].password);
        
        if (!isValidPassword) {
            return res.status(400).json({ error: 'Current password is incorrect' });
        }

        // Hash new password
        const saltRounds = 10;
        const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

        // Update password
        await pool.query(
            'UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [hashedNewPassword, req.user.id]
        );

        console.log('✅ Password changed successfully for user:', req.user.id);
        res.status(200).json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error('❌ Error changing password:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Rider profile update (name, photo)
router.put('/rider-profile', verifyToken, async (req, res) => {
    const { name, photo_url } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    const result = await pool.query(
        'UPDATE riders SET name = $1, photo_url = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING id, name, email, photo_url, created_at',
        [name, photo_url, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Rider not found' });
    res.status(200).json(result.rows[0]);
});

// Rider avatar upload
router.post('/rider-profile/avatar', verifyToken, upload.single('avatar'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const photoUrl = req.file.path;
    const result = await pool.query(
        'UPDATE riders SET photo_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING photo_url',
        [photoUrl, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Rider not found' });
    res.status(200).json({ photo_url: photoUrl, success: true });
});
export default router;