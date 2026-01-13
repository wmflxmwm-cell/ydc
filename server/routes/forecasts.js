const express = require('express');
const { pool } = require('../db');
const router = express.Router();

// Get all forecasts (filtered by user_id if provided)
router.get('/', async (req, res) => {
    try {
        const userId = req.query.userId || req.headers['x-user-id'];
        let query = 'SELECT * FROM forecasts';
        const params = [];
        
        if (userId) {
            query += ' WHERE user_id = $1';
            params.push(userId);
        }
        
        query += ' ORDER BY created_at DESC';
        
        const result = await pool.query(query, params);
        const forecasts = result.rows.map(row => ({
            id: row.id,
            partName: row.part_name,
            partNumber: row.part_number,
            customerName: row.customer_name,
            material: row.material,
            volume2026: row.volume_2026,
            volume2027: row.volume_2027,
            volume2028: row.volume_2028,
            volume2029: row.volume_2029,
            volume2030: row.volume_2030,
            volume2031: row.volume_2031,
            volume2032: row.volume_2032,
            userId: row.user_id,
            createdAt: row.created_at
        }));
        res.json(forecasts);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create or update forecast
router.post('/', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { partName, partNumber, customerName, material, forecast } = req.body;

        // Validation: partName is required
        if (!partName || typeof partName !== 'string' || partName.trim() === '') {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'partName is required' });
        }

        // Get user_id from request (query param or header)
        const userId = req.body.userId || req.query.userId || req.headers['x-user-id'] || null;

        // Check if forecast exists for this partName and user_id
        let existingQuery = 'SELECT id FROM forecasts WHERE part_name = $1';
        const existingParams = [partName.trim()];
        
        if (userId) {
            existingQuery += ' AND user_id = $2';
            existingParams.push(userId);
        } else {
            existingQuery += ' AND user_id IS NULL';
        }
        
        const existing = await client.query(existingQuery, existingParams);

        // Safely extract volume values from forecast object
        const volumes = {
            volume2026: (forecast && typeof forecast[2026] === 'number') ? forecast[2026] : null,
            volume2027: (forecast && typeof forecast[2027] === 'number') ? forecast[2027] : null,
            volume2028: (forecast && typeof forecast[2028] === 'number') ? forecast[2028] : null,
            volume2029: (forecast && typeof forecast[2029] === 'number') ? forecast[2029] : null,
            volume2030: (forecast && typeof forecast[2030] === 'number') ? forecast[2030] : null,
            volume2031: (forecast && typeof forecast[2031] === 'number') ? forecast[2031] : null,
            volume2032: (forecast && typeof forecast[2032] === 'number') ? forecast[2032] : null
        };

        if (existing.rows.length > 0) {
            // Update existing forecast
            const id = existing.rows[0].id;
            await client.query(
                `UPDATE forecasts SET
                    part_number = $1,
                    customer_name = $2,
                    material = $3,
                    volume_2026 = $4,
                    volume_2027 = $5,
                    volume_2028 = $6,
                    volume_2029 = $7,
                    volume_2030 = $8,
                    volume_2031 = $9,
                    volume_2032 = $10,
                    created_at = CURRENT_TIMESTAMP
                WHERE id = $11`,
                [
                    (partNumber && typeof partNumber === 'string') ? partNumber.trim() : '',
                    (customerName && typeof customerName === 'string') ? customerName.trim() : '',
                    (material && typeof material === 'string') ? material.trim() : '',
                    volumes.volume2026,
                    volumes.volume2027,
                    volumes.volume2028,
                    volumes.volume2029,
                    volumes.volume2030,
                    volumes.volume2031,
                    volumes.volume2032,
                    id
                ]
            );
            await client.query('COMMIT');
            res.json({ id, ...req.body, message: 'Forecast updated' });
        } else {
            // Create new forecast
            const id = `forecast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            await client.query(
                `INSERT INTO forecasts (
                    id, part_name, part_number, customer_name, material,
                    volume_2026, volume_2027, volume_2028, volume_2029,
                    volume_2030, volume_2031, volume_2032, user_id, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_TIMESTAMP)`,
                [
                    id,
                    partName.trim(),
                    (partNumber && typeof partNumber === 'string') ? partNumber.trim() : '',
                    (customerName && typeof customerName === 'string') ? customerName.trim() : '',
                    (material && typeof material === 'string') ? material.trim() : '',
                    volumes.volume2026,
                    volumes.volume2027,
                    volumes.volume2028,
                    volumes.volume2029,
                    volumes.volume2030,
                    volumes.volume2031,
                    volumes.volume2032,
                    userId
                ]
            );
            await client.query('COMMIT');
            res.json({ id, ...req.body, message: 'Forecast created' });
        }
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Forecast save error:', err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// Delete forecast
router.delete('/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM forecasts WHERE id = $1', [req.params.id]);
        res.json({ message: 'Forecast deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

