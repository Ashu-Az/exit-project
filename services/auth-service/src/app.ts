import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import passport from './config/passport';
import { connectRedis } from './utils/redis';
// @ts-ignore
import authRoutes from './routes/authRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

// Connect Redis with error handling
connectRedis().catch((error) => {
  console.warn('⚠️  Redis connection failed:', error.message);
  console.warn('Auth service will continue without Redis (blocking features disabled)');
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));

// Initialize Passport
app.use(passport.initialize());

// Routes
app.get('/health', (req: express.Request, res: express.Response) => {
  res.json({ 
    status: 'OK', 
    service: 'auth-service',
    timestamp: new Date().toISOString()
  });
});

app.use('/api/auth', authRoutes);

// 404 handler
app.use((req: express.Request, res: express.Response) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

app.listen(PORT, () => {
  console.log(`🔐 Auth Service running on port ${PORT}`);
});