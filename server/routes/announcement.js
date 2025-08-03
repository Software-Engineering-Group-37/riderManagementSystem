import express from 'express';
import pool from '../database/dbPool.js';
import { verifyAdmin, verifySuperAdmin, verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Get all announcements
router.get('/announcements', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                a.id,
                a.title,
                a.content,
                a.type,
                a.priority,
                a.target_audience,
                a.is_active,
                a.expires_at,
                a.created_at,
                u.name as created_by_admin
            FROM announcements a
            JOIN users u ON a.created_by = u.id
            ORDER BY a.created_at DESC
        `);
        
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching announcements:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create new announcement
router.post('/announcements', verifyToken, verifySuperAdmin, async (req, res) => {
    const { title, content, type, priority, target_audience, expires_at } = req.body;
    
    try {
        const result = await pool.query(`
            INSERT INTO announcements (title, content, type, priority, target_audience, expires_at, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `, [title, content, type, priority, target_audience, expires_at, req.user.id]);
        
        // Get the announcement with admin name
        const fullResult = await pool.query(`
            SELECT 
                a.id,
                a.title,
                a.content,
                a.type,
                a.priority,
                a.target_audience,
                a.is_active,
                a.expires_at,
                a.created_at,
                u.name as created_by_admin
            FROM announcements a
            JOIN users u ON a.created_by = u.id
            WHERE a.id = $1
        `, [result.rows[0].id]);
        
        res.status(201).json(fullResult.rows[0]);
    } catch (error) {
        console.error('Error creating announcement:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update announcement
router.put('/announcement/:id', verifyToken, verifySuperAdmin, async (req, res) => {
    const { id } = req.params;
    const { title, content, type, priority, target_audience, expires_at, is_active } = req.body;
    
    try {
        // Check if announcement exists
        const checkResult = await pool.query('SELECT id FROM announcements WHERE id = $1', [id]);
        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: 'Announcement not found' });
        }
        
        const result = await pool.query(`
            UPDATE announcements 
            SET title = COALESCE($1, title),
                content = COALESCE($2, content),
                type = COALESCE($3, type),
                priority = COALESCE($4, priority),
                target_audience = COALESCE($5, target_audience),
                expires_at = $6,
                is_active = COALESCE($7, is_active),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $8
            RETURNING *
        `, [title, content, type, priority, target_audience, expires_at, is_active, id]);
        
        // Get the updated announcement with admin name
        const fullResult = await pool.query(`
            SELECT 
                a.id,
                a.title,
                a.content,
                a.type,
                a.priority,
                a.target_audience,
                a.is_active,
                a.expires_at,
                a.created_at,
                u.name as created_by_admin
            FROM announcements a
            JOIN users u ON a.created_by = u.id
            WHERE a.id = $1
        `, [id]);
        
        res.status(200).json(fullResult.rows[0]);
    } catch (error) {
        console.error('Error updating announcement:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete announcement
router.delete('/announcement/:id', verifyToken, verifySuperAdmin, async (req, res) => {
    const { id } = req.params;
    
    try {
        const result = await pool.query(`
            DELETE FROM announcements 
            WHERE id = $1 
            RETURNING id, title
        `, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Announcement not found' });
        }
        
        res.status(200).json({ 
            message: `Announcement "${result.rows[0].title}" deleted successfully`,
            id: result.rows[0].id
        });
    } catch (error) {
        console.error('Error deleting announcement:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;