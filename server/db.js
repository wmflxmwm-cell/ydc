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

        // Add new columns if they don't exist (for existing databases)
        const alterQueries = [
            'ALTER TABLE projects ADD COLUMN IF NOT EXISTS sop_date DATE',
            'ALTER TABLE projects ADD COLUMN IF NOT EXISTS fot_date DATE',
            'ALTER TABLE projects ADD COLUMN IF NOT EXISTS fai_date DATE',
            'ALTER TABLE projects ADD COLUMN IF NOT EXISTS p1_date DATE',
            'ALTER TABLE projects ADD COLUMN IF NOT EXISTS p2_date DATE',
            'ALTER TABLE projects ADD COLUMN IF NOT EXISTS run_at_rate_date DATE',
            'ALTER TABLE projects ADD COLUMN IF NOT EXISTS ppap_date DATE',
            'ALTER TABLE projects ADD COLUMN IF NOT EXISTS customer_sop_date DATE',
            'ALTER TABLE projects ADD COLUMN IF NOT EXISTS volume_2026 INTEGER',
            'ALTER TABLE projects ADD COLUMN IF NOT EXISTS volume_2027 INTEGER',
            'ALTER TABLE projects ADD COLUMN IF NOT EXISTS volume_2028 INTEGER',
            'ALTER TABLE projects ADD COLUMN IF NOT EXISTS volume_2029 INTEGER',
            'ALTER TABLE projects ADD COLUMN IF NOT EXISTS volume_2030 INTEGER',
            'ALTER TABLE projects ADD COLUMN IF NOT EXISTS volume_2031 INTEGER',
            'ALTER TABLE projects ADD COLUMN IF NOT EXISTS volume_2032 INTEGER',
            'ALTER TABLE projects ADD COLUMN IF NOT EXISTS development_phase VARCHAR(50)',
            'ALTER TABLE projects ADD COLUMN IF NOT EXISTS feasibility_review_plan DATE',
            'ALTER TABLE projects ADD COLUMN IF NOT EXISTS feasibility_review_actual DATE',
            'ALTER TABLE projects ADD COLUMN IF NOT EXISTS mold_order_plan DATE',
            'ALTER TABLE projects ADD COLUMN IF NOT EXISTS mold_order_actual DATE',
            'ALTER TABLE projects ADD COLUMN IF NOT EXISTS mold_delivery_plan DATE',
            'ALTER TABLE projects ADD COLUMN IF NOT EXISTS mold_delivery_actual DATE',
            'ALTER TABLE projects ADD COLUMN IF NOT EXISTS istr_submission_plan DATE',
            'ALTER TABLE projects ADD COLUMN IF NOT EXISTS istr_submission_actual DATE',
            'ALTER TABLE projects ADD COLUMN IF NOT EXISTS ydc_vn_ppap_plan DATE',
            'ALTER TABLE projects ADD COLUMN IF NOT EXISTS ydc_vn_ppap_actual DATE',
            'ALTER TABLE projects ADD COLUMN IF NOT EXISTS ppap_kr_submission_plan DATE',
            'ALTER TABLE projects ADD COLUMN IF NOT EXISTS ppap_kr_submission_actual DATE',
            'ALTER TABLE projects ADD COLUMN IF NOT EXISTS ppap_customer_approval_plan DATE',
            'ALTER TABLE projects ADD COLUMN IF NOT EXISTS ppap_customer_approval_actual DATE',
            'ALTER TABLE projects ADD COLUMN IF NOT EXISTS ydc_vn_sop_plan DATE',
            'ALTER TABLE projects ADD COLUMN IF NOT EXISTS ydc_vn_sop_actual DATE',
            'ALTER TABLE projects ADD COLUMN IF NOT EXISTS customer_sop_plan DATE',
            'ALTER TABLE projects ADD COLUMN IF NOT EXISTS customer_sop_actual DATE',
            'ALTER TABLE projects ADD COLUMN IF NOT EXISTS delivery_schedule_plan DATE',
            'ALTER TABLE projects ADD COLUMN IF NOT EXISTS delivery_schedule_actual DATE'
        ];

        for (const query of alterQueries) {
            try {
                await client.query(query);
            } catch (err) {
                // Ignore errors for columns that already exist
                if (!err.message.includes('already exists') && !err.message.includes('duplicate')) {
                    console.warn('Alter table warning:', err.message);
                }
            }
        }

        // Seed initial admin user if not exists
        const userRes = await client.query('SELECT * FROM users WHERE id = $1', ['admin']);
        if (userRes.rows.length === 0) {
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
