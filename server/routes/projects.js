const express = require('express');
const { pool } = require('../db');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

const generateId = () => Math.random().toString(36).substr(2, 9);

// Get gates by project ID - This route must come before router.get('/') to avoid route conflicts
router.get('/:id/gates', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            'SELECT * FROM gates WHERE project_id = $1 ORDER BY phase_number ASC',
            [id]
        );
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
            customerSopDate: row.customer_sop_date,
            volume2026: row.volume_2026,
            volume2027: row.volume_2027,
            volume2028: row.volume_2028,
            volume2029: row.volume_2029,
            volume2030: row.volume_2030,
            volume2031: row.volume_2031,
            volume2032: row.volume_2032,
            developmentPhase: row.development_phase,
            feasibilityReviewPlan: row.feasibility_review_plan,
            feasibilityReviewActual: row.feasibility_review_actual,
            moldOrderPlan: row.mold_order_plan,
            moldOrderActual: row.mold_order_actual,
            moldDeliveryPlan: row.mold_delivery_plan,
            moldDeliveryActual: row.mold_delivery_actual,
            istrSubmissionPlan: row.istr_submission_plan,
            istrSubmissionActual: row.istr_submission_actual,
            ydcVnPpapPlan: row.ydc_vn_ppap_plan,
            ydcVnPpapActual: row.ydc_vn_ppap_actual,
            ppapKrSubmissionPlan: row.ppap_kr_submission_plan,
            ppapKrSubmissionActual: row.ppap_kr_submission_actual,
            ppapCustomerApprovalPlan: row.ppap_customer_approval_plan,
            ppapCustomerApprovalActual: row.ppap_customer_approval_actual,
            ydcVnSopPlan: row.ydc_vn_sop_plan,
            ydcVnSopActual: row.ydc_vn_sop_actual,
            customerSopPlan: row.customer_sop_plan,
            customerSopActual: row.customer_sop_actual,
            deliverySchedulePlan: row.delivery_schedule_plan,
            deliveryScheduleActual: row.delivery_schedule_actual
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
        const rawProject = req.body;

        // Validation: Required fields
        const requiredFields = ['customerName', 'partName', 'status', 'type', 'material', 'sopDate', 'carModel'];
        const missingFields = requiredFields.filter(field => !rawProject[field] || rawProject[field] === null);
        if (missingFields.length > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ 
                error: 'Missing required fields', 
                missingFields,
                received: Object.keys(rawProject)
            });
        }

        // Sanitize payload: Convert null/empty to appropriate defaults
        const sanitizeString = (val) => {
            if (val === null || val === undefined) return '';
            return String(val).trim();
        };

        const sanitizeDate = (val) => {
            if (!val || val === null || val === '') return null;
            const date = new Date(val);
            return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0];
        };

        const sanitizeNumber = (val, defaultValue = null) => {
            if (val === null || val === undefined || val === '') return defaultValue;
            const num = Number(val);
            return isNaN(num) ? defaultValue : num;
        };

        const project = {
            customerName: sanitizeString(rawProject.customerName),
            partName: sanitizeString(rawProject.partName),
            partNumber: sanitizeString(rawProject.partNumber || ''),
            carModel: sanitizeString(rawProject.carModel || ''),
            moldCavity: sanitizeNumber(rawProject.moldCavity, 2),
            sopDate: sanitizeDate(rawProject.sopDate),
            status: sanitizeString(rawProject.status),
            type: sanitizeString(rawProject.type),
            material: sanitizeString(rawProject.material),
            developmentPhase: sanitizeString(rawProject.developmentPhase || ''),
            // Optional date fields
            fotDate: sanitizeDate(rawProject.fotDate),
            faiDate: sanitizeDate(rawProject.faiDate),
            p1Date: sanitizeDate(rawProject.p1Date),
            p2Date: sanitizeDate(rawProject.p2Date),
            runAtRateDate: sanitizeDate(rawProject.runAtRateDate),
            ppapDate: sanitizeDate(rawProject.ppapDate),
            customerSopDate: sanitizeDate(rawProject.customerSopDate),
            // Volume fields
            volume2026: sanitizeNumber(rawProject.volume2026),
            volume2027: sanitizeNumber(rawProject.volume2027),
            volume2028: sanitizeNumber(rawProject.volume2028),
            volume2029: sanitizeNumber(rawProject.volume2029),
            volume2030: sanitizeNumber(rawProject.volume2030),
            volume2031: sanitizeNumber(rawProject.volume2031),
            volume2032: sanitizeNumber(rawProject.volume2032),
            // 증작 금형 fields
            feasibilityReviewPlan: sanitizeDate(rawProject.feasibilityReviewPlan),
            feasibilityReviewActual: sanitizeDate(rawProject.feasibilityReviewActual),
            moldOrderPlan: sanitizeDate(rawProject.moldOrderPlan),
            moldOrderActual: sanitizeDate(rawProject.moldOrderActual),
            moldDeliveryPlan: sanitizeDate(rawProject.moldDeliveryPlan),
            moldDeliveryActual: sanitizeDate(rawProject.moldDeliveryActual),
            istrSubmissionPlan: sanitizeDate(rawProject.istrSubmissionPlan),
            istrSubmissionActual: sanitizeDate(rawProject.istrSubmissionActual),
            ydcVnPpapPlan: sanitizeDate(rawProject.ydcVnPpapPlan),
            ydcVnPpapActual: sanitizeDate(rawProject.ydcVnPpapActual),
            ppapKrSubmissionPlan: sanitizeDate(rawProject.ppapKrSubmissionPlan),
            ppapKrSubmissionActual: sanitizeDate(rawProject.ppapKrSubmissionActual),
            ppapCustomerApprovalPlan: sanitizeDate(rawProject.ppapCustomerApprovalPlan),
            ppapCustomerApprovalActual: sanitizeDate(rawProject.ppapCustomerApprovalActual),
            ydcVnSopPlan: sanitizeDate(rawProject.ydcVnSopPlan),
            ydcVnSopActual: sanitizeDate(rawProject.ydcVnSopActual),
            customerSopPlan: sanitizeDate(rawProject.customerSopPlan),
            customerSopActual: sanitizeDate(rawProject.customerSopActual),
            deliverySchedulePlan: sanitizeDate(rawProject.deliverySchedulePlan),
            deliveryScheduleActual: sanitizeDate(rawProject.deliveryScheduleActual),
        };

        // Validate enum values
        const validStatuses = ['진행중', '완료', '대기'];
        const validTypes = ['신규 개발', '증작 금형'];
        if (!validStatuses.includes(project.status)) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
        }
        if (!validTypes.includes(project.type)) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: `Invalid type. Must be one of: ${validTypes.join(', ')}` });
        }

        const id = uuidv4();

        await client.query(
            `INSERT INTO projects (
                id, customer_name, car_model, part_name, part_number, mold_cavity, sop_date, status, type, material,
                fot_date, fai_date, p1_date, p2_date, run_at_rate_date, ppap_date, customer_sop_date,
                volume_2026, volume_2027, volume_2028, volume_2029, volume_2030, volume_2031, volume_2032,
                development_phase, feasibility_review_plan, feasibility_review_actual,
                mold_order_plan, mold_order_actual, mold_delivery_plan, mold_delivery_actual,
                istr_submission_plan, istr_submission_actual, ydc_vn_ppap_plan, ydc_vn_ppap_actual,
                ppap_kr_submission_plan, ppap_kr_submission_actual, ppap_customer_approval_plan, ppap_customer_approval_actual,
                ydc_vn_sop_plan, ydc_vn_sop_actual, customer_sop_plan, customer_sop_actual,
                delivery_schedule_plan, delivery_schedule_actual
            )
            VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                $11, $12, $13, $14, $15, $16, $17,
                $18, $19, $20, $21, $22, $23, $24,
                $25, $26, $27, $28, $29, $30, $31,
                $32, $33, $34, $35, $36, $37, $38, $39,
                $40, $41, $42, $43, $44, $45
            )`,
            [
                id, project.customerName, project.carModel, project.partName, project.partNumber, project.moldCavity, project.sopDate, project.status, project.type, project.material,
                project.fotDate, project.faiDate, project.p1Date, project.p2Date, project.runAtRateDate, project.ppapDate, project.customerSopDate,
                project.volume2026, project.volume2027, project.volume2028, project.volume2029, project.volume2030, project.volume2031, project.volume2032,
                project.developmentPhase, project.feasibilityReviewPlan, project.feasibilityReviewActual,
                project.moldOrderPlan, project.moldOrderActual, project.moldDeliveryPlan, project.moldDeliveryActual,
                project.istrSubmissionPlan, project.istrSubmissionActual, project.ydcVnPpapPlan, project.ydcVnPpapActual,
                project.ppapKrSubmissionPlan, project.ppapKrSubmissionActual, project.ppapCustomerApprovalPlan, project.ppapCustomerApprovalActual,
                project.ydcVnSopPlan, project.ydcVnSopActual, project.customerSopPlan, project.customerSopActual,
                project.deliverySchedulePlan, project.deliveryScheduleActual
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
        res.status(201).json(newProject);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('POST /projects error:', err);
        
        // Handle specific database errors
        if (err.code === '23502') { // NOT NULL violation
            const field = err.column || 'unknown';
            return res.status(400).json({ 
                error: `NOT NULL constraint violation`, 
                field,
                message: err.message 
            });
        }
        if (err.code === '23505') { // UNIQUE violation
            return res.status(409).json({ 
                error: 'Duplicate entry', 
                message: err.message 
            });
        }
        if (err.code === '23503') { // FOREIGN KEY violation
            return res.status(400).json({ 
                error: 'Foreign key constraint violation', 
                message: err.message 
            });
        }
        
        res.status(500).json({ 
            error: 'Internal server error',
            message: process.env.NODE_ENV === 'development' ? err.message : 'Failed to create project'
        });
    } finally {
        client.release();
    }
});

