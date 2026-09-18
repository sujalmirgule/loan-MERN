import { Router, Request, Response } from 'express';
import { authenticate, requireCustomer } from '../middleware/authMiddleware';
import { authService } from '../services/authService';

const router = Router();

// Apply customer authentication & authorization to all customer endpoints
router.use(authenticate, requireCustomer);

// GET /api/customers/profile
router.get('/profile', async (req: Request, res: Response, next) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated' });
      return;
    }
    const profile = await authService.getCurrentUser(req.user.id, 'CUSTOMER');
    res.status(200).json({ success: true, data: { profile } });
  } catch (error) {
    next(error);
  }
});

export default router;
