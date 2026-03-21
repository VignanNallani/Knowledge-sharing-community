const { PrismaClient } = require('@prisma/client');
const mentorshipSessionService = require('../../src/services/mentorshipSession.service');

// Mock Prisma Client
jest.mock('@prisma/client');
jest.mock('../../src/services/reminder.service');

describe('MentorshipSessionService', () => {
  let mockPrisma;

  beforeEach(() => {
    mockPrisma = {
      mentorshipSession: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn()
      },
      sessionReminder: {
        createMany: jest.fn(),
        updateMany: jest.fn()
      }
    };
    PrismaClient.mockImplementation(() => mockPrisma);
  });

  describe('createSession', () => {
    it('should create a new session successfully', async () => {
      const sessionData = {
        mentorshipId: 1,
        title: 'Test Session',
        description: 'Test Description',
        scheduledAt: '2024-01-01T10:00:00Z',
        duration: 60,
        mentorId: 1,
        menteeId: 2
      };

      const expectedSession = {
        id: 'session-1',
        ...sessionData,
        scheduledAt: new Date(sessionData.scheduledAt),
        meetUrl: 'https://meet.jit.si/KnowledgeSharing-abc123',
        mentor: { id: 1, name: 'Mentor', email: 'mentor@test.com' },
        mentee: { id: 2, name: 'Mentee', email: 'mentee@test.com' }
      };

      mockPrisma.mentorshipSession.create.mockResolvedValue(expectedSession);

      const result = await mentorshipSessionService.createSession(sessionData);

      expect(mockPrisma.mentorshipSession.create).toHaveBeenCalledWith({
        data: {
          ...sessionData,
          scheduledAt: new Date(sessionData.scheduledAt),
          meetUrl: expect.stringContaining('https://meet.jit.si/KnowledgeSharing-')
        },
        include: {
          mentor: {
            select: { id: true, name: true, email: true }
          },
          mentee: {
            select: { id: true, name: true, email: true }
          }
        }
      });

      expect(result).toEqual(expectedSession);
    });

    it('should throw error when creation fails', async () => {
      mockPrisma.mentorshipSession.create.mockRejectedValue(new Error('Database error'));

      await expect(mentorshipSessionService.createSession({})).rejects.toThrow('Failed to create session: Database error');
    });
  });

  describe('updateSession', () => {
    it('should update session when user has access', async () => {
      const sessionId = 'session-1';
      const userId = 1;
      const updateData = { title: 'Updated Title' };

      const existingSession = {
        id: sessionId,
        mentorId: userId,
        menteeId: 2
      };

      const updatedSession = {
        id: sessionId,
        title: 'Updated Title',
        mentor: { id: 1, name: 'Mentor', email: 'mentor@test.com' },
        mentee: { id: 2, name: 'Mentee', email: 'mentee@test.com' }
      };

      mockPrisma.mentorshipSession.findFirst.mockResolvedValue(existingSession);
      mockPrisma.mentorshipSession.update.mockResolvedValue(updatedSession);

      const result = await mentorshipSessionService.updateSession(sessionId, updateData, userId);

      expect(result).toEqual(updatedSession);
    });

    it('should throw error when session not found or access denied', async () => {
      mockPrisma.mentorshipSession.findFirst.mockResolvedValue(null);

      await expect(mentorshipSessionService.updateSession('session-1', {}, 1))
        .rejects.toThrow('Session not found or access denied');
    });
  });

  describe('cancelSession', () => {
    it('should cancel session successfully', async () => {
      const sessionId = 'session-1';
      const userId = 1;
      const reason = 'Schedule conflict';

      const existingSession = {
        id: sessionId,
        mentorId: userId,
        menteeId: 2,
        status: 'SCHEDULED'
      };

      const cancelledSession = {
        id: sessionId,
        status: 'CANCELLED',
        notes: reason
      };

      mockPrisma.mentorshipSession.findFirst.mockResolvedValue(existingSession);
      mockPrisma.mentorshipSession.update.mockResolvedValue(cancelledSession);
      mockPrisma.sessionReminder.updateMany.mockResolvedValue({ count: 3 });

      const result = await mentorshipSessionService.cancelSession(sessionId, userId, reason);

      expect(result.status).toBe('CANCELLED');
      expect(mockPrisma.sessionReminder.updateMany).toHaveBeenCalledWith({
        where: {
          sessionId,
          status: 'PENDING'
        },
        data: {
          status: 'FAILED'
        }
      });
    });

    it('should throw error when session already cancelled', async () => {
      const existingSession = {
        id: 'session-1',
        mentorId: 1,
        menteeId: 2,
        status: 'CANCELLED'
      };

      mockPrisma.mentorshipSession.findFirst.mockResolvedValue(existingSession);

      await expect(mentorshipSessionService.cancelSession('session-1', 1))
        .rejects.toThrow('Session is already cancelled');
    });
  });

  describe('completeSession', () => {
    it('should complete session and schedule feedback reminder', async () => {
      const sessionId = 'session-1';
      const userId = 1;

      const existingSession = {
        id: sessionId,
        mentorId: userId,
        menteeId: 2,
        status: 'SCHEDULED'
      };

      const completedSession = {
        id: sessionId,
        status: 'COMPLETED'
      };

      mockPrisma.mentorshipSession.findFirst.mockResolvedValue(existingSession);
      mockPrisma.mentorshipSession.update.mockResolvedValue(completedSession);

      const result = await mentorshipSessionService.completeSession(sessionId, userId);

      expect(result.status).toBe('COMPLETED');
    });

    it('should throw error when user is not the mentor', async () => {
      mockPrisma.mentorshipSession.findFirst.mockResolvedValue(null);

      await expect(mentorshipSessionService.completeSession('session-1', 2))
        .rejects.toThrow('Session not found or access denied');
    });
  });

  describe('getSessions', () => {
    it('should return paginated sessions for user', async () => {
      const userId = 1;
      const role = 'MENTOR';
      const filters = { page: 1, limit: 10 };

      const sessions = [
        { id: 'session-1', title: 'Session 1' },
        { id: 'session-2', title: 'Session 2' }
      ];

      mockPrisma.mentorshipSession.findMany.mockResolvedValue(sessions);
      mockPrisma.mentorshipSession.count.mockResolvedValue(2);

      const result = await mentorshipSessionService.getSessions(userId, role, filters);

      expect(result.sessions).toEqual(sessions);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 2,
        pages: 1
      });
    });

    it('should apply filters correctly', async () => {
      const userId = 1;
      const role = 'MENTOR';
      const filters = { status: 'COMPLETED', startDate: '2024-01-01', endDate: '2024-01-31' };

      mockPrisma.mentorshipSession.findMany.mockResolvedValue([]);
      mockPrisma.mentorshipSession.count.mockResolvedValue(0);

      await mentorshipSessionService.getSessions(userId, role, filters);

      expect(mockPrisma.mentorshipSession.findMany).toHaveBeenCalledWith({
        where: {
          mentorId: userId,
          status: 'COMPLETED',
          scheduledAt: {
            gte: new Date('2024-01-01'),
            lte: new Date('2024-01-31')
          }
        },
        include: expect.any(Object),
        orderBy: { scheduledAt: 'desc' },
        skip: 0,
        take: 10
      });
    });
  });

  describe('getSessionStats', () => {
    it('should return session statistics', async () => {
      const userId = 1;
      const role = 'MENTOR';

      mockPrisma.mentorshipSession.count
        .mockResolvedValueOnce(10) // totalSessions
        .mockResolvedValueOnce(8)  // completedSessions
        .mockResolvedValueOnce(1)  // cancelledSessions
        .mockResolvedValueOnce(2); // upcomingSessions

      mockPrisma.sessionFeedback.aggregate.mockResolvedValue({
        _avg: { rating: 4.5 }
      });

      const result = await mentorshipSessionService.getSessionStats(userId, role);

      expect(result).toEqual({
        totalSessions: 10,
        completedSessions: 8,
        cancelledSessions: 1,
        upcomingSessions: 2,
        completionRate: 80,
        averageRating: 4.5
      });
    });
  });
});
