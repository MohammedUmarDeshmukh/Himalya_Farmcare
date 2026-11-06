import { Router } from 'express';
import {
  addSavedAddress,
  deleteSavedAddress,
  getMe,
  login,
  register,
  setDefaultSavedAddress,
  updateProfile,
  updateSavedAddress,
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);

// Farmer Profile & Saved Addresses Routes (Protected)
router.put('/profile', protect, updateProfile);
router.post('/addresses', protect, addSavedAddress);
router.put('/addresses/:addressId', protect, updateSavedAddress);
router.delete('/addresses/:addressId', protect, deleteSavedAddress);
router.patch('/addresses/:addressId/default', protect, setDefaultSavedAddress);

export default router;
