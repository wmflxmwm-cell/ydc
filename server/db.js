const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const initDb = async () => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Users Table
        await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL
      );
    `);

        // Projects Table
        await client.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id VARCHAR(50) PRIMARY KEY,
        customer_name VARCHAR(100) NOT NULL,
        car_model VARCHAR(100) NOT NULL,
        part_name VARCHAR(100) NOT NULL,
        part_number VARCHAR(100) NOT NULL,
        mold_cavity INTEGER NOT NULL,
        sop_date DATE,
        status VARCHAR(50) NOT NULL,
        type VARCHAR(50) NOT NULL,
        material VARCHAR(50) NOT NULL,
        created_at DATE NOT NULL DEFAULT CURRENT_DATE,
        fot_date DATE,
        fai_date DATE,
        p1_date DATE,
        p2_date DATE,
        run_at_rate_date DATE,
        ppap_date DATE,
        customer_sop_date DATE
      );
    `);

        // Gates Table
        await client.query(`
      CREATE TABLE IF NOT EXISTS gates (
        id VARCHAR(50) PRIMARY KEY,
        project_id VARCHAR(50) REFERENCES projects(id) ON DELETE CASCADE,
        phase_number INTEGER NOT NULL,
        status VARCHAR(50) NOT NULL,
        approval_date DATE,
        flow_analysis_result BOOLEAN,
        try_out_count INTEGER,
        try_out_result TEXT
      );
    `);

        // Issues Table
        await client.query(`
      CREATE TABLE IF NOT EXISTS issues (
        id VARCHAR(50) PRIMARY KEY,
        project_id VARCHAR(50) REFERENCES projects(id) ON DELETE CASCADE,
        phase INTEGER NOT NULL,
        issue_type VARCHAR(50) NOT NULL,
        description TEXT NOT NULL,
        action_plan TEXT NOT NULL,
        is_resolved BOOLEAN DEFAULT FALSE
      );
    `);

        // Settings: Customers Table
        await client.query(`
      CREATE TABLE IF NOT EXISTS settings_customers (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

        // Settings: Materials Table
        await client.query(`
      CREATE TABLE IF NOT EXISTS settings_materials (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        code VARCHAR(50) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

        // Settings: Post-processings Table
        await client.query(`
      CREATE TABLE IF NOT EXISTS settings_postprocessings (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

        // Seed initial settings data - 업데이트된 고객사 목록
        const customerCheck = await client.query('SELECT * FROM settings_customers');
        const expectedCustomers = [
            'YURA', 'Yura Corporation', 'MHE', 'Myunghwa', 'Dongbo', 'Kyungshin',
            'Continental', 'Tyco', 'Hyundai Kefico', 'SCHAEFFLER', 'OTO', 'FLC_Partron',
            'SK ON', 'LG Innotek', 'Daeyoung', 'Jukwang', 'Harman', 'Youngjin Mobility', 'Yu sung Electronics'
        ];
        
        // 기존 고객사가 없거나, 예상 목록과 다르면 업데이트
        if (customerCheck.rows.length === 0) {
            // 새로 추가
            for (let i = 0; i < expectedCustomers.length; i++) {
                await client.query(
                    'INSERT INTO settings_customers (id, name) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING',
                    [`customer-${i + 1}`, expectedCustomers[i]]
                );
            }
            console.log('Initial customers seeded');
        } else {
            // 기존 고객사가 있으면 누락된 것만 추가
            const existingNames = customerCheck.rows.map(row => row.name);
            for (let i = 0; i < expectedCustomers.length; i++) {
                if (!existingNames.includes(expectedCustomers[i])) {
                    await client.query(
                        'INSERT INTO settings_customers (id, name) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING',
                        [`customer-${Date.now()}-${i}`, expectedCustomers[i]]
                    );
                }
            }
        }

        const materialCheck = await client.query('SELECT * FROM settings_materials');
        if (materialCheck.rows.length === 0) {
            await client.query(`
                INSERT INTO settings_materials (id, name, code) VALUES
                ('material-1', 'ALDC 12 (일반 주조용)', 'ALDC12'),
                ('material-2', 'ALDC 10 (내식성 우수)', 'ALDC10'),
                ('material-3', 'High-Vac용 특수 합금', 'ALSi10MnMg'),
                ('material-4', '마그네슘 합금 AZ91D', 'MG-AZ91D')
            `);
        }

        const postprocessingCheck = await client.query('SELECT * FROM settings_postprocessings');
        if (postprocessingCheck.rows.length === 0) {
            await client.query(`
                INSERT INTO settings_postprocessings (id, name, description) VALUES
                ('post-1', 'T6 열처리', '인공시효 열처리'),
                ('post-2', 'T5 열처리', '자연시효 열처리'),
                ('post-3', '표면처리 (알로다이징)', '부식 방지 표면 처리'),
                ('post-4', '도장', '프라이머 및 도료 도장'),
                ('post-5', '기계가공', '밀링, 선반 등 기계 가공')
            `);
        }

        // Seed initial admin user if not exists
        const userRes = await client.query('SELECT * FROM users WHERE id = $1', ['admin']);
        if (userRes.rows.length === 0) {
            // Password should be hashed in production, but for now plain text as per request context simplicity
            // Or we can implement simple hashing later.
            await client.query(`
        INSERT INTO users (id, name, password, role)
        VALUES ('admin', '관리자', 'admin123', 'MANAGER')
      `);
            console.log('Admin user created');
        } else {
            // 기존 admin 사용자의 역할을 MANAGER로 업데이트
            await client.query(`
        UPDATE users SET role = 'MANAGER' WHERE id = 'admin' AND role != 'MANAGER'
      `);
        }

        await client.query('COMMIT');
        console.log('Database initialized successfully');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Database initialization failed:', e);
    } finally {
        client.release();
    }
};

module.exports = { pool, initDb };
