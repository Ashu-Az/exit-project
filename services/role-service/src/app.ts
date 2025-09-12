import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
// @ts-ignore
import roleRoutes from './routes/roleRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3004;

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/exit_interview_platform')
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ MongoDB connection failed:', err));

app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'role-service' });
});

app.use('/api/roles', roleRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`🛡️ Role Service running on port ${PORT}`);
});