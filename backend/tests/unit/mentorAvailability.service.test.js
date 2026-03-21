const { PrismaClient } = require('@prisma/client');
const mentorAvailabilityService = require('../../src/services/mentorAvailability.service');

// Mock Prisma Client
jest.mock('@prisma/client');

describe('MentorAvailabilityService', () => {
  let mockPrisma;

  beforeEach(() => {
    mockPrisma = {
      mentorAvailability: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn()
      },
      mentorshipSession: {
        findMany: jest.fn()
      }
    };
    PrismaClient.mockImplementation(() => mockPrisma);
  });

  describe('createAvailability', () => {
    it('should create availability successfully', async () => {
      const availabilityData = {
        mentorId: 1,
        dayOfWeek: 1, // Monday
        startTime: '09:00',
        endTime: '17:00',
        timezone: 'America/New_York'
      };

      const expectedAvailability = {
        id: 'availability-1',
        ...availabilityData,
        recurring: true,
        isActive: true
      };

      mockPrisma.mentorAvailability.findFirst.mockResolvedValue(null);
      mockPrisma.mentorAvailability.create.mockResolvedValue(expectedAvailability);

      const result = await mentorAvailabilityService.createAvailability(availabilityData);

      expect(result).toEqual(expectedAvailability);
    });

    it('should throw error for invalid time format', async () => {
      const availabilityData = {
        mentorId: 1,
        dayOfWeek: 1,
        startTime: '9:00', // Invalid format
        endTime: '17:00',
        timezone: 'America/New_York'
      };

      await expect(mentorAvailabilityService.createAvailability(availabilityData))
        .rejects.toThrow('Invalid time format. Use HH:MM format');
    });

    it('should throw error for invalid day of week', async () => {
      const availabilityData = {
        mentorId: 1,
        dayOfWeek: 7, // Invalid
        startTime: '09:00',
        endTime: '17:00',
        timezone: 'America/New_York'
      };

      await expect(mentorAvailabilityService.createAvailability(availabilityData))
        .rejects.toThrow('Day of week must be between 0 (Sunday) and 6 (Saturday)');
    });

    it('should throw error when end time is before start time', async () => {
      const availabilityData = {
        mentorId: 1,
        dayOfWeek: 1,
        startTime: '17:00',
        endTime: '09:00',
        timezone: 'America/New_York'
      };

      await expect(mentorAvailabilityService.createAvailability(availabilityData))
        .rejects.toThrow('End time must be after start time');
    });

    it('should throw error for overlapping availability', async () => {
      const availabilityData = {
        mentorId: 1,
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '17:00',
        timezone: 'America/New_York'
      };

      const overlappingAvailability = {
        id: 'availability-1',
        mentorId: 1,
        dayOfWeek: 1,
        startTime: '10:00',
        endTime: '15:00'
      };

      mockPrisma.mentorAvailability.findFirst.mockResolvedValue(overlappingAvailability);

      await expect(mentorAvailabilityService.createAvailability(availabilityData))
        .rejects.toThrow('Availability conflicts with existing time slot');
    });
  });

  describe('updateAvailability', () => {
    it('should update availability successfully', async () => {
      const availabilityId = 'availability-1';
      const mentorId = 1;
      const updateData = { startTime: '08:00', endTime: '16:00' };

      const existingAvailability = {
        id: availabilityId,
        mentorId,
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '17:00'
      };

      const updatedAvailability = {
        id: availabilityId,
        mentorId,
        dayOfWeek: 1,
        startTime: '08:00',
        endTime: '16:00'
      };

      mockPrisma.mentorAvailability.findFirst.mockResolvedValue(existingAvailability);
      mockPrisma.mentorAvailability.update.mockResolvedValue(updatedAvailability);

      const result = await mentorAvailabilityService.updateAvailability(availabilityId, updateData, mentorId);

      expect(result).toEqual(updatedAvailability);
    });

    it('should throw error when availability not found', async () => {
      mockPrisma.mentorAvailability.findFirst.mockResolvedValue(null);

      await expect(mentorAvailabilityService.updateAvailability('availability-1', {}, 1))
        .rejects.toThrow('Availability not found or access denied');
    });
  });

  describe('deleteAvailability', () => {
    it('should delete availability successfully', async () => {
      const availabilityId = 'availability-1';
      const mentorId = 1;

      const existingAvailability = {
        id: availabilityId,
        mentorId
      };

      mockPrisma.mentorAvailability.findFirst.mockResolvedValue(existingAvailability);
      mockPrisma.mentorAvailability.delete.mockResolvedValue({ id: availabilityId });

      const result = await mentorAvailabilityService.deleteAvailability(availabilityId, mentorId);

      expect(result).toEqual({ message: 'Availability deleted successfully' });
    });

    it('should throw error when availability not found', async () => {
      mockPrisma.mentorAvailability.findFirst.mockResolvedValue(null);

      await expect(mentorAvailabilityService.deleteAvailability('availability-1', 1))
        .rejects.toThrow('Availability not found or access denied');
    });
  });

  describe('getMentorAvailability', () => {
    it('should return mentor availability', async () => {
      const mentorId = 1;
      const availability = [
        { id: 'availability-1', dayOfWeek: 1, startTime: '09:00', endTime: '17:00' },
        { id: 'availability-2', dayOfWeek: 3, startTime: '10:00', endTime: '16:00' }
      ];

      mockPrisma.mentorAvailability.findMany.mockResolvedValue(availability);

      const result = await mentorAvailabilityService.getMentorAvailability(mentorId);

      expect(result).toEqual(availability);
      expect(mockPrisma.mentorAvailability.findMany).toHaveBeenCalledWith({
        where: { mentorId, isActive: true },
        orderBy: [
          { dayOfWeek: 'asc' },
          { startTime: 'asc' }
        ]
      });
    });

    it('should apply filters correctly', async () => {
      const mentorId = 1;
      const filters = { isActive: false, dayOfWeek: 1 };

      mockPrisma.mentorAvailability.findMany.mockResolvedValue([]);

      await mentorAvailabilityService.getMentorAvailability(mentorId, filters);

      expect(mockPrisma.mentorAvailability.findMany).toHaveBeenCalledWith({
        where: { mentorId, isActive: false, dayOfWeek: 1 },
        orderBy: [
          { dayOfWeek: 'asc' },
          { startTime: 'asc' }
        ]
      });
    });
  });

  describe('getAvailableTimeSlots', () => {
    it('should generate available time slots', async () => {
      const mentorId = 1;
      const startDate = '2024-01-01';
      const endDate = '2024-01-07';
      const duration = 60;

      const availability = [
        {
          dayOfWeek: 1, // Monday
          startTime: '09:00',
          endTime: '17:00',
          timezone: 'America/New_York'
        }
      ];

      const existingSessions = [
        {
          scheduledAt: new Date('2024-01-01T10:00:00Z'),
          duration: 60
        }
      ];

      mockPrisma.mentorAvailability.findMany.mockResolvedValue(availability);
      mockPrisma.mentorshipSession.findMany.mockResolvedValue(existingSessions);

      const result = await mentorAvailabilityService.getAvailableTimeSlots(mentorId, startDate, endDate, duration);

      expect(result).toEqual(expect.any(Array));
      expect(mockPrisma.mentorAvailability.findMany).toHaveBeenCalledWith({
        where: { mentorId, isActive: true }
      });
    });
  });

  describe('bulkCreateAvailability', () => {
    it('should create multiple availability slots', async () => {
      const mentorId = 1;
      const availabilityList = [
        { dayOfWeek: 1, startTime: '09:00', endTime: '17:00', timezone: 'America/New_York' },
        { dayOfWeek: 3, startTime: '10:00', endTime: '16:00', timezone: 'America/New_York' }
      ];

      const createdAvailability = [
        { id: 'availability-1', mentorId, ...availabilityList[0] },
        { id: 'availability-2', mentorId, ...availabilityList[1] }
      ];

      mockPrisma.mentorAvailability.findFirst.mockResolvedValue(null);
      mockPrisma.mentorAvailability.create
        .mockResolvedValueOnce(createdAvailability[0])
        .mockResolvedValueOnce(createdAvailability[1]);

      const result = await mentorAvailabilityService.bulkCreateAvailability(mentorId, availabilityList);

      expect(result.created).toEqual(createdAvailability);
      expect(result.errors).toEqual([]);
      expect(result.total).toBe(2);
    });

    it('should handle partial failures', async () => {
      const mentorId = 1;
      const availabilityList = [
        { dayOfWeek: 1, startTime: '09:00', endTime: '17:00', timezone: 'America/New_York' },
        { dayOfWeek: 7, startTime: '10:00', endTime: '16:00', timezone: 'America/New_York' } // Invalid day
      ];

      const createdAvailability = [{ id: 'availability-1', mentorId, ...availabilityList[0] }];

      mockPrisma.mentorAvailability.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      mockPrisma.mentorAvailability.create.mockResolvedValue(createdAvailability[0]);

      const result = await mentorAvailabilityService.bulkCreateAvailability(mentorId, availabilityList);

      expect(result.created).toEqual(createdAvailability);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toHaveProperty('error');
      expect(result.total).toBe(2);
    });
  });

  describe('getAvailabilitySummary', () => {
    it('should return availability summary', async () => {
      const mentorId = 1;
      const availability = [
        { dayOfWeek: 1, startTime: '09:00', endTime: '17:00', timezone: 'America/New_York' },
        { dayOfWeek: 3, startTime: '10:00', endTime: '16:00', timezone: 'America/New_York' }
      ];

      mockPrisma.mentorAvailability.findMany.mockResolvedValue(availability);

      const result = await mentorAvailabilityService.getAvailabilitySummary(mentorId);

      expect(result).toEqual({
        totalSlots: 2,
        weeklyHours: 14, // 8 + 6 hours
        schedule: expect.any(Object)
      });
    });
  });

  describe('timeToMinutes', () => {
    it('should convert time string to minutes', () => {
      expect(mentorAvailabilityService.timeToMinutes('09:30')).toBe(570);
      expect(mentorAvailabilityService.timeToMinutes('23:59')).toBe(1439);
      expect(mentorAvailabilityService.timeToMinutes('00:00')).toBe(0);
    });
  });

  describe('generateTimeSlots', () => {
    it('should generate time slots correctly', async () => {
      const date = new Date('2024-01-01');
      const startTime = '09:00';
      const endTime = '11:00';
      const duration = 60;
      const existingSessions = [];
      const timezone = 'America/New_York';

      // Access private method through prototype
      const slots = mentorAvailabilityService.generateTimeSlots(
        date,
        startTime,
        endTime,
        duration,
        existingSessions,
        timezone
      );

      expect(slots).toHaveLength(2); // 9:00-10:00 and 10:00-11:00
      expect(slots[0]).toHaveProperty('startTime');
      expect(slots[0]).toHaveProperty('endTime');
      expect(slots[0]).toHaveProperty('duration', 60);
    });
  });
});