// Update project volumes only (PATCH endpoint)
router.patch('/:id/volumes', async (req, res) => {
    const { id } = req.params;
    const volumes = req.body;

    try {
        // Build dynamic UPDATE query for volume fields only
        const updateFields = [];
        const updateValues = [];
        let paramIndex = 1;

        const volumeFields = ['volume2026', 'volume2027', 'volume2028', 'volume2029', 'volume2030', 'volume2031', 'volume2032'];
        const dbFieldMap = {
            volume2026: 'volume_2026',
            volume2027: 'volume_2027',
            volume2028: 'volume_2028',
            volume2029: 'volume_2029',
            volume2030: 'volume_2030',
            volume2031: 'volume_2031',
            volume2032: 'volume_2032'
        };

        for (const field of volumeFields) {
            if (volumes[field] !== undefined) {
                updateFields.push(`${dbFieldMap[field]} = $${paramIndex}`);
                updateValues.push(volumes[field] || null);
                paramIndex++;
            }
        }

        if (updateFields.length === 0) {
            return res.status(400).json({ error: 'No volume fields to update' });
        }

        updateValues.push(id);
        const query = `UPDATE projects SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;

        const result = await pool.query(query, updateValues);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Project not found' });
        }

        const row = result.rows[0];
        const updatedProject = {
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
            customerSopDate: row.customer_sop_date,
            volume2026: row.volume_2026,
            volume2027: row.volume_2027,
            volume2028: row.volume_2028,
            volume2029: row.volume_2029,
            volume2030: row.volume_2030,
            volume2031: row.volume_2031,
            volume2032: row.volume_2032,
            developmentPhase: row.development_phase,
            feasibilityReviewPlan: row.feasibility_review_plan,
            feasibilityReviewActual: row.feasibility_review_actual,
            moldOrderPlan: row.mold_order_plan,
            moldOrderActual: row.mold_order_actual,
            moldDeliveryPlan: row.mold_delivery_plan,
            moldDeliveryActual: row.mold_delivery_actual,
            istrSubmissionPlan: row.istr_submission_plan,
            istrSubmissionActual: row.istr_submission_actual,
            ydcVnPpapPlan: row.ydc_vn_ppap_plan,
            ydcVnPpapActual: row.ydc_vn_ppap_actual,
            ppapKrSubmissionPlan: row.ppap_kr_submission_plan,
            ppapKrSubmissionActual: row.ppap_kr_submission_actual,
            ppapCustomerApprovalPlan: row.ppap_customer_approval_plan,
            ppapCustomerApprovalActual: row.ppap_customer_approval_actual,
            ydcVnSopPlan: row.ydc_vn_sop_plan,
            ydcVnSopActual: row.ydc_vn_sop_actual,
            customerSopPlan: row.customer_sop_plan,
            customerSopActual: row.customer_sop_actual,
            deliverySchedulePlan: row.delivery_schedule_plan,
            deliveryScheduleActual: row.delivery_schedule_actual
        };

        res.json(updatedProject);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete project
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // Check if project exists
        const checkResult = await client.query('SELECT * FROM projects WHERE id = $1', [id]);
        if (checkResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Project not found' });
        }

        // Delete related gates (CASCADE should handle this, but explicit delete for safety)
        await client.query('DELETE FROM gates WHERE project_id = $1', [id]);
        
        // Delete related issues (CASCADE should handle this, but explicit delete for safety)
        await client.query('DELETE FROM issues WHERE project_id = $1', [id]);
        
        // Delete project
        await client.query('DELETE FROM projects WHERE id = $1', [id]);
        
        await client.query('COMMIT');
        res.json({ message: 'Project deleted successfully' });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

module.exports = router;
