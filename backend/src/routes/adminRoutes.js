import { Router } from 'express';
import { getAdminStats, getUsers, updateUserStatus } from '../controllers/adminController.js';
import { authorize, protect } from '../middleware/authMiddleware.js';

const router = Router();

// Protect all admin routes with authentication and admin role verification
router.use(protect, authorize('admin'));

router.get('/stats', getAdminStats);
router.get('/users', getUsers);
router.patch('/users/:id/status', updateUserStatus);

export default router;
