import { Router } from 'express';
import { createApplicationMethod, deleteApplicationMethod, getApplicationMethodById, getApplicationMethods, updateApplicationMethod } from '../controllers/applicationMethodController.js';
import { authorize, protect } from '../middleware/authMiddleware.js';

const router = Router();

router.route('/')
  .get(getApplicationMethods)
  .post(protect, authorize('admin'), createApplicationMethod);

router.route('/:id')
  .get(getApplicationMethodById)
  .put(protect, authorize('admin'), updateApplicationMethod)
  .delete(protect, authorize('admin'), deleteApplicationMethod);

export default router;
