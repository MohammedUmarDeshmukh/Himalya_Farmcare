import { Router } from 'express';
import {
  adminUpdateOrderStatus,
  cancelMyOrder,
  createOrder,
  exportAdminOrdersCSV,
  getAdminOrders,
  getMyOrders,
  getOrderById,
} from '../controllers/orderController.js';
import { authorize, protect } from '../middleware/authMiddleware.js';

const router = Router();

// Admin Order Management Routes (Protected + Admin Role Authorization)
// Note: Must be placed before /:id routes so /admin/* doesn't get captured by :id
router.get('/admin/all', protect, authorize('admin'), getAdminOrders);
router.get('/admin/export', protect, authorize('admin'), exportAdminOrdersCSV);
router.patch('/:id/status', protect, authorize('admin'), adminUpdateOrderStatus);

// Farmer & Customer Order Routes (All protected by JWT auth)
router.post('/', protect, createOrder);
router.get('/my-orders', protect, getMyOrders);
router.get('/:id', protect, getOrderById);
router.patch('/:id/cancel', protect, cancelMyOrder);

export default router;
