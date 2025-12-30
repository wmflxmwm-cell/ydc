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
        // ID와 비밀번호를 문자열로 명시적 변환 및 공백 제거
        const cleanId = String(id || '').trim();
        const cleanPassword = String(password || '').trim();

        if (!cleanId || !cleanPassword) {
            return res.status(400).json({ message: '아이디와 비밀번호를 입력해주세요.' });
        }

        const result = await pool.query('SELECT * FROM users WHERE id = $1', [cleanId]);
        const user = result.rows[0];

        console.log('User lookup result:', { 
            found: !!user, 
            userId: user?.id, 
            userName: user?.name,
            storedPasswordLength: user?.password?.length,
            providedPasswordLength: cleanPassword.length
        });

        if (!user) {
            console.log('User not found in database:', cleanId);
            // 모든 사용자 ID 목록 조회 (디버깅용)
            const allUsers = await pool.query('SELECT id, name FROM users ORDER BY id LIMIT 20');
            console.log('Available user IDs (first 20):', allUsers.rows.map(r => ({ id: r.id, name: r.name })));
            return res.status(401).json({ 
                message: '존재하지 않는 사용자 ID입니다.',
                debug: 'User not found in database',
                searchedId: cleanId,
                availableUsers: allUsers.rows.map(r => r.id)
            });
        }

        // 비밀번호 비교 (문자열로 명시적 변환 후 비교)
        const storedPassword = String(user.password || '').trim();
        const providedPassword = cleanPassword;
        
        console.log('Password comparison:', {
            match: storedPassword === providedPassword,
            storedPasswordLength: storedPassword.length,
            providedPasswordLength: providedPassword.length,
            storedPasswordPreview: storedPassword.substring(0, 3) + '...',
            providedPasswordPreview: providedPassword.substring(0, 3) + '...'
        });

        if (storedPassword !== providedPassword) {
            console.log('Password mismatch for user:', cleanId);
            console.log('Stored password (first 3 chars):', storedPassword.substring(0, 3));
            console.log('Provided password (first 3 chars):', providedPassword.substring(0, 3));
            return res.status(401).json({ 
                message: '비밀번호가 일치하지 않습니다.',
                debug: 'Password mismatch',
                userId: cleanId
            });
        }

        // In production, use JWT. For now, simple response.
        console.log('Login successful for user:', cleanId);
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

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Check if user exists
        const check = await client.query('SELECT * FROM users WHERE id = $1', [id]);
        if (check.rows.length > 0) {
            await client.query('ROLLBACK');
            console.log('User already exists:', id);
            return res.status(400).json({ message: '이미 존재하는 사용자 ID입니다.' });
        }

        // Insert user (비밀번호 공백 제거, 문자열로 명시적 변환)
        const cleanPassword = String(password || '').trim();
        const cleanId = String(id).trim();
        const cleanName = String(name).trim();
        const cleanRole = String(role).trim();

        console.log('Inserting user with cleaned data:', {
            id: cleanId,
            name: cleanName,
            role: cleanRole,
            passwordLength: cleanPassword.length
        });

        await client.query(
            'INSERT INTO users (id, password, name, role) VALUES ($1, $2, $3, $4)',
            [cleanId, cleanPassword, cleanName, cleanRole]
        );

        // 트랜잭션 커밋
        await client.query('COMMIT');
        console.log('User inserted and committed to database:', cleanId);

        // 등록 후 실제로 저장되었는지 확인 (다른 연결에서 조회)
        const verify = await pool.query('SELECT * FROM users WHERE id = $1', [cleanId]);
        if (verify.rows.length === 0) {
            console.error('User registration verification failed:', cleanId);
            return res.status(500).json({ message: '사용자 등록은 완료되었지만 저장 확인에 실패했습니다.' });
        }

        const verifiedUser = verify.rows[0];
        console.log('User registration verified:', {
            id: verifiedUser.id,
            name: verifiedUser.name,
            role: verifiedUser.role,
            passwordStored: !!verifiedUser.password,
            passwordLength: verifiedUser.password?.length
        });

        // 등록 직후 로그인 테스트 (선택적)
        const testLogin = await pool.query('SELECT * FROM users WHERE id = $1 AND password = $2', [cleanId, cleanPassword]);
        if (testLogin.rows.length === 0) {
            console.warn('WARNING: User registered but login test failed:', cleanId);
        } else {
            console.log('Login test passed for newly registered user:', cleanId);
        }

        res.json({ 
            message: 'User registered successfully',
            user: {
                id: verifiedUser.id,
                name: verifiedUser.name,
                role: verifiedUser.role
            }
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('User registration error:', err);
        res.status(500).json({ 
            error: err.message,
            message: '사용자 등록 중 오류가 발생했습니다. 데이터베이스를 확인하세요.',
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    } finally {
        client.release();
    }
});

router.get('/users', async (req, res) => {
    try {
        // Check if requester is admin (from query param or header)
        const isAdmin = req.query.admin === 'true' || req.headers['x-admin'] === 'true';
        
        if (isAdmin) {
            // Admin can see passwords
            const result = await pool.query('SELECT id, name, role, password FROM users ORDER BY name');
            res.json(result.rows);
        } else {
            // Regular users cannot see passwords
            const result = await pool.query('SELECT id, name, role FROM users ORDER BY name');
            res.json(result.rows);
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete user
router.delete('/users/:id', async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // Check if user exists
        const checkResult = await client.query('SELECT * FROM users WHERE id = $1', [id]);
        if (checkResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'User not found' });
        }

        // Prevent deleting admin user
        if (checkResult.rows[0].role === 'MANAGER' && checkResult.rows[0].id === 'admin') {
            await client.query('ROLLBACK');
            return res.status(403).json({ error: 'Cannot delete admin user' });
        }

        // Delete user
        await client.query('DELETE FROM users WHERE id = $1', [id]);
        
        await client.query('COMMIT');
        res.json({ message: 'User deleted successfully' });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

module.exports = router;
