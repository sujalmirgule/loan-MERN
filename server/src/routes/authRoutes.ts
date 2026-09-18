import { Router } from 'express';
import { authController } from '../controllers/authController';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

// Public Authentication Endpoints
router.post('/customer/register', authController.registerCustomer);
router.post('/customer/login', authController.loginCustomer);
router.post('/admin/login', authController.loginAdmin);

// Protected Session Endpoints
router.get('/me', authenticate, authController.getCurrentUser);
router.post('/logout', authenticate, authController.logout);

export default router;
