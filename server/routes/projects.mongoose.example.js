// Mongoose version - Example implementation
const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const Gate = require('../models/Gate');

router.post('/', async (req, res) => {
    try {
        const rawProject = req.body;

        // Validation: Required fields
        const requiredFields = ['customerName', 'partName', 'status', 'type', 'material', 'sopDate', 'carModel'];
        const missingFields = requiredFields.filter(field => !rawProject[field] || rawProject[field] === null);
        if (missingFields.length > 0) {
            return res.status(400).json({ 
                error: 'Missing required fields', 
                missingFields,
                received: Object.keys(rawProject)
            });
        }

        // Sanitize payload
        const sanitizeString = (val) => {
            if (val === null || val === undefined) return '';
            return String(val).trim();
        };

        const sanitizeDate = (val) => {
            if (!val || val === null || val === '') return undefined;
            const date = new Date(val);
            return isNaN(date.getTime()) ? undefined : date;
        };

        const sanitizeNumber = (val, defaultValue = null) => {
            if (val === null || val === undefined || val === '') return defaultValue;
            const num = Number(val);
            return isNaN(num) ? defaultValue : num;
        };

        const sanitizeObjectId = (val) => {
            if (!val || val === null || val === '') return undefined;
            // If it's already ObjectId, return as is
            if (val.constructor.name === 'ObjectId') return val;
            // If it's a valid ObjectId string, convert
            if (typeof val === 'string' && /^[0-9a-fA-F]{24}$/.test(val)) {
                return require('mongoose').Types.ObjectId(val);
            }
            return undefined;
        };

        const projectData = {
            customerName: sanitizeString(rawProject.customerName),
            partName: sanitizeString(rawProject.partName),
            partNumber: sanitizeString(rawProject.partNumber || ''),
            carModel: sanitizeString(rawProject.carModel || ''),
            moldCavity: sanitizeNumber(rawProject.moldCavity, 2),
            sopDate: sanitizeDate(rawProject.sopDate),
            status: sanitizeString(rawProject.status),
            type: sanitizeString(rawProject.type),
            material: sanitizeObjectId(rawProject.material) || sanitizeString(rawProject.material), // Handle ObjectId ref or string
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
        if (!validStatuses.includes(projectData.status)) {
            return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
        }
        if (!validTypes.includes(projectData.type)) {
            return res.status(400).json({ error: `Invalid type. Must be one of: ${validTypes.join(', ')}` });
        }

        // Create project with validation
        const project = new Project(projectData);
        await project.validate(); // Trigger Mongoose validation

        // Save project
        const savedProject = await project.save();

        // Create initial gates
        const gates = [];
        for (let i = 1; i <= 5; i++) {
            gates.push({
                projectId: savedProject._id,
                phaseNumber: i,
                status: i === 1 ? '진행중' : '잠금'
            });
        }
        await Gate.insertMany(gates);

        res.status(201).json(savedProject);
    } catch (err) {
        console.error('POST /projects error:', err);
        
        // Handle Mongoose validation errors
        if (err.name === 'ValidationError') {
            const errors = Object.values(err.errors).map(e => ({
                field: e.path,
                message: e.message
            }));
            return res.status(400).json({ 
                error: 'Validation failed', 
                errors 
            });
        }
        
        // Handle duplicate key errors
        if (err.code === 11000) {
            return res.status(409).json({ 
                error: 'Duplicate entry', 
                field: Object.keys(err.keyPattern)[0],
                message: err.message 
            });
        }
        
        // Handle cast errors (invalid ObjectId, etc.)
        if (err.name === 'CastError') {
            return res.status(400).json({ 
                error: 'Invalid data type', 
                field: err.path,
                message: err.message 
            });
        }
        
        res.status(500).json({ 
            error: 'Internal server error',
            message: process.env.NODE_ENV === 'development' ? err.message : 'Failed to create project'
        });
    }
});

module.exports = router;

