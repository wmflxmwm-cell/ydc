const express = require('express');
const { pool } = require('../db');
const router = express.Router();

router.post('/login', async (req, res) => {
    const { id, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
        const user = result.rows[0];

        if (user && user.password === password) {
            // In production, use JWT. For now, simple response.
            res.json({
                token: 'dummy-token',
                user: {
                    id: user.id,
                    name: user.name,
                    role: user.role
                }
            });
        } else {
            res.status(401).json({ message: 'Invalid credentials' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/register', async (req, res) => {
    const { id, password, name, role } = req.body;
    try {
        // Check if user exists
        const check = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
        if (check.rows.length > 0) {
            return res.status(400).json({ message: 'User already exists' });
        }

        await pool.query(
            'INSERT INTO users (id, password, name, role) VALUES ($1, $2, $3, $4)',
            [id, password, name, role]
        );

        res.json({ message: 'User registered successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/users', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, name, role FROM users ORDER BY name');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
