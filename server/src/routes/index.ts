import { Router } from 'express';
import healthRoutes from './healthRoutes';

const router = Router();

// Health check endpoint
router.use('/health', healthRoutes);

export default router;
