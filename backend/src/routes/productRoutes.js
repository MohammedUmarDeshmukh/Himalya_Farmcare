import { Router } from 'express';
import {
  createProduct,
  deleteProduct,
  getProductById,
  getProducts,
  removeProductImage,
  replaceProductImage,
  updateProduct,
  uploadProductImage,
} from '../controllers/productController.js';
import { authorize, protect } from '../middleware/authMiddleware.js';
import { handleProductImageUpload } from '../middleware/uploadMiddleware.js';

const router = Router();

// General admin image upload endpoint for new/draft products
router.post(
  '/upload-image',
  protect,
  authorize('admin'),
  handleProductImageUpload,
  uploadProductImage,
);

router.route('/')
  .get(getProducts)
  .post(protect, authorize('admin'), createProduct);

// Product image replacement and deletion endpoints
router.route('/:id/image')
  .put(protect, authorize('admin'), handleProductImageUpload, replaceProductImage)
  .delete(protect, authorize('admin'), removeProductImage);

router.route('/:id')
  .get(getProductById)
  .put(protect, authorize('admin'), updateProduct)
  .delete(protect, authorize('admin'), deleteProduct);

export default router;
