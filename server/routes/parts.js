const express = require('express');
const { pool } = require('../db');
const router = express.Router();

// Get all parts
router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM parts ORDER BY created_at DESC');
        const parts = result.rows.map(row => ({
            id: row.id,
            customerName: row.customer_name,
            partNumber: row.part_number,
            partName: row.part_name,
            material: row.material,
            cavity: row.cavity,
            productionTon: row.production_ton || '',
            postProcessings: row.post_processings ? JSON.parse(row.post_processings) : []
        }));
        res.json(parts);
    } catch (err) {
        console.error('Error fetching parts:', err);
        res.status(500).json({ error: err.message });
    }
});

// Create a new part
router.post('/', async (req, res) => {
    const { customerName, partNumber, partName, material, cavity, productionTon, postProcessings } = req.body;
    
    if (!customerName || !partNumber || !partName || !material || !cavity) {
        return res.status(400).json({ error: '필수 필드를 모두 입력하세요.' });
    }

    try {
        const id = `part-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const postProcessingsJson = JSON.stringify(postProcessings || []);

        await pool.query(
            `INSERT INTO parts (id, customer_name, part_number, part_name, material, cavity, production_ton, post_processings)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [id, customerName, partNumber, partName, material, cavity, productionTon || null, postProcessingsJson]
        );

        res.json({ id, customerName, partNumber, partName, material, cavity, productionTon: productionTon || '', postProcessings: postProcessings || [] });
    } catch (err) {
        console.error('Error creating part:', err);
        res.status(500).json({ error: err.message });
    }
});

// Delete a part
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM parts WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting part:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

