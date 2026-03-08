import { Router } from 'express';
import {
  createSubmission,
  getSubmissions,
  getSubmissionById,
  updateSubmission,
  deleteSubmission,
} from '../controllers/submission.controller';
import { escalateStaleSubmissions } from '../controllers/escalation.controller';
import { authenticate } from '../middlewares/authenticate';
import { upload } from '../middlewares/upload';
import commentRoutes from './comment.routes';

const router = Router();

// Escalation trigger (open to all or protect logic if preferred, keeping open for easy cron job access)
router.post('/escalate', escalateStaleSubmissions);

router.use(authenticate);

router.post('/', upload.single('attachment'), createSubmission);
router.get('/', getSubmissions);
router.get('/:id', getSubmissionById);
router.patch('/:id', updateSubmission);
router.delete('/:id', deleteSubmission);

router.use('/:submissionId/comments', commentRoutes);

export default router;
