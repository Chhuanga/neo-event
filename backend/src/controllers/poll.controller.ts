import { Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../middlewares/authenticate';
import { Role } from '@prisma/client';

export const createPoll = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { question, options } = req.body;
    
    const userRole = req.user!.role as Role;
    if (!([Role.ADMIN, Role.SECRETARIAT] as Role[]).includes(userRole)) {
      res.status(403).json({ success: false, message: 'Forbidden' });
      return;
    }

    if (!options || options.length < 2) {
      res.status(400).json({ success: false, message: 'A poll must have at least 2 options' });
      return;
    }

    const poll = await prisma.poll.create({
      data: {
        question,
        options: {
          create: options.map((opt: string) => ({ text: opt })),
        },
      },
      include: {
        options: true,
      },
    });

    res.status(201).json({ success: true, data: poll });
  } catch (err) {
    next(err);
  }
};

export const getPolls = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const polls = await prisma.poll.findMany({
      include: {
        options: {
          include: {
            _count: {
              select: { votes: true }
            }
          }
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // We can also let the user know if they've already voted on this poll
    const userId = req.user!.id;
    const userVotes = await prisma.vote.findMany({
      where: { userId },
      select: { pollId: true, pollOptionId: true }
    });

    const votedPollMap = userVotes.reduce((acc, vote) => {
      acc[vote.pollId] = vote.pollOptionId;
      return acc;
    }, {} as Record<string, string>);

    const formattedPolls = polls.map((poll) => ({
      id: poll.id,
      question: poll.question,
      createdAt: poll.createdAt,
      options: poll.options.map(opt => ({
        id: opt.id,
        text: opt.text,
        votes: opt._count.votes
      })),
      userVotedOptionId: votedPollMap[poll.id] || null
    }));

    res.json({ success: true, data: formattedPolls });
  } catch (err) {
    next(err);
  }
};

export const votePoll = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { pollId } = req.params;
    const { optionId } = req.body;
    const userId = req.user!.id;

    // Verify option belongs to poll
    const option = await prisma.pollOption.findFirst({
      where: { id: optionId, pollId },
    });

    if (!option) {
      res.status(404).json({ success: false, message: 'Option not found for this poll' });
      return;
    }

    // Check if user already voted
    const existingVote = await prisma.vote.findUnique({
      where: {
        userId_pollId: { userId, pollId }
      }
    });

    if (existingVote) {
      res.status(409).json({ success: false, message: 'You have already voted on this poll' });
      return;
    }

    const vote = await prisma.vote.create({
      data: {
        userId,
        pollId,
        pollOptionId: optionId,
      },
    });

    res.status(201).json({ success: true, data: vote });
  } catch (err) {
    next(err);
  }
};
