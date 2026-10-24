import { Router } from 'express';
import * as categoryController from '../controllers/category.controller.js';
import { requireAdmin } from '../middleware/auth.js';
import { asyncHandler } from '../utils/async-handler.js';

const router = Router();

router.get('/', asyncHandler(categoryController.listCategories));
router.get('/:id', asyncHandler(categoryController.getCategory));
router.post('/', requireAdmin, asyncHandler(categoryController.createCategory));
router.patch('/:id', requireAdmin, asyncHandler(categoryController.updateCategory));
router.delete('/:id', requireAdmin, asyncHandler(categoryController.deleteCategory));

export default router;
