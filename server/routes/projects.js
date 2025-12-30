const express = require('express');
const { pool } = require('../db');
const router = express.Router();
const { v4: uuidv4 } = require('uuid'); // We might need uuid package or just use random string

// Helper for ID generation if uuid not installed, but better to install uuid.
// For now, let's assume we can generate simple IDs or install uuid.
// Let's use a simple random string for now to avoid extra dependency if possible, or just install uuid.
const generateId = () => Math.random().toString(36).substr(2, 9);

// Get gates by project ID (must be before /:id route)
router.get('/:id/gates', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            'SELECT * FROM gates WHERE project_id = $1 ORDER BY phase_number ASC',
            [id]
        );
        // Map snake_case DB fields to camelCase API fields
        const gates = result.rows.map(row => ({
            id: row.id,
            projectId: row.project_id,
            phaseNumber: row.phase_number,
            status: row.status,
            approvalDate: row.approval_date,
            flowAnalysisResult: row.flow_analysis_result,
            tryOutCount: row.try_out_count,
            tryOutResult: row.try_out_result
        }));
        res.json(gates);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

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
            createdAt: row.created_at,
            fotDate: row.fot_date,
            faiDate: row.fai_date,
            p1Date: row.p1_date,
            p2Date: row.p2_date,
            runAtRateDate: row.run_at_rate_date,
            ppapDate: row.ppap_date,
            customerSopDate: row.customer_sop_date
        }));
        res.json(projects);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get gates by project ID
router.get('/:id/gates', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            'SELECT * FROM gates WHERE project_id = $1 ORDER BY phase_number ASC',
            [id]
        );
        // Map snake_case DB fields to camelCase API fields
        const gates = result.rows.map(row => ({
            id: row.id,
            projectId: row.project_id,
            phaseNumber: row.phase_number,
            status: row.status,
            approvalDate: row.approval_date,
            flowAnalysisResult: row.flow_analysis_result,
            tryOutCount: row.try_out_count,
            tryOutResult: row.try_out_result
        }));
        res.json(gates);
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
            `INSERT INTO projects (id, customer_name, car_model, part_name, part_number, mold_cavity, sop_date, status, type, material, fot_date, fai_date, p1_date, p2_date, run_at_rate_date, ppap_date, customer_sop_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
            [
                id, 
                project.customerName, 
                project.carModel, 
                project.partName, 
                project.partNumber, 
                project.moldCavity, 
                project.sopDate || null, 
                project.status, 
                project.type, 
                project.material,
                project.fotDate || null,
                project.faiDate || null,
                project.p1Date || null,
                project.p2Date || null,
                project.runAtRateDate || null,
                project.ppapDate || null,
                project.customerSopDate || null
            ]
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
