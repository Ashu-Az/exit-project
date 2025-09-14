import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
// @ts-ignore
import roleRoutes from './routes/roleRoutes.js';
import { roleService } from './services/roleServices.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3004;

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/exit_interview_platform')
  .then(async () => {
    console.log('✅ MongoDB Connected to Role Service');
    // Create default roles if they don't exist
    try {
      await roleService.createDefaultRoles();
    } catch (error) {
      console.warn('Could not create default roles:', (error as Error).message);
    }
  })
  .catch(err => console.error('❌ MongoDB connection failed:', err));

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// Routes
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'role-service',
    timestamp: new Date().toISOString()
  });
});

app.use('/api/roles', roleRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Role Service Error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

app.listen(PORT, () => {
  console.log(`🛡️ Role Service running on port ${PORT}`);
});