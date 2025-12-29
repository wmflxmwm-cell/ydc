const express = require('express');
const { pool } = require('../db');
const router = express.Router();

// Get gates by project ID (Note: API path is /projects/:id/gates usually, but let's follow service structure)
// Actually service calls /projects/:id/gates. Let's handle that in projects.js or here.
// But wait, the service `gateService.getByProjectId` calls `/projects/${projectId}/gates`.
// So this should be mounted under /projects or we need to change the route.
// Let's keep it simple and maybe add a route in projects.js for gates or handle it here if we mount it differently.
// For simplicity, let's put it in projects.js or make a separate route that handles /projects/:id/gates.
// Actually, let's implement the route in projects.js for getting gates, and this file for updating gates (/gates/:id).

router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const gate = req.body;

    try {
        await pool.query(
            `UPDATE gates SET 
       status = $1, approval_date = $2, flow_analysis_result = $3, try_out_count = $4, try_out_result = $5
       WHERE id = $6`,
            [gate.status, gate.approvalDate, gate.flowAnalysisResult, gate.tryOutCount, gate.tryOutResult, id]
        );
        res.json(gate);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
