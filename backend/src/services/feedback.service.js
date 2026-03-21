const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class FeedbackService {
  async createFeedback(data) {
    const { sessionId, mentorId, menteeId, rating, comment } = data;
    
    try {
      // Validate session exists and is completed
      const session = await prisma.mentorshipSession.findFirst({
        where: {
          id: sessionId,
          mentorId,
          menteeId,
          status: 'COMPLETED'
        }
      });

      if (!session) {
        throw new Error('Session not found, not completed, or access denied');
      }

      // Check if feedback already exists
      const existingFeedback = await prisma.sessionFeedback.findUnique({
        where: { sessionId }
      });

      if (existingFeedback) {
        throw new Error('Feedback already submitted for this session');
      }

      // Validate rating
      if (rating < 1 || rating > 5) {
        throw new Error('Rating must be between 1 and 5');
      }

      const feedback = await prisma.sessionFeedback.create({
        data: {
          sessionId,
          mentorId,
          menteeId,
          rating,
          comment
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

      return feedback;
    } catch (error) {
      throw new Error(`Failed to create feedback: ${error.message}`);
    }
  }

  async getFeedbackBySession(sessionId, userId) {
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

      const feedback = await prisma.sessionFeedback.findUnique({
        where: { sessionId },
        include: {
          session: {
            include: {
              mentor: {
                select: { id: true, name: true, profileImage: true }
              },
              mentee: {
                select: { id: true, name: true, profileImage: true }
              }
            }
          }
        }
      });

      return feedback;
    } catch (error) {
      throw new Error(`Failed to get feedback: ${error.message}`);
    }
  }

  async getMentorFeedback(mentorId, filters = {}) {
    try {
      const { rating, startDate, endDate, page = 1, limit = 10 } = filters;
      
      const whereClause = { mentorId };
      
      if (rating) whereClause.rating = rating;
      if (startDate || endDate) {
        whereClause.createdAt = {};
        if (startDate) whereClause.createdAt.gte = new Date(startDate);
        if (endDate) whereClause.createdAt.lte = new Date(endDate);
      }

      const feedback = await prisma.sessionFeedback.findMany({
        where: whereClause,
        include: {
          session: {
            select: {
              id: true,
              title: true,
              scheduledAt: true,
              mentee: {
                select: { id: true, name: true, profileImage: true }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      });

      const total = await prisma.sessionFeedback.count({ where: whereClause });

      return {
        feedback,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      throw new Error(`Failed to get mentor feedback: ${error.message}`);
    }
  }

  async getMentorStats(mentorId) {
    try {
      const [
        totalFeedback,
        ratingStats,
        recentFeedback
      ] = await Promise.all([
        prisma.sessionFeedback.count({ where: { mentorId } }),
        prisma.sessionFeedback.groupBy({
          by: ['rating'],
          where: { mentorId },
          _count: { rating: true }
        }),
        prisma.sessionFeedback.findMany({
          where: { mentorId },
          select: { rating: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 10
        })
      ]);

      // Calculate average rating
      const avgRating = ratingStats.reduce((acc, stat) => {
        return acc + (stat.rating * stat._count.rating);
      }, 0) / totalFeedback;

      // Calculate rating distribution
      const ratingDistribution = {};
      for (let i = 1; i <= 5; i++) {
        ratingDistribution[i] = 0;
      }
      ratingStats.forEach(stat => {
        ratingDistribution[stat.rating] = stat._count.rating;
      });

      return {
        totalFeedback,
        averageRating: avgRating || 0,
        ratingDistribution,
        recentTrend: this.calculateRatingTrend(recentFeedback)
      };
    } catch (error) {
      throw new Error(`Failed to get mentor stats: ${error.message}`);
    }
  }

  async updateFeedback(feedbackId, data, userId) {
    try {
      const feedback = await prisma.sessionFeedback.findFirst({
        where: {
          id: feedbackId,
          menteeId: userId
        }
      });

      if (!feedback) {
        throw new Error('Feedback not found or access denied');
      }

      // Allow updates only within 24 hours
      const timeDiff = Date.now() - feedback.createdAt.getTime();
      if (timeDiff > 24 * 60 * 60 * 1000) {
        throw new Error('Feedback can only be updated within 24 hours');
      }

      const updatedFeedback = await prisma.sessionFeedback.update({
        where: { id: feedbackId },
        data: {
          ...data,
          updatedAt: new Date()
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

      return updatedFeedback;
    } catch (error) {
      throw new Error(`Failed to update feedback: ${error.message}`);
    }
  }

  async deleteFeedback(feedbackId, userId) {
    try {
      const feedback = await prisma.sessionFeedback.findFirst({
        where: {
          id: feedbackId,
          menteeId: userId
        }
      });

      if (!feedback) {
        throw new Error('Feedback not found or access denied');
      }

      // Allow deletion only within 24 hours
      const timeDiff = Date.now() - feedback.createdAt.getTime();
      if (timeDiff > 24 * 60 * 60 * 1000) {
        throw new Error('Feedback can only be deleted within 24 hours');
      }

      await prisma.sessionFeedback.delete({
        where: { id: feedbackId }
      });

      return { message: 'Feedback deleted successfully' };
    } catch (error) {
      throw new Error(`Failed to delete feedback: ${error.message}`);
    }
  }

  calculateRatingTrend(recentFeedback) {
    if (recentFeedback.length < 2) return 'stable';
    
    const recent = recentFeedback.slice(0, Math.floor(recentFeedback.length / 2));
    const older = recentFeedback.slice(Math.floor(recentFeedback.length / 2));
    
    const recentAvg = recent.reduce((acc, f) => acc + f.rating, 0) / recent.length;
    const olderAvg = older.reduce((acc, f) => acc + f.rating, 0) / older.length;
    
    if (recentAvg > olderAvg + 0.3) return 'improving';
    if (recentAvg < olderAvg - 0.3) return 'declining';
    return 'stable';
  }
}

module.exports = new FeedbackService();
