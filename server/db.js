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
        sop_date DATE NOT NULL,
        status VARCHAR(50) NOT NULL,
        type VARCHAR(50) NOT NULL,
        material VARCHAR(50) NOT NULL,
        created_at DATE NOT NULL DEFAULT CURRENT_DATE
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

        // Seed initial settings data
        const customerCheck = await client.query('SELECT * FROM settings_customers');
        if (customerCheck.rows.length === 0) {
            await client.query(`
                INSERT INTO settings_customers (id, name) VALUES
                ('customer-1', '현대자동차'),
                ('customer-2', '기아'),
                ('customer-3', '현대모비스'),
                ('customer-4', 'BMW'),
                ('customer-5', '테슬라')
            `);
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
