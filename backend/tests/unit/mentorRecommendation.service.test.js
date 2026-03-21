const { PrismaClient } = require('@prisma/client');
const mentorRecommendationService = require('../../src/services/mentorRecommendation.service');
const logger = require('../../src/utils/logger.util');

// Mock dependencies
jest.mock('@prisma/client');
jest.mock('../../src/utils/logger.util');
jest.mock('node-cron');

describe('MentorRecommendationService', () => {
  let mockPrisma;
  let mockCache;
  let mockCron;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockPrisma = {
      user: { findUnique: jest.fn(), findMany: jest.fn() },
      mentorScore: { createMany: jest.fn(), deleteMany: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
      mentorshipSession: { findMany: jest.fn(), findUnique: jest.fn(), include: jest.fn() },
      slot: { findMany: jest.fn() },
      aIMentorMatch: { findMany: jest.fn(), deleteMany: jest.fn() }
    };

    PrismaClient.mockImplementation(() => mockPrisma);

    mockCache = { get: jest.fn(), set: jest.fn(), del: jest.fn(), flushAll: jest.fn(), getStats: jest.fn(), keys: jest.fn() };
    mockCron = { schedule: jest.fn(() => ({ stop: jest.fn(), nextDate: jest.fn(() => new Date(Date.now() + 60000)) })) };

    logger.info = jest.fn();
    logger.error = jest.fn();
    logger.warn = jest.fn();

    jest.doMock('node-cache', () => jest.fn().mockImplementation(() => mockCache));
    jest.doMock('node-cron', () => jest.fn().mockImplementation(() => mockCron));
    jest.resetModules();
  });

  afterEach(() => {
    jest.resetModules();
  });

  describe('generateMentorRecommendations', () => {
    it('should generate mentor recommendations successfully', async () => {
      const service = require('../../src/services/mentorRecommendation.service');
      
      const userId = 1;
      const options = { skills: ['JavaScript', 'React'], experience: 'INTERMEDIATE', limit: 10 };

      const mockUserData = { user: { id: 1, name: 'Test User', role: 'USER' }, behavior: {}, skillMastery: [], pastInteractions: [], previousScores: [] };
      const mockCandidateMentors = [{ id: 2, name: 'John Doe', skills: 'JavaScript,React,Node.js', role: 'MENTOR' }];
      const mockScoredMentors = [{ ...mockCandidateMentors[0], skillMatch: 0.8, availability: 0.7, performance: 0.9, compatibility: 0.6, overallScore: 0.75 }];

      mockPrisma.user.findUnique.mockResolvedValue(mockUserData.user);
      mockPrisma.aIUserBehavior.findUnique.mockResolvedValue(mockUserData.behavior);
      mockPrisma.skillMastery.findMany.mockResolvedValue(mockUserData.skillMastery);
      mockPrisma.user.findMany.mockResolvedValue(mockCandidateMentors);
      mockPrisma.mentorScore.deleteMany.mockResolvedValue({});
      mockPrisma.mentorScore.createMany.mockResolvedValue({});

      jest.spyOn(service, 'getUserMentorData').mockResolvedValue(mockUserData);
      jest.spyOn(service, 'getCandidateMentors').mockResolvedValue(mockCandidateMentors);
      jest.spyOn(service, 'calculateHybridScores').mockResolvedValue(mockScoredMentors);
      jest.spyOn(service, 'rankAndFilterMentors').mockResolvedValue(mockScoredMentors);
      jest.spyOn(service, 'storeMentorScores').mockResolvedValue({});

      const result = await service.generateMentorRecommendations(userId, options);

      expect(result).toHaveLength(1);
      expect(result[0].overallScore).toBe(0.75);
    });

    it('should handle errors during recommendation generation', async () => {
      const service = require('../../src/services/mentorRecommendation.service');
      mockPrisma.user.findUnique.mockRejectedValue(new Error('Database error'));

      await expect(service.generateMentorRecommendations(1, {})).rejects.toThrow('Failed to generate mentor recommendations');
    });
  });

  describe('getUserMentorData', () => {
    it('should get user mentor data successfully', async () => {
      const service = require('../../src/services/mentorRecommendation.service');
      
      const mockUser = { id: 1, name: 'Test User', role: 'USER' };
      const mockBehavior = { behaviorData: JSON.stringify({ learningStyle: 'VISUAL', experienceLevel: 'INTERMEDIATE' }) };
      const mockSkillMastery = [{ skill: 'JavaScript', masteryLevel: 0.3, confidence: 0.5 }];

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.aIUserBehavior.findUnique.mockResolvedValue(mockBehavior);
      mockPrisma.skillMastery.findMany.mockResolvedValue(mockSkillMastery);
      mockPrisma.mentorScoresReceived.findMany.mockResolvedValue([]);
      mockPrisma.mentorshipsAsMentee.findMany.mockResolvedValue([]);

      const result = await service.getUserMentorData(1);

      expect(result.user).toEqual(mockUser);
      expect(result.skillMastery).toEqual(mockSkillMastery);
    });

    it('should handle user not found', async () => {
      const service = require('../../src/services/mentorRecommendation.service');
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getUserMentorData(1)).rejects.toThrow('User not found');
    });
  });

  describe('getCandidateMentors', () => {
    it('should get candidate mentors successfully', async () => {
      const service = require('../../src/services/mentorRecommendation.service');
      
      const mockMentors = [{ id: 2, name: 'John Doe', skills: 'JavaScript,React,Node.js', role: 'MENTOR', isActive: true }];
      mockPrisma.user.findMany.mockResolvedValue(mockMentors);

      const result = await service.getCandidateMentors(1, ['JavaScript', 'React'], {});

      expect(result).toHaveLength(1);
      expect(result[0].role).toBe('MENTOR');
    });

    it('should handle database errors', async () => {
      const service = require('../../src/services/mentorRecommendation.service');
      mockPrisma.user.findMany.mockRejectedValue(new Error('Database error'));

      await expect(service.getCandidateMentors(1, [])).rejects.toThrow('Failed to get candidate mentors');
    });
  });

  describe('calculateHybridScores', () => {
    it('should calculate hybrid scores correctly', async () => {
      const service = require('../../src/services/mentorRecommendation.service');
      
      const mentors = [{ id: 2, name: 'John Doe', skills: 'JavaScript,React,Node.js', role: 'MENTOR' }];
      const userData = { user: { id: 1 }, behavior: { learningStyle: 'VISUAL' }, skillMastery: [], pastInteractions: [], previousScores: [] };

      jest.spyOn(service, 'calculateSkillMatchScore').mockReturnValue(0.8);
      jest.spyOn(service, 'calculateAvailabilityScore').mockReturnValue(0.7);
      jest.spyOn(service, 'calculatePerformanceScore').mockReturnValue(0.9);
      jest.spyOn(service, 'calculateCompatibilityScore').mockReturnValue(0.6);

      const result = await service.calculateHybridScores(1, mentors, userData, {});

      expect(result).toHaveLength(1);
      expect(result[0].overallScore).toBe(0.75);
    });
  });

  describe('storeMentorScores', () => {
    it('should store mentor scores successfully', async () => {
      const service = require('../../src/services/mentorRecommendation.service');
      
      const scoredMentors = [{ mentorId: 2, skillMatch: 0.8, availability: 0.7, performance: 0.9, compatibility: 0.6, overallScore: 0.75 }];

      mockPrisma.mentorScore.deleteMany.mockResolvedValue({});
      mockPrisma.mentorScore.createMany.mockResolvedValue({});

      const result = await service.storeMentorScores(1, scoredMentors);

      expect(mockPrisma.mentorScore.deleteMany).toHaveBeenCalled();
      expect(mockPrisma.mentorScore.createMany).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should handle errors during score storage', async () => {
      const service = require('../../src/services/mentorRecommendation.service');
      mockPrisma.mentorScore.deleteMany.mockRejectedValue(new Error('Database error'));

      await expect(service.storeMentorScores(1, [])).rejects.toThrow('Failed to store mentor scores');
    });
  });

  describe('getStoredMentorRecommendations', () => {
    it('should get stored mentor recommendations', async () => {
      const service = require('../../src/services/mentorRecommendation.service');
      
      const mockStoredScores = [{ mentorId: 2, skillMatch: 0.8, availability: 0.7, performance: 0.9, compatibility: 0.6, overallScore: 0.75, createdAt: new Date() }];
      mockPrisma.mentorScore.findMany.mockResolvedValue(mockStoredScores);

      const result = await service.getStoredMentorRecommendations(1);

      expect(result).toHaveLength(1);
      expect(result[0].overallScore).toBe(0.75);
    });

    it('should handle database errors', async () => {
      const service = require('../../src/services/mentorRecommendation.service');
      mockPrisma.mentorScore.findMany.mockRejectedValue(new Error('Database error'));

      await expect(service.getStoredMentorRecommendations(1)).rejects.toThrow('Failed to get stored mentor recommendations');
    });
  });

  describe('updateMentorFeedback', () => {
    it('should update mentor feedback successfully', async () => {
      const service = require('../../src/services/mentorRecommendation.service');
      
      mockPrisma.mentorScore.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.updateMentorFeedback(1, 'mentor-2', { score: 5, comment: 'Excellent mentor!' });

      expect(mockPrisma.mentorScore.updateMany).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should handle database errors during feedback update', async () => {
      const service = require('../../src/services/mentorRecommendation.service');
      mockPrisma.mentorScore.updateMany.mockRejectedValue(new Error('Database error'));

      await expect(service.updateMentorFeedback(1, 'mentor-2', { score: 5, comment: 'Test' })).rejects.toThrow('Failed to update mentor feedback');
    });
  });

  describe('getMentorAvailability', () => {
    it('should get mentor availability successfully', async () => {
      const service = require('../../src/services/mentorRecommendation.service');
      
      const mockSlots = [{ id: 'slot-1', status: 'AVAILABLE', startTime: new Date(Date.now() + 24 * 60 * 60 * 1000), endTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000) }];
      mockPrisma.slot.findMany.mockResolvedValue(mockSlots);

      const result = await service.getMentorAvailability('mentor-2', {});

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('AVAILABLE');
    });

    it('should handle database errors', async () => {
      const service = require('../../src/services/mentorRecommendation.service');
      mockPrisma.slot.findMany.mockRejectedValue(new Error('Database error'));

      await expect(service.getMentorAvailability('mentor-2', {})).rejects.toThrow('Failed to get mentor availability');
    });
  });

  describe('updateMentorScore', () => {
    it('should update mentor score successfully', async () => {
      const service = require('../../src/services/mentorRecommendation.service');
      
      mockPrisma.mentorScore.findUnique.mockResolvedValue({ id: 1 });
      mockPrisma.mentorScore.update.mockResolvedValue({});

      const result = await service.updateMentorScore('mentor-2', { skillMatch: 0.9, availability: 0.8, performance: 0.95, compatibility: 0.85 });

      expect(mockPrisma.mentorScore.update).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should handle database errors', async () => {
      const service = require('../../src/services/mentorRecommendation.service');
      mockPrisma.mentorScore.findUnique.mockRejectedValue(new Error('Database error'));

      await expect(service.updateMentorScore('mentor-2', {})).rejects.toThrow('Failed to update mentor score');
    });
  });

  describe('getHealthStatus', () => {
    it('should return healthy status', async () => {
      const service = require('../../src/services/mentorRecommendation.service');
      const health = await service.getHealthStatus();

      expect(health.status).toBe('healthy');
      expect(health.timestamp).toBeInstanceOf(Date);
    });

    it('should return error status when service fails', async () => {
      const service = require('../../src/services/mentorRecommendation.service');
      jest.spyOn(service, 'getHealthStatus').mockRejectedValue(new Error('Service error'));

      const health = await service.getHealthStatus();

      expect(health.status).toBe('error');
      expect(health.error).toBe('Service error');
    });
  });

  describe('calculateSkillMatchScore', () => {
    it('should calculate skill match score correctly', () => {
      const service = require('../../src/services/mentorRecommendation.service');
      const result = service.calculateSkillMatchScore(['JavaScript', 'React'], 'JavaScript,React,Node.js');
      expect(result).toBeGreaterThan(0);
    });
  });

  describe('calculateAvailabilityScore', () => {
    it('should calculate availability score correctly', () => {
      const service = require('../../src/services/mentorRecommendation.service');
      const slots = [{ status: 'AVAILABLE', startTime: new Date(Date.now() + 24 * 60 * 60 * 1000) }];
      const result = service.calculateAvailabilityScore(slots);
      expect(result).toBeGreaterThan(0);
    });
  });

  describe('calculatePerformanceScore', () => {
    it('should calculate performance score correctly', () => {
      const service = require('../../src/services/mentorRecommendation.service');
      const mentorData = { _count: { mentorshipsAsMentor: 10 }, mentorshipSessionsAsMentor: [{ feedback: { rating: 5 } }, { feedback: { rating: 4 } }] };
      const result = service.calculatePerformanceScore(mentorData);
      expect(result).toBeGreaterThan(0);
    });
  });

  describe('calculateCompatibilityScore', () => {
    it('should calculate compatibility score correctly', () => {
      const service = require('../../src/services/mentorRecommendation.service');
      const userBehavior = { learningStyle: 'VISUAL' };
      const mentorData = { behavior: { teachingStyle: 'VISUAL' } };
      const result = service.calculateCompatibilityScore(userBehavior, mentorData);
      expect(result).toBeGreaterThan(0);
    });
  });
});
