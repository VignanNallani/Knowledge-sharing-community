const { PrismaClient } = require('@prisma/client');
const { sendEmail } = require('../utils/email.util');
const prisma = new PrismaClient();

class ReminderService {
  async createReminder(data) {
    const { sessionId, mentorId, menteeId, reminderType, scheduledAt } = data;
    
    try {
      const reminder = await prisma.sessionReminder.create({
        data: {
          sessionId,
          mentorId,
          menteeId,
          reminderType,
          scheduledAt: new Date(scheduledAt)
        },
        include: {
          session: {
            include: {
              mentor: {
                select: { id: true, name: true, email: true }
              },
              mentee: {
                select: { id: true, name: true, email: true }
              }
            }
          }
        }
      });

      return reminder;
    } catch (error) {
      throw new Error(`Failed to create reminder: ${error.message}`);
    }
  }

  async sendReminder(reminderId) {
    try {
      const reminder = await prisma.sessionReminder.findUnique({
        where: { id: reminderId },
        include: {
          session: {
            include: {
              mentor: {
                select: { id: true, name: true, email: true }
              },
              mentee: {
                select: { id: true, name: true, email: true }
              }
            }
          }
        }
      });

      if (!reminder) {
        throw new Error('Reminder not found');
      }

      if (reminder.status !== 'PENDING') {
        throw new Error('Reminder already processed');
      }

      const { session, mentor, mentee } = reminder;
      const emailData = this.getEmailContent(reminder.reminderType, session, mentor, mentee);

      // Send emails to both mentor and mentee
      const [mentorEmailSent, menteeEmailSent] = await Promise.all([
        sendEmail({
          to: mentor.email,
          ...emailData.mentor
        }),
        sendEmail({
          to: mentee.email,
          ...emailData.mentee
        })
      ]);

      // Update reminder status
      const updatedReminder = await prisma.sessionReminder.update({
        where: { id: reminderId },
        data: {
          status: mentorEmailSent && menteeEmailSent ? 'SENT' : 'FAILED',
          sentAt: new Date()
        }
      });

      return updatedReminder;
    } catch (error) {
      // Mark as failed if error occurs
      await prisma.sessionReminder.update({
        where: { id: reminderId },
        data: {
          status: 'FAILED',
          sentAt: new Date()
        }
      }).catch(() => {}); // Ignore update errors

      throw new Error(`Failed to send reminder: ${error.message}`);
    }
  }

  async getPendingReminders() {
    try {
      const reminders = await prisma.sessionReminder.findMany({
        where: {
          status: 'PENDING',
          scheduledAt: { lte: new Date() }
        },
        include: {
          session: {
            include: {
              mentor: {
                select: { id: true, name: true, email: true }
              },
              mentee: {
                select: { id: true, name: true, email: true }
              }
            }
          }
        },
        orderBy: { scheduledAt: 'asc' }
      });

      return reminders;
    } catch (error) {
      throw new Error(`Failed to get pending reminders: ${error.message}`);
    }
  }

  async processPendingReminders() {
    try {
      const pendingReminders = await this.getPendingReminders();
      const results = [];

      for (const reminder of pendingReminders) {
        try {
          const result = await this.sendReminder(reminder.id);
          results.push({
            reminderId: reminder.id,
            status: 'success',
            result
          });
        } catch (error) {
          results.push({
            reminderId: reminder.id,
            status: 'error',
            error: error.message
          });
        }
      }

      return results;
    } catch (error) {
      throw new Error(`Failed to process pending reminders: ${error.message}`);
    }
  }

