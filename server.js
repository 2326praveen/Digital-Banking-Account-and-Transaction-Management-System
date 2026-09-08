require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDatabase = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const accountRoutes = require('./routes/accountRoutes');
const staffRoutes = require('./routes/staffRoutes');
const beneficiaryRoutes = require('./routes/beneficiaryRoutes');
const transferRoutes = require('./routes/transferRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/health', (req, res) => res.json({ success: true, message: 'Service is healthy', data: { service: 'digital-banking' } }));
app.use('/api', authRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/beneficiaries', beneficiaryRoutes);
app.use('/api/transactions', transferRoutes);
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found', errorCode: 'NOT_FOUND' }));
app.use(errorHandler);

async function startServer() {
  if (!process.env.MONGO_URI || !process.env.JWT_SECRET) throw new Error('MONGO_URI and JWT_SECRET must be configured');
  await connectDatabase();
  const port = process.env.PORT || 5000;
  app.listen(port, () => console.log(`Server running on port ${port}`));
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

module.exports = { app, startServer };