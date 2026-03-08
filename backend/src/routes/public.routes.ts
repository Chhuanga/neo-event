import { Router } from 'express';
import {
  getResolvedCases,
  uploadMeetingMinute,
  getMeetingMinutes,
} from '../controllers/public.controller';
import { authenticate } from '../middlewares/authenticate';
import { upload } from '../middlewares/upload';

const router = Router();

router.use(authenticate);

// 1. Get resolved cases for the Quarterly Digest and Impact Table
router.get('/resolved-cases', getResolvedCases);

// 2. Meeting Minutes Area
router.get('/minutes', getMeetingMinutes);
router.post('/minutes', upload.single('document'), uploadMeetingMinute);

export default router;
