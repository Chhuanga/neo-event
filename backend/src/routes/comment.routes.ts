import { Router } from 'express';
import { addComment } from '../controllers/comment.controller';
import { authenticate } from '../middlewares/authenticate';

const router = Router({ mergeParams: true });

router.use(authenticate);

// Expected route: /api/submissions/:submissionId/comments
router.post('/', addComment);

export default router;
