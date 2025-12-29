const express = require('express');
const cors = require('cors');
const { initDb } = require('./db');
const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const gateRoutes = require('./routes/gates');
const issueRoutes = require('./routes/issues');

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
// CORS 설정: 환경 변수로 허용된 origin을 관리하거나, 모든 Render 도메인 허용
const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',')
    : [
        'https://ydc-408r.onrender.com',
        'https://wmflxmwm-cell-ydc.onrender.com',
        'http://localhost:5173',
        'http://localhost:4173',
        'http://localhost:3000'
    ];

app.use(cors({
    origin: function (origin, callback) {
        // origin이 없는 경우 (같은 도메인 요청 등) 허용
        if (!origin) return callback(null, true);
        
        // Render 도메인 패턴 허용
        if (origin.includes('.onrender.com')) {
            return callback(null, true);
        }
        
        // 명시적으로 허용된 origin 확인
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        
        // CORS 오류 시 false 반환 (에러 throw 대신)
        callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    preflightContinue: false,
    optionsSuccessStatus: 204
}));
app.use(express.json());

// Routes
app.use('/auth', authRoutes);
app.use('/projects', projectRoutes);
app.use('/gates', gateRoutes);
app.use('/issues', issueRoutes);

// Health check
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Favicon handler (빈 응답 반환)
app.get('/favicon.ico', (req, res) => {
    res.status(204).end();
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({ 
        message: 'Die-casting APQP Manager API Server',
        version: '1.0.0',
        endpoints: ['/auth', '/projects', '/gates', '/issues', '/health']
    });
});

// Initialize DB and start server
initDb().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
});
