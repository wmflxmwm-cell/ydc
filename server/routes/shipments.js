const express = require('express');
const { pool } = require('../db');
const router = express.Router();

// 출하현황: 모든 사용자가 조회 및 업로드 가능 (권한 체크 없음)
// Get all shipments - 모든 사용자 접근 가능
router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM shipments ORDER BY shipment_date DESC, created_at DESC');
        const shipments = result.rows.map(row => ({
            id: row.id,
            shipmentDate: row.shipment_date,
            customerName: row.customer_name,
            partNumber: row.part_number,
            partName: row.part_name,
            quantity: row.quantity,
            shippingMethod: row.shipping_method || '해운',
            remarks: row.remarks || '',
            createdAt: row.created_at
        }));
        res.json(shipments);
    } catch (err) {
        console.error('Error fetching shipments:', err);
        res.status(500).json({ error: err.message });
    }
});

// Create a new shipment - 모든 사용자 업로드 가능 (권한 체크 없음)
router.post('/', async (req, res) => {
    const { shipmentDate, customerName, partNumber, partName, quantity, shippingMethod, remarks } = req.body;
    
    if (!shipmentDate || !customerName || !partNumber || !partName) {
        return res.status(400).json({ error: '필수 필드를 모두 입력하세요.' });
    }

    try {
        const id = `shipment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        await pool.query(
            `INSERT INTO shipments (id, shipment_date, customer_name, part_number, part_name, quantity, shipping_method, remarks)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [id, shipmentDate, customerName, partNumber, partName, quantity || '', shippingMethod || '해운', remarks || '']
        );

        res.json({ 
            id, 
            shipmentDate, 
            customerName, 
            partNumber, 
            partName, 
            quantity: quantity || '', 
            shippingMethod: shippingMethod || '해운', 
            remarks: remarks || '',
            createdAt: new Date().toISOString()
        });
    } catch (err) {
        console.error('Error creating shipment:', err);
        res.status(500).json({ error: err.message });
    }
});

// Delete a shipment
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM shipments WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting shipment:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

