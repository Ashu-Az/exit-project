import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import passport from './config/passport.js';
import { connectRedis } from './utils/redisClient.js';
import authRoutes from './routes/authRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

// Connect Bun Redis
connectRedis().then(() => {
  console.log('✅ Bun Redis initialized successfully');
}).catch((error) => {
  console.warn('⚠️ Bun Redis initialization failed:', error.message);
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));

// Initialize Passport - Clean fix for TypeScript error
app.use(passport.initialize() as unknown as express.RequestHandler);

// Routes
app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'OK', 
    service: 'auth-service',
    redis: 'bun-in-memory',
    timestamp: new Date().toISOString()
  });
});

app.use('/api/auth', authRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// Error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

app.listen(PORT, () => {
  console.log(`🔐 Auth Service running on port ${PORT} with Bun Redis`);
});