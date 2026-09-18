import { Router, Request, Response } from 'express';
import { authenticate, requireAdmin } from '../middleware/authMiddleware';

const router = Router();

// Apply admin authentication & authorization to all admin endpoints
router.use(authenticate, requireAdmin);

// GET /api/admin/status
router.get('/status', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Admin console authenticated',
    admin: req.user,
  });
});

export default router;
