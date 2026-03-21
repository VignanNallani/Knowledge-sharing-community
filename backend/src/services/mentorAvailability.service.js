const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class MentorAvailabilityService {
  async createAvailability(data) {
    const { mentorId, dayOfWeek, startTime, endTime, timezone, recurring = true } = data;
    
    try {
      // Validate time format
      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
        throw new Error('Invalid time format. Use HH:MM format');
      }

      // Validate day of week
      if (dayOfWeek < 0 || dayOfWeek > 6) {
        throw new Error('Day of week must be between 0 (Sunday) and 6 (Saturday)');
      }

      // Validate time range
      const startMinutes = this.timeToMinutes(startTime);
      const endMinutes = this.timeToMinutes(endTime);
      if (startMinutes >= endMinutes) {
        throw new Error('End time must be after start time');
      }

      // Check for overlapping availability
      const overlapping = await prisma.mentorAvailability.findFirst({
        where: {
          mentorId,
          dayOfWeek,
          isActive: true,
          OR: [
            {
              startTime: { lt: endTime },
              endTime: { gt: startTime }
            }
          ]
        }
      });

      if (overlapping) {
        throw new Error('Availability conflicts with existing time slot');
      }

      const availability = await prisma.mentorAvailability.create({
        data: {
          mentorId,
          dayOfWeek,
          startTime,
          endTime,
          timezone,
          recurring,
          isActive: true
        }
      });

      return availability;
    } catch (error) {
      throw new Error(`Failed to create availability: ${error.message}`);
    }
  }

  async updateAvailability(availabilityId, data, mentorId) {
    try {
      const existing = await prisma.mentorAvailability.findFirst({
        where: {
          id: availabilityId,
          mentorId
        }
      });

      if (!existing) {
        throw new Error('Availability not found or access denied');
      }

      // Validate time format if provided
      if (data.startTime || data.endTime) {
        const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
        const startTime = data.startTime || existing.startTime;
        const endTime = data.endTime || existing.endTime;
        
        if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
          throw new Error('Invalid time format. Use HH:MM format');
        }

        // Validate time range
        const startMinutes = this.timeToMinutes(startTime);
        const endMinutes = this.timeToMinutes(endTime);
        if (startMinutes >= endMinutes) {
          throw new Error('End time must be after start time');
        }
      }

      const updatedAvailability = await prisma.mentorAvailability.update({
        where: { id: availabilityId },
        data: {
          ...data,
          updatedAt: new Date()
        }
      });

      return updatedAvailability;
    } catch (error) {
      throw new Error(`Failed to update availability: ${error.message}`);
    }
  }

  async deleteAvailability(availabilityId, mentorId) {
    try {
      const availability = await prisma.mentorAvailability.findFirst({
        where: {
          id: availabilityId,
          mentorId
        }
      });

      if (!availability) {
        throw new Error('Availability not found or access denied');
      }

      await prisma.mentorAvailability.delete({
        where: { id: availabilityId }
      });

      return { message: 'Availability deleted successfully' };
    } catch (error) {
      throw new Error(`Failed to delete availability: ${error.message}`);
    }
  }

  async getMentorAvailability(mentorId, filters = {}) {
    try {
      const { isActive = true, dayOfWeek } = filters;
      
      const whereClause = { mentorId };
      if (isActive !== undefined) whereClause.isActive = isActive;
      if (dayOfWeek !== undefined) whereClause.dayOfWeek = dayOfWeek;

      const availability = await prisma.mentorAvailability.findMany({
        where: whereClause,
        orderBy: [
          { dayOfWeek: 'asc' },
          { startTime: 'asc' }
        ]
      });

      return availability;
    } catch (error) {
      throw new Error(`Failed to get availability: ${error.message}`);
    }
  }

  async getAvailableTimeSlots(mentorId, startDate, endDate, duration = 60) {
    try {
      const availability = await this.getMentorAvailability(mentorId, { isActive: true });
      const existingSessions = await prisma.mentorshipSession.findMany({
        where: {
          mentorId,
          status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
          scheduledAt: {
            gte: new Date(startDate),
            lte: new Date(endDate)
          }
        },
        select: {
          scheduledAt: true,
          duration: true
        }
      });

      const timeSlots = [];
      const start = new Date(startDate);
      const end = new Date(endDate);

      for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
        const dayOfWeek = date.getDay();
        const dayAvailability = availability.filter(a => a.dayOfWeek === dayOfWeek);

        for (const avail of dayAvailability) {
          const slots = this.generateTimeSlots(
            date,
            avail.startTime,
            avail.endTime,
            duration,
            existingSessions,
            avail.timezone
          );
          timeSlots.push(...slots);
        }
      }

      return timeSlots.sort((a, b) => a.startTime - b.startTime);
    } catch (error) {
      throw new Error(`Failed to get available time slots: ${error.message}`);
    }
  }

  async bulkCreateAvailability(mentorId, availabilityList) {
    try {
      const results = [];
      const errors = [];

      for (const availabilityData of availabilityList) {
        try {
          const availability = await this.createAvailability({
            mentorId,
            ...availabilityData
          });
          results.push(availability);
        } catch (error) {
          errors.push({
            data: availabilityData,
            error: error.message
          });
        }
      }

      return {
        created: results,
        errors,
        total: availabilityList.length
      };
    } catch (error) {
      throw new Error(`Failed to bulk create availability: ${error.message}`);
    }
  }

  async getAvailabilitySummary(mentorId) {
    try {
      const availability = await this.getMentorAvailability(mentorId, { isActive: true });
      
      const summary = {
        totalSlots: availability.length,
        weeklyHours: 0,
        schedule: {}
      };

      for (const avail of availability) {
        const startMinutes = this.timeToMinutes(avail.startTime);
        const endMinutes = this.timeToMinutes(avail.endTime);
        const durationHours = (endMinutes - startMinutes) / 60;
        
        summary.weeklyHours += durationHours;
        
        const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][avail.dayOfWeek];
        if (!summary.schedule[dayName]) {
          summary.schedule[dayName] = [];
        }
        summary.schedule[dayName].push({
          startTime: avail.startTime,
          endTime: avail.endTime,
          timezone: avail.timezone
        });
      }

      return summary;
    } catch (error) {
      throw new Error(`Failed to get availability summary: ${error.message}`);
    }
  }

  timeToMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  generateTimeSlots(date, startTime, endTime, duration, existingSessions, timezone) {
    const slots = [];
    const startMinutes = this.timeToMinutes(startTime);
    const endMinutes = this.timeToMinutes(endTime);
    const slotDuration = duration;

    // Convert date to target timezone
    const targetDate = new Date(date.toLocaleString("en-US", { timeZone: timezone }));
    
    for (let minutes = startMinutes; minutes + slotDuration <= endMinutes; minutes += slotDuration) {
      const slotStart = new Date(targetDate);
      slotStart.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
      
      const slotEnd = new Date(slotStart.getTime() + slotDuration * 60 * 1000);

      // Check if slot conflicts with existing sessions
      const hasConflict = existingSessions.some(session => {
        const sessionStart = new Date(session.scheduledAt);
        const sessionEnd = new Date(sessionStart.getTime() + session.duration * 60 * 1000);
        
        return (slotStart < sessionEnd && slotEnd > sessionStart);
      });

      if (!hasConflict && slotStart > new Date()) {
        slots.push({
          startTime: slotStart,
          endTime: slotEnd,
          duration: slotDuration
        });
      }
    }

    return slots;
  }
}

module.exports = new MentorAvailabilityService();
