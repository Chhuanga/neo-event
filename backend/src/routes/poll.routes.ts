import { Router } from 'express';
import { createPoll, getPolls, votePoll } from '../controllers/poll.controller';
import { authenticate } from '../middlewares/authenticate';

const router = Router();

router.use(authenticate);

router.post('/', createPoll);
router.get('/', getPolls);
router.post('/:pollId/vote', votePoll);

export default router;