  async getReminders(userId, role, filters = {}) {
    try {
      const { status, reminderType, startDate, endDate, page = 1, limit = 10 } = filters;
      
      const whereClause = role === 'MENTOR' 
        ? { mentorId: userId }
        : { menteeId: userId };

      if (status) whereClause.status = status;
      if (reminderType) whereClause.reminderType = reminderType;
      if (startDate || endDate) {
        whereClause.scheduledAt = {};
        if (startDate) whereClause.scheduledAt.gte = new Date(startDate);
        if (endDate) whereClause.scheduledAt.lte = new Date(endDate);
      }

      const reminders = await prisma.sessionReminder.findMany({
        where: whereClause,
        include: {
          session: {
            select: {
              id: true,
              title: true,
              scheduledAt: true,
              status: true,
              mentor: {
                select: { id: true, name: true, profileImage: true }
              },
              mentee: {
                select: { id: true, name: true, profileImage: true }
              }
            }
          }
        },
        orderBy: { scheduledAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      });

      const total = await prisma.sessionReminder.count({ where: whereClause });

      return {
        reminders,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      throw new Error(`Failed to get reminders: ${error.message}`);
    }
  }

  async cancelReminders(sessionId) {
    try {
      const updatedReminders = await prisma.sessionReminder.updateMany({
        where: {
          sessionId,
          status: 'PENDING'
        },
        data: {
          status: 'FAILED'
        }
      });

      return {
        cancelled: updatedReminders.count,
        message: `${updatedReminders.count} reminders cancelled`
      };
    } catch (error) {
      throw new Error(`Failed to cancel reminders: ${error.message}`);
    }
  }

  async rescheduleReminder(reminderId, newScheduledAt) {
    try {
      const reminder = await prisma.sessionReminder.findUnique({
        where: { id: reminderId }
      });

      if (!reminder) {
        throw new Error('Reminder not found');
      }

      if (reminder.status !== 'PENDING') {
        throw new Error('Can only reschedule pending reminders');
      }

      const updatedReminder = await prisma.sessionReminder.update({
        where: { id: reminderId },
        data: {
          scheduledAt: new Date(newScheduledAt)
        }
      });

      return updatedReminder;
    } catch (error) {
      throw new Error(`Failed to reschedule reminder: ${error.message}`);
    }
  }

  getEmailContent(reminderType, session, mentor, mentee) {
    const sessionTime = session.scheduledAt.toLocaleString();
    const meetUrl = session.meetUrl;

    switch (reminderType) {
      case 'SESSION_START':
        return {
          mentor: {
            subject: `Session Reminder: ${session.title}`,
            template: 'session-reminder-mentor',
            data: {
              mentorName: mentor.name,
              menteeName: mentee.name,
              sessionTitle: session.title,
              sessionTime,
              meetUrl,
              duration: session.duration
            }
          },
          mentee: {
            subject: `Session Reminder: ${session.title}`,
            template: 'session-reminder-mentee',
            data: {
              menteeName: mentee.name,
              mentorName: mentor.name,
              sessionTitle: session.title,
              sessionTime,
              meetUrl,
              duration: session.duration
            }
          }
        };

      case 'SESSION_END':
        return {
          mentor: {
            subject: `Session Completed: ${session.title}`,
            template: 'session-completed-mentor',
            data: {
              mentorName: mentor.name,
              menteeName: mentee.name,
              sessionTitle: session.title,
              sessionTime
            }
          },
          mentee: {
            subject: `Session Completed: ${session.title}`,
            template: 'session-completed-mentee',
            data: {
              menteeName: mentee.name,
              mentorName: mentor.name,
              sessionTitle: session.title,
              sessionTime
            }
          }
        };

      case 'FEEDBACK_REQUEST':
        return {
          mentor: {
            subject: `Feedback Request: ${session.title}`,
            template: 'feedback-request-mentor',
            data: {
              mentorName: mentor.name,
              menteeName: mentee.name,
              sessionTitle: session.title,
              sessionTime
            }
          },
          mentee: {
            subject: `Please Rate Your Session: ${session.title}`,
            template: 'feedback-request-mentee',
            data: {
              menteeName: mentee.name,
              mentorName: mentor.name,
              sessionTitle: session.title,
              sessionTime
            }
          }
        };

      default:
        throw new Error(`Unknown reminder type: ${reminderType}`);
    }
  }
}

module.exports = new ReminderService();
