import { Router } from 'express';
import * as productController from '../controllers/product.controller.js';
import { requireAdmin } from '../middleware/auth.js';
import { asyncHandler } from '../utils/async-handler.js';

const router = Router();

router.get('/', asyncHandler(productController.listProducts));
router.get('/:id', asyncHandler(productController.getProduct));
router.post('/', requireAdmin, asyncHandler(productController.createProduct));
router.patch('/:id', requireAdmin, asyncHandler(productController.updateProduct));
router.delete('/:id', requireAdmin, asyncHandler(productController.deleteProduct));

export default router;
