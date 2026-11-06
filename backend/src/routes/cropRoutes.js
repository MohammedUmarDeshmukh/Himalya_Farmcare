import { Router } from 'express';
import { createCrop, deleteCrop, getCropById, getCrops, updateCrop } from '../controllers/cropController.js';
import { authorize, protect } from '../middleware/authMiddleware.js';

const router = Router();

router.route('/')
  .get(getCrops)
  .post(protect, authorize('admin'), createCrop);

router.route('/:id')
  .get(getCropById)
  .put(protect, authorize('admin'), updateCrop)
  .delete(protect, authorize('admin'), deleteCrop);

export default router;
