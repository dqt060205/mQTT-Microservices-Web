import express from 'express';
import { register, login, getMe, updateMe } from '../controllers/user.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', requireAuth, getMe);
router.patch('/me', requireAuth, updateMe);

export default router;