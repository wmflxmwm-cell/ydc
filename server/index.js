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
app.use(cors()); // Allow all origins for now, or configure for production
app.use(express.json());

// Routes
app.use('/auth', authRoutes);
app.use('/projects', projectRoutes);
app.use('/gates', gateRoutes);
app.use('/issues', issueRoutes);

// Health check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

// Initialize DB and start server
initDb().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
});
