import { Router } from 'express';
import { register, login, getMe, getUsers, changePassword } from '../controllers/auth.controller';
import { authenticate } from '../middlewares/authenticate';

const router = Router();

router.post('/register', authenticate, register);
router.post('/login', login);
router.get('/me', authenticate, getMe);
router.put('/password', authenticate, changePassword);
router.get('/users', authenticate, getUsers);

export default router;
