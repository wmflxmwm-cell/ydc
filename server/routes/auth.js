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

module.exports = router;
