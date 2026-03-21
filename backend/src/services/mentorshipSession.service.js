const { PrismaClient } = require('@prisma/client');
const { generateMeetUrl } = require('../utils/meeting.util');
const { createReminder } = require('../services/reminder.service');
const prisma = new PrismaClient();

class MentorshipSessionService {
  async createSession(data) {
    const { mentorshipId, title, description, scheduledAt, duration, mentorId, menteeId } = data;
    
    try {
      const session = await prisma.mentorshipSession.create({
        data: {
          mentorshipId,
          mentorId,
          menteeId,
          title,
          description,
          scheduledAt: new Date(scheduledAt),
          duration,
          meetUrl: generateMeetUrl(),
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

      // Create reminders for the session
      await this.createSessionReminders(session);

      return session;
    } catch (error) {
      throw new Error(`Failed to create session: ${error.message}`);
    }
  }

  async updateSession(sessionId, data, userId) {
    try {
      const session = await prisma.mentorshipSession.findFirst({
        where: {
          id: sessionId,
          OR: [
            { mentorId: userId },
            { menteeId: userId }
          ]
        }
      });

      if (!session) {
        throw new Error('Session not found or access denied');
      }

      const updatedSession = await prisma.mentorshipSession.update({
        where: { id: sessionId },
        data: {
          ...data,
          updatedAt: new Date()
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

      return updatedSession;
    } catch (error) {
      throw new Error(`Failed to update session: ${error.message}`);
    }
  }

  async cancelSession(sessionId, userId, reason) {
    try {
      const session = await prisma.mentorshipSession.findFirst({
        where: {
          id: sessionId,
          OR: [
            { mentorId: userId },
            { menteeId: userId }
          ]
        }
      });

      if (!session) {
        throw new Error('Session not found or access denied');
      }

      if (session.status === 'CANCELLED') {
        throw new Error('Session is already cancelled');
      }

      const updatedSession = await prisma.mentorshipSession.update({
        where: { id: sessionId },
        data: {
          status: 'CANCELLED',
          notes: reason || session.notes,
          updatedAt: new Date()
        }
      });

      // Cancel pending reminders
      await prisma.sessionReminder.updateMany({
        where: {
          sessionId,
          status: 'PENDING'
        },
        data: {
          status: 'FAILED'
        }
      });

      return updatedSession;
    } catch (error) {
      throw new Error(`Failed to cancel session: ${error.message}`);
    }
  }

  async completeSession(sessionId, userId) {
    try {
      const session = await prisma.mentorshipSession.findFirst({
        where: {
          id: sessionId,
          mentorId: userId
        }
      });

      if (!session) {
        throw new Error('Session not found or access denied');
      }

      const updatedSession = await prisma.mentorshipSession.update({
        where: { id: sessionId },
        data: {
          status: 'COMPLETED',
          updatedAt: new Date()
        }
      });

      // Schedule feedback reminder
      await createReminder({
        sessionId,
        mentorId: session.mentorId,
        menteeId: session.menteeId,
        reminderType: 'FEEDBACK_REQUEST',
        scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours later
      });

      return updatedSession;
    } catch (error) {
      throw new Error(`Failed to complete session: ${error.message}`);
    }
  }

  async getSessions(userId, role, filters = {}) {
    try {
      const { status, startDate, endDate, page = 1, limit = 10 } = filters;
      
      const whereClause = role === 'MENTOR' 
        ? { mentorId: userId }
        : { menteeId: userId };

      if (status) whereClause.status = status;
      if (startDate || endDate) {
        whereClause.scheduledAt = {};
        if (startDate) whereClause.scheduledAt.gte = new Date(startDate);
        if (endDate) whereClause.scheduledAt.lte = new Date(endDate);
      }

      const sessions = await prisma.mentorshipSession.findMany({
        where: whereClause,
        include: {
          mentor: {
            select: { id: true, name: true, email: true, profileImage: true }
          },
          mentee: {
            select: { id: true, name: true, email: true, profileImage: true }
          },
          feedback: true
        },
        orderBy: { scheduledAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      });

      const total = await prisma.mentorshipSession.count({ where: whereClause });

      return {
        sessions,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      throw new Error(`Failed to get sessions: ${error.message}`);
    }
  }

  async getSessionById(sessionId, userId) {
    try {
      const session = await prisma.mentorshipSession.findFirst({
        where: {
          id: sessionId,
          OR: [
            { mentorId: userId },
            { menteeId: userId }
          ]
        },
        include: {
          mentor: {
            select: { id: true, name: true, email: true, profileImage: true, bio: true }
          },
          mentee: {
            select: { id: true, name: true, email: true, profileImage: true, bio: true }
          },
          feedback: true,
          reminders: {
            where: { status: 'PENDING' },
            orderBy: { scheduledAt: 'asc' }
          }
        }
      });

      if (!session) {
        throw new Error('Session not found or access denied');
      }

      return session;
    } catch (error) {
      throw new Error(`Failed to get session: ${error.message}`);
    }
  }

  async createSessionReminders(session) {
    const reminderTimes = [
      { type: 'SESSION_START', offset: 15 * 60 * 1000 }, // 15 minutes before
      { type: 'SESSION_START', offset: 60 * 60 * 1000 }, // 1 hour before
      { type: 'SESSION_START', offset: 24 * 60 * 60 * 1000 }, // 24 hours before
    ];

    const reminders = reminderTimes.map(({ type, offset }) => ({
      sessionId: session.id,
      mentorId: session.mentorId,
      menteeId: session.menteeId,
      reminderType: type,
      scheduledAt: new Date(session.scheduledAt.getTime() - offset),
    }));

    await prisma.sessionReminder.createMany({
      data: reminders
    });
  }

  async getSessionStats(userId, role) {
    try {
      const whereClause = role === 'MENTOR' 
        ? { mentorId: userId }
        : { menteeId: userId };

      const [
        totalSessions,
        completedSessions,
        cancelledSessions,
        upcomingSessions,
        avgRating
      ] = await Promise.all([
        prisma.mentorshipSession.count({ where: whereClause }),
        prisma.mentorshipSession.count({ 
          where: { ...whereClause, status: 'COMPLETED' }
        }),
        prisma.mentorshipSession.count({ 
          where: { ...whereClause, status: 'CANCELLED' }
        }),
        prisma.mentorshipSession.count({ 
          where: { 
            ...whereClause, 
            status: 'SCHEDULED',
            scheduledAt: { gte: new Date() }
          }
        }),
        prisma.sessionFeedback.aggregate({
          where: { [role === 'MENTOR' ? 'mentorId' : 'menteeId']: userId },
          _avg: { rating: true }
        })
      ]);

      return {
        totalSessions,
        completedSessions,
        cancelledSessions,
        upcomingSessions,
        completionRate: totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0,
        averageRating: avgRating._avg.rating || 0
      };
    } catch (error) {
      throw new Error(`Failed to get session stats: ${error.message}`);
    }
  }
}

module.exports = new MentorshipSessionService();
