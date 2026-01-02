const express = require('express');
const { pool } = require('../db');
const router = express.Router();

// Get all sample schedules
router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM sample_schedules ORDER BY created_at DESC');
        const schedules = result.rows.map(row => ({
            id: row.id,
            partName: row.part_name,
            partNumber: row.part_number,
            quantity: row.quantity,
            requestDate: row.request_date,
            shippingMethod: row.shipping_method,
            productCostType: row.product_cost_type,
            moldSequence: row.mold_sequence,
            lot: row.lot,
            remarks: row.remarks,
            schedules: row.schedules ? JSON.parse(row.schedules) : []
        }));
        res.json(schedules);
    } catch (err) {
        console.error('Error fetching sample schedules:', err);
        res.status(500).json({ error: err.message });
    }
});

// Create a new sample schedule
router.post('/', async (req, res) => {
    const { partName, partNumber, quantity, requestDate, shippingMethod, productCostType, moldSequence, lot, schedules } = req.body;
    
    if (!partName || !partNumber || quantity <= 0 || !requestDate) {
        return res.status(400).json({ error: '필수 필드를 모두 입력하세요.' });
    }

    try {
        const id = `sample-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const schedulesJson = JSON.stringify(schedules || []);

        await pool.query(
            `INSERT INTO sample_schedules (id, part_name, part_number, quantity, request_date, shipping_method, product_cost_type, mold_sequence, lot, schedules)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [id, partName, partNumber, quantity, requestDate, shippingMethod, productCostType, moldSequence || null, lot || null, schedulesJson]
        );

        res.json({ 
            id, 
            partName, 
            partNumber, 
            quantity, 
            requestDate, 
            shippingMethod, 
            productCostType,
            moldSequence: moldSequence || null,
            lot: lot || null,
            schedules: schedules || [] 
        });
    } catch (err) {
        console.error('Error creating sample schedule:', err);
        res.status(500).json({ error: err.message });
    }
});

// Update a sample schedule
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { partName, partNumber, quantity, requestDate, shippingMethod, productCostType, moldSequence, lot, remarks, schedules } = req.body;
    
    try {
        const schedulesJson = JSON.stringify(schedules || []);

        await pool.query(
            `UPDATE sample_schedules 
             SET part_name = $1, part_number = $2, quantity = $3, request_date = $4, 
                 shipping_method = $5, product_cost_type = $6, mold_sequence = $7, lot = $8, remarks = $9, schedules = $10
             WHERE id = $11`,
            [partName, partNumber, quantity, requestDate, shippingMethod, productCostType, moldSequence || null, lot || null, remarks || null, schedulesJson, id]
        );

        res.json({ 
            id, 
            partName, 
            partNumber, 
            quantity, 
            requestDate, 
            shippingMethod, 
            productCostType,
            moldSequence: moldSequence || null,
            lot: lot || null,
            remarks: remarks || null,
            schedules: schedules || [] 
        });
    } catch (err) {
        console.error('Error updating sample schedule:', err);
        res.status(500).json({ error: err.message });
    }
});

// Delete a sample schedule
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM sample_schedules WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting sample schedule:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

