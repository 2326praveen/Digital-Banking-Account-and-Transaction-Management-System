const express = require('express');
const cors = require('cors');
const beneficiaryRoutes = require('./routes/beneficiaryRoutes');
const transferRoutes = require('./routes/transferRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/beneficiaries', beneficiaryRoutes);
app.use('/api/transactions', transferRoutes);

// 404 handler for undefined routes
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.originalUrl}`,
    errorCode: 'ROUTE_NOT_FOUND'
  });
});

// Centralized error handling middleware
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const errorCode = err.errorCode || (statusCode === 500 ? 'INTERNAL_SERVER_ERROR' : 'ERROR');
  const message = err.message || 'An unexpected error occurred';

  // Do not expose internal error details in production for 500 errors
  const response = {
    success: false,
    message,
    errorCode
  };

  if (process.env.NODE_ENV === 'development' && statusCode === 500) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
});

module.exports = app;
