require('dotenv').config();

const express = require('express');
const freezeRoutes = require('./routes/freezeRoutes');
const staffDashboardRoutes = require('./routes/staffDashboardRoutes');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(express.json());
app.get('/health', (req, res) => res.json({ success: true, data: { status: 'ok' } }));
app.use('/api/accounts', freezeRoutes);
app.use('/api/staff', staffDashboardRoutes);
app.use(notFound);
app.use(errorHandler);

module.exports = app;