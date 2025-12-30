const express = require('express');
const { pool } = require('../db');
const router = express.Router();

// 고객사 목록 조회
router.get('/customers', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM settings_customers ORDER BY name ASC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 고객사 추가
router.post('/customers', async (req, res) => {
    const { name } = req.body;
    try {
        // 중복 확인
        const check = await pool.query('SELECT * FROM settings_customers WHERE name = $1', [name]);
        if (check.rows.length > 0) {
            return res.status(400).json({ message: '이미 존재하는 고객사명입니다.' });
        }

        const result = await pool.query(
            'INSERT INTO settings_customers (id, name) VALUES ($1, $2) RETURNING *',
            [`customer-${Date.now()}`, name]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 고객사 삭제
router.delete('/customers/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM settings_customers WHERE id = $1', [req.params.id]);
        res.json({ message: '고객사가 삭제되었습니다.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 재질 목록 조회
router.get('/materials', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM settings_materials ORDER BY name ASC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 재질 추가
router.post('/materials', async (req, res) => {
    const { name, code } = req.body;
    try {
        // 중복 확인
        const check = await pool.query('SELECT * FROM settings_materials WHERE code = $1', [code]);
        if (check.rows.length > 0) {
            return res.status(400).json({ message: '이미 존재하는 재질 코드입니다.' });
        }

        const result = await pool.query(
            'INSERT INTO settings_materials (id, name, code) VALUES ($1, $2, $3) RETURNING *',
            [`material-${Date.now()}`, name, code]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 재질 삭제
router.delete('/materials/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM settings_materials WHERE id = $1', [req.params.id]);
        res.json({ message: '재질이 삭제되었습니다.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 후공정 목록 조회
router.get('/postprocessings', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM settings_postprocessings ORDER BY name ASC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 후공정 추가
router.post('/postprocessings', async (req, res) => {
    const { name, description } = req.body;
    try {
        // 중복 확인
        const check = await pool.query('SELECT * FROM settings_postprocessings WHERE name = $1', [name]);
        if (check.rows.length > 0) {
            return res.status(400).json({ message: '이미 존재하는 후공정명입니다.' });
        }

        const result = await pool.query(
            'INSERT INTO settings_postprocessings (id, name, description) VALUES ($1, $2, $3) RETURNING *',
            [`post-${Date.now()}`, name, description || '']
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 후공정 삭제
router.delete('/postprocessings/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM settings_postprocessings WHERE id = $1', [req.params.id]);
        res.json({ message: '후공정이 삭제되었습니다.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

