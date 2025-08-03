import express from 'express';
import pool from '../database/dbPool.js';
import { verifySuperAdmin, verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Get all roles (KEEP THE BETTER VERSION)
router.get('/roles', verifyToken, verifySuperAdmin, async (req, res) => {
    try {
        console.log('🔍 Fetching roles list...');
        
        const result = await pool.query(`
            SELECT 
                id,
                name,
                description,
                created_at
            FROM roles
            ORDER BY created_at DESC
        `);
        
        console.log(`📊 Found ${result.rows.length} roles`);
        res.status(200).json(result.rows);
        
    } catch (error) {
        console.error('❌ Error fetching roles:', error);
        res.status(500).json({ 
            error: 'Internal server error', 
            details: error.message 
        });
    }
});

// Create new role (KEEP THE BETTER VERSION)
router.post('/roles', verifyToken, verifySuperAdmin, async (req, res) => {
    try {
        const { name, description } = req.body;
        
        // Validate required fields
        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Role name is required' });
        }
        
        // Check if role name already exists
        const existingRole = await pool.query(
            'SELECT id FROM roles WHERE LOWER(name) = LOWER($1)',
            [name.trim()]
        );
        
        if (existingRole.rows.length > 0) {
            return res.status(400).json({ error: 'Role name already exists' });
        }
        
        console.log(`👤 Creating new role: ${name}`);
        
        const result = await pool.query(
            'INSERT INTO roles (name, description) VALUES ($1, $2) RETURNING *',
            [name.trim(), description?.trim() || null]
        );
        
        console.log('✅ Role created successfully');
        res.status(201).json({
            message: 'Role created successfully',
            role: result.rows[0]
        });
        
    } catch (error) {
        console.error('❌ Error creating role:', error);
        res.status(500).json({ 
            error: 'Internal server error', 
            details: error.message 
        });
    }
});

// Update role
router.put('/role/:id', verifyToken, verifySuperAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;
        
        // Validate required fields
        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Role name is required' });
        }
        
        // Check if role exists
        const existingRole = await pool.query('SELECT * FROM roles WHERE id = $1', [id]);
        if (existingRole.rows.length === 0) {
            return res.status(404).json({ error: 'Role not found' });
        }
        
        // Check if new name conflicts with another role
        const nameCheck = await pool.query(
            'SELECT id FROM roles WHERE LOWER(name) = LOWER($1) AND id != $2',
            [name.trim(), id]
        );
        
        if (nameCheck.rows.length > 0) {
            return res.status(400).json({ error: 'Role name already exists' });
        }
        
        console.log(`📝 Updating role: ${id}`);
        
        const result = await pool.query(
            'UPDATE roles SET name = $1, description = $2 WHERE id = $3 RETURNING *',
            [name.trim(), description?.trim() || null, id]
        );
        
        console.log('✅ Role updated successfully');
        res.status(200).json({
            message: 'Role updated successfully',
            role: result.rows[0]
        });
        
    } catch (error) {
        console.error('❌ Error updating role:', error);
        res.status(500).json({ 
            error: 'Internal server error', 
            details: error.message 
        });
    }
});

// Delete role
router.delete('/role/:id', verifyToken, verifySuperAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Check if role exists
        const existingRole = await pool.query('SELECT * FROM roles WHERE id = $1', [id]);
        if (existingRole.rows.length === 0) {
            return res.status(404).json({ error: 'Role not found' });
        }
        
        // Check if role is being used by any users
        const usersWithRole = await pool.query('SELECT id FROM users WHERE role_id = $1', [id]);
        if (usersWithRole.rows.length > 0) {
            return res.status(400).json({ 
                error: `Cannot delete role "${existingRole.rows[0].name}" because it is assigned to ${usersWithRole.rows.length} user(s)` 
            });
        }
        
        console.log(`🗑️ Deleting role: ${id}`);
        
        await pool.query('DELETE FROM roles WHERE id = $1', [id]);
        
        console.log('✅ Role deleted successfully');
        res.status(200).json({
            message: 'Role deleted successfully'
        });
        
    } catch (error) {
        console.error('❌ Error deleting role:', error);
        res.status(500).json({ 
            error: 'Internal server error', 
            details: error.message 
        });
    }
});

export default router;