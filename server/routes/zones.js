import express from 'express';
import pool from '../database/dbPool.js';
import { verifyAdmin, verifySuperAdmin, verifyToken } from '../middleware/auth.js';


const router = express.Router();

// Update zones/active-today (REPLACE existing route)
router.get('/zones/active-today', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT DISTINCT
                z.id,
                z.name,
                z.latitude,
                z.longitude,
                COUNT(s.rider_id) as riders_count
            FROM zones z
            JOIN shifts s ON z.id = s.zone_id
            WHERE CURRENT_DATE BETWEEN s.start_date AND s.end_date AND s.status != 'cancelled'
            GROUP BY z.id, z.name, z.latitude, z.longitude
            ORDER BY z.name
        `);
        
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching active zones:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


// Get all zones
router.get('/zones', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, name, latitude, longitude, created_at
            FROM zones 
            ORDER BY name
        `);
        
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching zones:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create new zone with coordinates from Nominatim API
router.post('/zones', verifyToken, verifySuperAdmin, async (req, res) => {
    const { name } = req.body;
    
    if (!name) {
        return res.status(400).json({ error: 'Zone name is required' });
    }
    
    try {
        // Fetch coordinates from Nominatim API
        const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(name + ', Ghana')}&limit=1`;
        const geoResponse = await fetch(nominatimUrl);
        const geoData = await geoResponse.json();
        
        let latitude = null;
        let longitude = null;
        
        if (geoData && geoData.length > 0) {
            latitude = parseFloat(geoData[0].lat);
            longitude = parseFloat(geoData[0].lon);
        }
        
        // Insert zone into database
        const result = await pool.query(`
            INSERT INTO zones (name, latitude, longitude) 
            VALUES ($1, $2, $3) 
            RETURNING *
        `, [name, latitude, longitude]);
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating zone:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update zone
router.put('/zone/:id', verifyToken, verifySuperAdmin, async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;
    
    if (!name) {
        return res.status(400).json({ error: 'Zone name is required' });
    }
    
    try {
        // Fetch new coordinates if name changed
        const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(name + ', Ghana')}&limit=1`;
        const geoResponse = await fetch(nominatimUrl);
        const geoData = await geoResponse.json();
        
        let latitude = null;
        let longitude = null;
        
        if (geoData && geoData.length > 0) {
            latitude = parseFloat(geoData[0].lat);
            longitude = parseFloat(geoData[0].lon);
        }
        
        const result = await pool.query(`
            UPDATE zones 
            SET name = $1, latitude = $2, longitude = $3, updated_at = CURRENT_TIMESTAMP
            WHERE id = $4 
            RETURNING *
        `, [name, latitude, longitude, id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Zone not found' });
        }
        
        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('Error updating zone:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete zone
router.delete('/zone/:id', verifyToken, verifySuperAdmin, async (req, res) => {
    const { id } = req.params;
    
    try {
        // Check if zone has ACTIVE shifts (exclude cancelled)
        const shiftCheck = await pool.query(`
            SELECT COUNT(*) FROM shifts 
            WHERE zone_id = $1 AND end_date >= CURRENT_DATE AND status != 'cancelled'
        `, [id]);
        
        if (parseInt(shiftCheck.rows[0].count) > 0) {
            return res.status(400).json({ 
                error: 'Cannot delete zone with active or future shifts' 
            });
        }
        
        const result = await pool.query('DELETE FROM zones WHERE id = $1 RETURNING *', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Zone not found' });
        }
        
        res.status(200).json({ message: 'Zone deleted successfully' });
    } catch (error) {
        console.error('Error deleting zone:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;