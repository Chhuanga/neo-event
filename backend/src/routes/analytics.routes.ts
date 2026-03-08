import { Router } from 'express';
import { getAnalytics } from '../controllers/analytics.controller';
import { authenticate } from '../middlewares/authenticate';

const router = Router();

router.use(authenticate);

// Expected route: /api/analytics
router.get('/', getAnalytics);

export default router;
