const { PrismaClient } = require('@prisma/client');
const feedbackService = require('../../src/services/feedback.service');

// Mock Prisma Client
jest.mock('@prisma/client');

describe('FeedbackService', () => {
  let mockPrisma;

  beforeEach(() => {
    mockPrisma = {
      mentorshipSession: {
        findFirst: jest.fn()
      },
      sessionFeedback: {
        findUnique: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        groupBy: jest.fn(),
        aggregate: jest.fn(),
        update: jest.fn(),
        delete: jest.fn()
      }
    };
    PrismaClient.mockImplementation(() => mockPrisma);
  });

  describe('createFeedback', () => {
    it('should create feedback successfully', async () => {
      const feedbackData = {
        sessionId: 'session-1',
        mentorId: 1,
        menteeId: 2,
        rating: 5,
        comment: 'Great session!'
      };

      const session = {
        id: 'session-1',
        mentorId: 1,
        menteeId: 2,
        status: 'COMPLETED'
      };

      const expectedFeedback = {
        id: 'feedback-1',
        ...feedbackData,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPrisma.mentorshipSession.findFirst.mockResolvedValue(session);
      mockPrisma.sessionFeedback.findUnique.mockResolvedValue(null);
      mockPrisma.sessionFeedback.create.mockResolvedValue(expectedFeedback);

      const result = await feedbackService.createFeedback(feedbackData);

      expect(result).toEqual(expectedFeedback);
    });

    it('should throw error when session not completed', async () => {
      mockPrisma.mentorshipSession.findFirst.mockResolvedValue(null);

      await expect(feedbackService.createFeedback({}))
        .rejects.toThrow('Session not found, not completed, or access denied');
    });

    it('should throw error when feedback already exists', async () => {
      const session = {
        id: 'session-1',
        mentorId: 1,
        menteeId: 2,
        status: 'COMPLETED'
      };

      const existingFeedback = { id: 'feedback-1' };

      mockPrisma.mentorshipSession.findFirst.mockResolvedValue(session);
      mockPrisma.sessionFeedback.findUnique.mockResolvedValue(existingFeedback);

      await expect(feedbackService.createFeedback({}))
        .rejects.toThrow('Feedback already submitted for this session');
    });

    it('should throw error when rating is invalid', async () => {
      const session = {
        id: 'session-1',
        mentorId: 1,
        menteeId: 2,
        status: 'COMPLETED'
      };

      mockPrisma.mentorshipSession.findFirst.mockResolvedValue(session);
      mockPrisma.sessionFeedback.findUnique.mockResolvedValue(null);

      await expect(feedbackService.createFeedback({ rating: 6 }))
        .rejects.toThrow('Rating must be between 1 and 5');
    });
  });

  describe('getFeedbackBySession', () => {
    it('should return feedback for session', async () => {
      const sessionId = 'session-1';
      const userId = 2;

      const session = {
        id: sessionId,
        mentorId: 1,
        menteeId: userId
      };

      const feedback = {
        id: 'feedback-1',
        sessionId,
        rating: 5,
        comment: 'Great session!'
      };

      mockPrisma.mentorshipSession.findFirst.mockResolvedValue(session);
      mockPrisma.sessionFeedback.findUnique.mockResolvedValue(feedback);

      const result = await feedbackService.getFeedbackBySession(sessionId, userId);

      expect(result).toEqual(feedback);
    });

    it('should throw error when session not found or access denied', async () => {
      mockPrisma.mentorshipSession.findFirst.mockResolvedValue(null);

      await expect(feedbackService.getFeedbackBySession('session-1', 1))
        .rejects.toThrow('Session not found or access denied');
    });
  });

  describe('getMentorFeedback', () => {
    it('should return paginated feedback for mentor', async () => {
      const mentorId = 1;
      const filters = { page: 1, limit: 10 };

      const feedback = [
        { id: 'feedback-1', rating: 5 },
        { id: 'feedback-2', rating: 4 }
      ];

      mockPrisma.sessionFeedback.findMany.mockResolvedValue(feedback);
      mockPrisma.sessionFeedback.count.mockResolvedValue(2);

      const result = await feedbackService.getMentorFeedback(mentorId, filters);

      expect(result.feedback).toEqual(feedback);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 2,
        pages: 1
      });
    });

    it('should apply filters correctly', async () => {
      const mentorId = 1;
      const filters = { rating: 5, startDate: '2024-01-01', endDate: '2024-01-31' };

      mockPrisma.sessionFeedback.findMany.mockResolvedValue([]);
      mockPrisma.sessionFeedback.count.mockResolvedValue(0);

      await feedbackService.getMentorFeedback(mentorId, filters);

      expect(mockPrisma.sessionFeedback.findMany).toHaveBeenCalledWith({
        where: {
          mentorId,
          rating: 5,
          createdAt: {
            gte: new Date('2024-01-01'),
            lte: new Date('2024-01-31')
          }
        },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10
      });
    });
  });

  describe('getMentorStats', () => {
    it('should return mentor statistics', async () => {
      const mentorId = 1;

      mockPrisma.sessionFeedback.count.mockResolvedValue(10);
      
      mockPrisma.sessionFeedback.groupBy.mockResolvedValue([
        { rating: 5, _count: { rating: 6 } },
        { rating: 4, _count: { rating: 3 } },
        { rating: 3, _count: { rating: 1 } }
      ]);

      mockPrisma.sessionFeedback.findMany.mockResolvedValue([
        { rating: 5, createdAt: new Date('2024-01-15') },
        { rating: 4, createdAt: new Date('2024-01-10') },
        { rating: 5, createdAt: new Date('2024-01-05') },
        { rating: 4, createdAt: new Date('2024-01-01') }
      ]);

      const result = await feedbackService.getMentorStats(mentorId);

      expect(result).toEqual({
        totalFeedback: 10,
        averageRating: 4.7,
        ratingDistribution: {
          1: 0,
          2: 0,
          3: 1,
          4: 3,
          5: 6
        },
        recentTrend: expect.any(String)
      });
    });

    it('should handle zero feedback case', async () => {
      const mentorId = 1;

      mockPrisma.sessionFeedback.count.mockResolvedValue(0);
      mockPrisma.sessionFeedback.groupBy.mockResolvedValue([]);
      mockPrisma.sessionFeedback.findMany.mockResolvedValue([]);

      const result = await feedbackService.getMentorStats(mentorId);

      expect(result.averageRating).toBe(0);
      expect(result.totalFeedback).toBe(0);
    });
  });

  describe('updateFeedback', () => {
    it('should update feedback successfully', async () => {
      const feedbackId = 'feedback-1';
      const userId = 2;
      const updateData = { rating: 4, comment: 'Updated comment' };

      const existingFeedback = {
        id: feedbackId,
        menteeId: userId,
        createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000) // 12 hours ago
      };

      const updatedFeedback = {
        id: feedbackId,
        rating: 4,
        comment: 'Updated comment'
      };

      mockPrisma.sessionFeedback.findFirst.mockResolvedValue(existingFeedback);
      mockPrisma.sessionFeedback.update.mockResolvedValue(updatedFeedback);

      const result = await feedbackService.updateFeedback(feedbackId, updateData, userId);

      expect(result).toEqual(updatedFeedback);
    });

    it('should throw error when feedback not found', async () => {
      mockPrisma.sessionFeedback.findFirst.mockResolvedValue(null);

      await expect(feedbackService.updateFeedback('feedback-1', {}, 1))
        .rejects.toThrow('Feedback not found or access denied');
    });

    it('should throw error when update time window expired', async () => {
      const existingFeedback = {
        id: 'feedback-1',
        menteeId: 1,
        createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000) // 25 hours ago
      };

      mockPrisma.sessionFeedback.findFirst.mockResolvedValue(existingFeedback);

      await expect(feedbackService.updateFeedback('feedback-1', {}, 1))
        .rejects.toThrow('Feedback can only be updated within 24 hours');
    });
  });

  describe('deleteFeedback', () => {
    it('should delete feedback successfully', async () => {
      const feedbackId = 'feedback-1';
      const userId = 2;

      const existingFeedback = {
        id: feedbackId,
        menteeId: userId,
        createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000) // 12 hours ago
      };

      mockPrisma.sessionFeedback.findFirst.mockResolvedValue(existingFeedback);
      mockPrisma.sessionFeedback.delete.mockResolvedValue({ id: feedbackId });

      const result = await feedbackService.deleteFeedback(feedbackId, userId);

      expect(result).toEqual({ message: 'Feedback deleted successfully' });
    });

    it('should throw error when deletion time window expired', async () => {
      const existingFeedback = {
        id: 'feedback-1',
        menteeId: 1,
        createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000) // 25 hours ago
      };

      mockPrisma.sessionFeedback.findFirst.mockResolvedValue(existingFeedback);

      await expect(feedbackService.deleteFeedback('feedback-1', 1))
        .rejects.toThrow('Feedback can only be deleted within 24 hours');
    });
  });

  describe('calculateRatingTrend', () => {
    it('should calculate improving trend', () => {
      const recentFeedback = [
        { rating: 5, createdAt: new Date() },
        { rating: 4, createdAt: new Date() },
        { rating: 5, createdAt: new Date() },
        { rating: 3, createdAt: new Date() }
      ];

      const trend = feedbackService.calculateRatingTrend(recentFeedback);
      expect(trend).toBe('improving');
    });

    it('should calculate declining trend', () => {
      const recentFeedback = [
        { rating: 3, createdAt: new Date() },
        { rating: 4, createdAt: new Date() },
        { rating: 3, createdAt: new Date() },
        { rating: 5, createdAt: new Date() }
      ];

      const trend = feedbackService.calculateRatingTrend(recentFeedback);
      expect(trend).toBe('declining');
    });

    it('should return stable for insufficient data', () => {
      const recentFeedback = [
        { rating: 5, createdAt: new Date() }
      ];

      const trend = feedbackService.calculateRatingTrend(recentFeedback);
      expect(trend).toBe('stable');
    });
  });
});
