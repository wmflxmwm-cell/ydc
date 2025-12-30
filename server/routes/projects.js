const express = require('express');
const { pool } = require('../db');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

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
        const project = req.body;
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
                id, project.customerName, project.carModel, project.partName, project.partNumber, project.moldCavity, project.sopDate || null, project.status, project.type, project.material,
                project.fotDate || null, project.faiDate || null, project.p1Date || null, project.p2Date || null, project.runAtRateDate || null, project.ppapDate || null, project.customerSopDate || null,
                project.volume2026 || null, project.volume2027 || null, project.volume2028 || null, project.volume2029 || null, project.volume2030 || null, project.volume2031 || null, project.volume2032 || null,
                project.developmentPhase || null, project.feasibilityReviewPlan || null, project.feasibilityReviewActual || null,
                project.moldOrderPlan || null, project.moldOrderActual || null, project.moldDeliveryPlan || null, project.moldDeliveryActual || null,
                project.istrSubmissionPlan || null, project.istrSubmissionActual || null, project.ydcVnPpapPlan || null, project.ydcVnPpapActual || null,
                project.ppapKrSubmissionPlan || null, project.ppapKrSubmissionActual || null, project.ppapCustomerApprovalPlan || null, project.ppapCustomerApprovalActual || null,
                project.ydcVnSopPlan || null, project.ydcVnSopActual || null, project.customerSopPlan || null, project.customerSopActual || null,
                project.deliverySchedulePlan || null, project.deliveryScheduleActual || null
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
