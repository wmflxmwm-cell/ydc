const express = require('express');
const { pool } = require('../db');
const router = express.Router();

router.post('/login', async (req, res) => {
    const { id, password } = req.body;
    
    console.log('Login attempt:', { id, passwordLength: password?.length });
    
    if (!id || !password) {
        return res.status(400).json({ message: '아이디와 비밀번호를 입력해주세요.' });
    }

    try {
        const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
        const user = result.rows[0];

        console.log('User lookup result:', { 
            found: !!user, 
            userId: user?.id, 
            userName: user?.name,
            storedPasswordLength: user?.password?.length,
            providedPasswordLength: password?.length
        });

        if (!user) {
            console.log('User not found in database:', id);
            return res.status(401).json({ 
                message: '존재하지 않는 사용자 ID입니다.',
                debug: 'User not found in database'
            });
        }

        // 비밀번호 비교 (공백 제거 후 비교)
        const storedPassword = (user.password || '').trim();
        const providedPassword = (password || '').trim();
        
        console.log('Password comparison:', {
            match: storedPassword === providedPassword,
            storedPasswordLength: storedPassword.length,
            providedPasswordLength: providedPassword.length
        });

        if (storedPassword !== providedPassword) {
            console.log('Password mismatch for user:', id);
            return res.status(401).json({ 
                message: '비밀번호가 일치하지 않습니다.',
                debug: 'Password mismatch'
            });
        }

        // In production, use JWT. For now, simple response.
        console.log('Login successful for user:', id);
        res.json({
            token: 'dummy-token',
            user: {
                id: user.id,
                name: user.name,
                role: user.role
            }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ 
            error: err.message,
            message: '로그인 중 오류가 발생했습니다.',
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
});

router.post('/register', async (req, res) => {
    const { id, password, name, role } = req.body;
    
    console.log('Registration attempt:', { id, name, role, passwordLength: password?.length });
    
    // 입력 검증
    if (!id || !password || !name || !role) {
        return res.status(400).json({ message: '모든 필드를 입력해주세요.' });
    }

    try {
        // Check if user exists
        const check = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
        if (check.rows.length > 0) {
            console.log('User already exists:', id);
            return res.status(400).json({ message: '이미 존재하는 사용자 ID입니다.' });
        }

        // Insert user (비밀번호 공백 제거)
        const cleanPassword = (password || '').trim();
        await pool.query(
            'INSERT INTO users (id, password, name, role) VALUES ($1, $2, $3, $4)',
            [id, cleanPassword, name, role]
        );

        console.log('User inserted into database:', id);

        // 등록 후 실제로 저장되었는지 확인
        const verify = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
        if (verify.rows.length === 0) {
            console.error('User registration verification failed:', id);
            return res.status(500).json({ message: '사용자 등록은 완료되었지만 저장 확인에 실패했습니다.' });
        }

        console.log('User registration verified:', {
            id: verify.rows[0].id,
            name: verify.rows[0].name,
            role: verify.rows[0].role,
            passwordStored: !!verify.rows[0].password
        });

        res.json({ 
            message: 'User registered successfully',
            user: {
                id: verify.rows[0].id,
                name: verify.rows[0].name,
                role: verify.rows[0].role
            }
        });
    } catch (err) {
        console.error('User registration error:', err);
        res.status(500).json({ 
            error: err.message,
            message: '사용자 등록 중 오류가 발생했습니다. 데이터베이스를 확인하세요.',
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
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
