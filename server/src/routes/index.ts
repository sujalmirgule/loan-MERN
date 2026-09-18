import { Router } from 'express';
import healthRoutes from './healthRoutes';
import authRoutes from './authRoutes';
import customerRoutes from './customerRoutes';
import adminRoutes from './adminRoutes';
import { authLimiter } from '../middleware/rateLimiter';

const router = Router();

// Health check endpoint
router.use('/health', healthRoutes);

// Authentication endpoints with strict rate limiting
router.use('/auth', authLimiter, authRoutes);

// Protected Customer endpoints (supporting both singular and plural)
router.use('/customer', customerRoutes);
router.use('/customers', customerRoutes);

// Protected Admin endpoints
router.use('/admin', adminRoutes);

export default router;
