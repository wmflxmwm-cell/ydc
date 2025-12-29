const express = require('express');
const { pool } = require('../db');
const router = express.Router();
const { v4: uuidv4 } = require('uuid'); // We might need uuid package or just use random string

// Helper for ID generation if uuid not installed, but better to install uuid.
// For now, let's assume we can generate simple IDs or install uuid.
// Let's use a simple random string for now to avoid extra dependency if possible, or just install uuid.
const generateId = () => Math.random().toString(36).substr(2, 9);

router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM projects ORDER BY created_at DESC');
        // Map snake_case DB fields to camelCase API fields
        const projects = result.rows.map(row => ({
            id: row.id,
            customerName: row.customer_name,
            carModel: row.car_model,
            partName: row.part_name,
            partNumber: row.part_number,
            moldCavity: row.mold_cavity,
            sopDate: row.sop_date,
            status: row.status,
            type: row.type,
            material: row.material,
            createdAt: row.created_at
        }));
        res.json(projects);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const project = req.body;
        const id = `proj-${generateId()}`;

        await client.query(
            `INSERT INTO projects (id, customer_name, car_model, part_name, part_number, mold_cavity, sop_date, status, type, material)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [id, project.customerName, project.carModel, project.partName, project.partNumber, project.moldCavity, project.sopDate, project.status, project.type, project.material]
        );

        // Create initial gates
        for (let i = 1; i <= 5; i++) {
            await client.query(
                `INSERT INTO gates (id, project_id, phase_number, status)
         VALUES ($1, $2, $3, $4)`,
                [`g-${id}-${i}`, id, i, i === 1 ? '진행중' : '잠금']
            );
        }

        await client.query('COMMIT');

        // Return created project
        const newProject = { ...project, id, createdAt: new Date().toISOString() };
        res.json(newProject);
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

module.exports = router;
