const express = require('express');
const { pool } = require('../db');
const router = express.Router();
const generateId = () => Math.random().toString(36).substr(2, 9);

router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM issues');
        const issues = result.rows.map(row => ({
            id: row.id,
            projectId: row.project_id,
            phase: row.phase,
            issueType: row.issue_type,
            description: row.description,
            actionPlan: row.action_plan,
            isResolved: row.is_resolved
        }));
        res.json(issues);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/', async (req, res) => {
    const issue = req.body;
    const id = `issue-${generateId()}`;
    try {
        await pool.query(
            `INSERT INTO issues (id, project_id, phase, issue_type, description, action_plan, is_resolved)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [id, issue.projectId, issue.phase, issue.issueType, issue.description, issue.actionPlan, issue.isResolved]
        );
        res.json({ ...issue, id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const issue = req.body;
    try {
        // Dynamic update query construction could be better, but for now specific fields
        // Only isResolved is toggled in the app currently, but let's support all
        if (issue.isResolved !== undefined) {
            await pool.query('UPDATE issues SET is_resolved = $1 WHERE id = $2', [issue.isResolved, id]);
        }
        // Add other fields if needed

        // Return updated issue (fetch it to be sure)
        const result = await pool.query('SELECT * FROM issues WHERE id = $1', [id]);
        const row = result.rows[0];
        res.json({
            id: row.id,
            projectId: row.project_id,
            phase: row.phase,
            issueType: row.issue_type,
            description: row.description,
            actionPlan: row.action_plan,
            isResolved: row.is_resolved
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
