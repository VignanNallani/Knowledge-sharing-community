const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger.util');
const NodeCache = require('node-cache');
const EventEmitter = require('events');

const prisma = new PrismaClient();
const gamificationCache = new NodeCache({ stdTTL: 300 }); // 5 minutes cache

class GamificationService extends EventEmitter {
  constructor() {
    super();
    this.pointValues = {
      POST_CREATED: 10,
      POST_LIKED: 2,
      POST_COMMENTED: 5,
      USER_FOLLOWED: 3,
      MENTORSHIP_SESSION: 50, // for mentor
      SESSION_ATTENDED: 25, // for mentee
      ACHIEVEMENT_UNLOCKED: 100,
      BADGE_EARNED: 50,
      DAILY_LOGIN: 5,
      WEEKLY_STREAK: 35,
      MONTHLY_STREAK: 150
    };
    
    this.badgeTypes = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND'];
    this.achievementTypes = ['MENTOR_SESSIONS', 'POSTS_CREATED', 'LIKES_RECEIVED', 'COMMENTS_POSTED', 'FOLLOWERS_GAINED', 'STREAK_DAYS', 'SKILL_MASTERY', 'COMMUNITY_CONTRIBUTION'];
    this.leaderboardTypes = ['GLOBAL', 'SKILL_BASED', 'FRIEND_BASED', 'WEEKLY', 'MONTHLY'];
    
    this.initializeDefaultData();
  }

  async initializeDefaultData() {
    try {
      // Ensure default badges exist
      await this.ensureDefaultBadges();
      
      // Ensure default achievements exist
      await this.ensureDefaultAchievements();
      
      // Ensure default leaderboards exist
      await this.ensureDefaultLeaderboards();
      
      logger.info('Gamification service initialized successfully');
    } catch (error) {
      logger.error('Error initializing gamification service:', error);
    }
  }

  async ensureDefaultBadges() {
    const defaultBadges = [
      {
        name: 'First Steps',
        description: 'Created your first post',
        type: 'CONTRIBUTION',
        tier: 'BRONZE',
        icon: '/badges/first-steps.png',
        criteria: JSON.stringify({ postCount: 1 })
      },
      {
        name: 'Rising Star',
        description: 'Reached level 5',
        type: 'ACHIEVEMENT',
        tier: 'SILVER',
        icon: '/badges/rising-star.png',
        criteria: JSON.stringify({ level: 5 })
      },
      {
        name: 'Expert Mentor',
        description: 'Completed 10 mentorship sessions',
        type: 'MENTORSHIP',
        tier: 'GOLD',
        icon: '/badges/expert-mentor.png',
        criteria: JSON.stringify({ sessionCount: 10 })
      },
      {
        name: 'Community Leader',
        description: 'Gained 100 followers',
        type: 'COMMUNITY',
        tier: 'PLATINUM',
        icon: '/badges/community-leader.png',
        criteria: JSON.stringify({ followerCount: 100 })
      },
      {
        name: 'Legendary',
        description: 'Reached maximum level',
        type: 'ACHIEVEMENT',
        tier: 'DIAMOND',
        icon: '/badges/legendary.png',
        criteria: JSON.stringify({ level: 50 })
      }
    ];

    for (const badge of defaultBadges) {
      await prisma.badge.upsert({
        where: { name: badge.name },
        update: badge,
        create: badge
      });
    }
  }

  async ensureDefaultAchievements() {
    const defaultAchievements = [
      {
        name: 'First Post',
        description: 'Create your first post',
        type: 'POSTS_CREATED',
        points: 10,
        criteria: JSON.stringify({ target: 1 })
      },
      {
        name: 'Prolific Writer',
        description: 'Create 10 posts',
        type: 'POSTS_CREATED',
        points: 50,
        criteria: JSON.stringify({ target: 10 })
      },
      {
        name: 'Master Author',
        description: 'Create 50 posts',
        type: 'POSTS_CREATED',
        points: 200,
        criteria: JSON.stringify({ target: 50 })
      },
      {
        name: 'First Like',
        description: 'Receive your first like',
        type: 'LIKES_RECEIVED',
        points: 5,
        criteria: JSON.stringify({ target: 1 })
      },
      {
        name: 'Popular Content',
        description: 'Receive 100 likes',
        type: 'LIKES_RECEIVED',
        points: 100,
        criteria: JSON.stringify({ target: 100 })
      },
      {
        name: 'Viral Creator',
        description: 'Receive 1000 likes',
        type: 'LIKES_RECEIVED',
        points: 500,
        criteria: JSON.stringify({ target: 1000 })
      },
      {
        name: 'First Comment',
        description: 'Post your first comment',
        type: 'COMMENTS_POSTED',
        points: 5,
        criteria: JSON.stringify({ target: 1 })
      },
      {
        name: 'Active Participant',
        description: 'Post 50 comments',
        type: 'COMMENTS_POSTED',
        points: 50,
        criteria: JSON.stringify({ target: 50 })
      },
      {
        name: 'Conversation Master',
        description: 'Post 200 comments',
        type: 'COMMENTS_POSTED',
        points: 200,
        criteria: JSON.stringify({ target: 200 })
      },
      {
        name: 'First Follower',
        description: 'Gain your first follower',
        type: 'FOLLOWERS_GAINED',
        points: 5,
        criteria: JSON.stringify({ target: 1 })
      },
      {
        name: 'Growing Influence',
        description: 'Gain 25 followers',
        type: 'FOLLOWERS_GAINED',
        points: 50,
        criteria: JSON.stringify({ target: 25 })
      },
      {
        name: 'Community Icon',
        description: 'Gain 100 followers',
        type: 'FOLLOWERS_GAINED',
        points: 200,
        criteria: JSON.stringify({ target: 100 })
      },
      {
        name: 'Mentor Debut',
        description: 'Complete your first mentorship session',
        type: 'MENTOR_SESSIONS',
        points: 25,
        criteria: JSON.stringify({ target: 1 })
      },
      {
        name: 'Dedicated Mentor',
        description: 'Complete 25 mentorship sessions',
        type: 'MENTOR_SESSIONS',
        points: 150,
        criteria: JSON.stringify({ target: 25 })
      },
      {
        name: 'Master Mentor',
        description: 'Complete 100 mentorship sessions',
        type: 'MENTOR_SESSIONS',
        points: 500,
        criteria: JSON.stringify({ target: 100 })
      },
      {
        name: 'Week Warrior',
        description: '7-day login streak',
        type: 'STREAK_DAYS',
        points: 35,
        criteria: JSON.stringify({ target: 7 })
      },
      {
        name: 'Monthly Champion',
        description: '30-day login streak',
        type: 'STREAK_DAYS',
        points: 150,
        criteria: JSON.stringify({ target: 30 })
      },
      {
        name: 'Year Legend',
        description: '365-day login streak',
        type: 'STREAK_DAYS',
        points: 1000,
        criteria: JSON.stringify({ target: 365 })
      }
    ];

    for (const achievement of defaultAchievements) {
      await prisma.achievement.upsert({
        where: { name: achievement.name },
        update: achievement,
        create: achievement
      });
    }
  }

  async ensureDefaultLeaderboards() {
    const defaultLeaderboards = [
      {
        name: 'Global Points',
        description: 'Total points earned across all activities',
        type: 'GLOBAL'
      },
      {
        name: 'Weekly Points',
        description: 'Points earned this week',
        type: 'WEEKLY'
      },
      {
        name: 'Monthly Points',
        description: 'Points earned this month',
        type: 'MONTHLY'
      },
      {
        name: 'JavaScript Masters',
        description: 'Top JavaScript experts',
        type: 'SKILL_BASED'
      },
      {
        name: 'React Champions',
        description: 'Top React developers',
        type: 'SKILL_BASED'
      },
      {
        name: 'Node.js Experts',
        description: 'Top Node.js specialists',
        type: 'SKILL_BASED'
      },
      {
        name: 'Python Gurus',
        description: 'Top Python developers',
        type: 'SKILL_BASED'
      }
    ];

    for (const leaderboard of defaultLeaderboards) {
      await prisma.leaderboard.upsert({
        where: { name: leaderboard.name },
        update: leaderboard,
        create: leaderboard
      });
    }
  }

  async awardPoints(userId, points, activityType, entityId = null, description = null, metadata = {}) {
    try {
      const cacheKey = `user_points_${userId}`;
      
      // Create user activity record
      await prisma.userActivity.create({
        data: {
          userId,
          activityType,
          entityType: metadata.entityType || null,
          entityId,
          pointsEarned: points,
          description,
          metadata: JSON.stringify(metadata)
        }
      });

      // Update user points
      const totalPoints = await prisma.userPoint.aggregate({
        where: { userId },
        _sum: { points: true }
      });

      const currentTotal = totalPoints._sum.points || 0;
      const newTotal = currentTotal + points;

      // Create or update user point record
      await prisma.userPoint.upsert({
        where: { userId },
        update: { points: newTotal },
        create: {
          userId,
          points: newTotal,
          activityType,
          description: description || `Points awarded for ${activityType}`
        }
      });

      // Clear cache
      gamificationCache.del(cacheKey);

      // Emit points awarded event
      this.emit('pointsAwarded', {
        userId,
        points,
        currentPoints: newTotal,
        activityType,
        description
      });

      // Check for achievements
      await this.checkAndAwardAchievements(userId);

      // Update leaderboards
      await this.updateRelevantLeaderboards(userId);

      return {
        currentPoints: newTotal,
        pointsAwarded: points,
        activityType
      };
    } catch (error) {
      logger.error('Error awarding points:', error);
      throw error;
    }
  }

  calculateLevel(experiencePoints) {
    // Level calculation: 100 XP for level 1-2, 200 XP for level 2-3, 300 XP for level 3-4, etc.
    return Math.floor(Math.sqrt(2 * experiencePoints / 100 + 0.25) - 0.5) + 1;
  }

  getActivityType(sourceType) {
    const activityMap = {
      'post': 'POST_CREATED',
      'session': 'MENTORSHIP_SESSION',
      'like': 'POST_LIKED',
      'comment': 'POST_COMMENTED',
      'follow': 'USER_FOLLOWED',
      'achievement': 'ACHIEVEMENT_UNLOCKED',
      'badge': 'BADGE_EARNED',
      'login': 'DAILY_LOGIN',
      'streak': 'WEEKLY_STREAK'
    };
    return activityMap[sourceType] || 'POST_CREATED';
  }

  async checkAndAwardAchievements(userId) {
    try {
      const achievements = await prisma.achievements.findMany({
        where: { isActive: true }
      });

      const awardedAchievements = [];

      for (const achievement of achievements) {
        const userAchievement = await prisma.userAchievements.findUnique({
          where: {
            userId_achievementId: {
              userId,
              achievementId: achievement.id
            }
          }
        });

        if (!userAchievement || !userAchievement.isCompleted) {
          const progress = await this.calculateAchievementProgress(userId, achievement.achievementType, achievement.requirements);
          const shouldAward = progress >= 100;

          // Update or create user achievement record
          if (userAchievement) {
            await prisma.userAchievements.update({
              where: { id: userAchievement.id },
              data: {
                progressData: { ...userAchievement.progressData, progress },
                completionPercentage: progress,
                isCompleted: shouldAward,
                unlockedAt: shouldAward && !userAchievement.isCompleted ? new Date() : userAchievement.unlockedAt
              }
            });
          } else {
            await prisma.userAchievements.create({
              data: {
                userId,
                achievementId: achievement.id,
                progressData: { progress },
                completionPercentage: progress,
                isCompleted: shouldAward,
                unlockedAt: shouldAward ? new Date() : null
              }
            });
          }

          // Award achievement if completed
          if (shouldAward && (!userAchievement || !userAchievement.isCompleted)) {
            await this.awardPoints(userId, achievement.pointsReward, 'achievement', achievement.id, 
              `Achievement unlocked: ${achievement.name}`, achievement.requirements);

            // Award associated badge
            await this.awardBadge(userId, achievement.badgeType, achievement.name, achievement.description);

            awardedAchievements.push({
              id: achievement.id,
              name: achievement.name,
              badgeType: achievement.badgeType,
              pointsReward: achievement.pointsReward
            });

            // Emit achievement unlocked event
            this.emit('achievementUnlocked', {
              userId,
              achievement: {
                id: achievement.id,
                name: achievement.name,
                description: achievement.description,
                badgeType: achievement.badgeType,
                pointsReward: achievement.pointsReward
              }
            });
          }
        }
      }

      return awardedAchievements;
    } catch (error) {
      logger.error('Error checking achievements:', error);
      throw error;
    }
  }

  async calculateAchievementProgress(userId, achievementType, requirements) {
    try {
      const targetCount = requirements.target || 1;
      let currentCount = 0;

      switch (achievementType) {
        case 'MENTOR_SESSIONS':
          currentCount = await prisma.mentorshipSession.count({
            where: {
              mentorId: userId,
              status: 'COMPLETED'
            }
          });
          break;

        case 'POSTS_CREATED':
          currentCount = await prisma.post.count({
            where: {
              authorId: userId,
              isPublished: true
            }
          });
          break;

        case 'LIKES_RECEIVED':
          currentCount = await prisma.like.count({
            where: {
              post: {
                authorId: userId
              }
            }
          });
          break;

        case 'COMMENTS_POSTED':
          currentCount = await prisma.comment.count({
            where: {
              authorId: userId
            }
          });
          break;

        case 'FOLLOWERS_GAINED':
          currentCount = await prisma.userFollows.count({
            where: {
              followingId: userId
            }
          });
          break;

        case 'STREAK_DAYS':
          const streak = await prisma.streakTracking.findUnique({
            where: {
              userId_streakType: {
                userId,
                streakType: 'daily_login'
              }
            }
          });
          currentCount = streak?.currentStreak || 0;
          break;

        case 'SKILL_MASTERY':
          const skill = requirements.skill;
          if (skill) {
            currentCount = await prisma.mentorshipSession.count({
              where: {
                mentorId: userId,
                status: 'COMPLETED',
                mentor: {
                  skills: {
                    has: skill
                  }
                }
              }
            });
          }
          break;

        case 'COMMUNITY_CONTRIBUTION':
          const postCount = await prisma.post.count({
            where: {
              authorId: userId,
              isPublished: true
            }
          });
          const commentCount = await prisma.comment.count({
            where: {
              authorId: userId
            }
          });
          const sessionCount = await prisma.mentorshipSession.count({
            where: {
              mentorId: userId,
              status: 'COMPLETED'
            }
          });
          currentCount = (postCount * 2) + commentCount + (sessionCount * 5);
          break;

        default:
          currentCount = 0;
      }

      // Calculate percentage progress
      return Math.min(100, Math.floor((currentCount * 100) / targetCount));
    } catch (error) {
      logger.error('Error calculating achievement progress:', error);
      return 0;
    }
  }

  async awardBadge(userId, badgeType, name, description) {
    try {
      // Find or create badge
      let badge = await prisma.badges.findUnique({
        where: { name }
      });

      if (!badge) {
        badge = await prisma.badges.create({
          data: {
            name,
            description,
            badgeType,
            pointsValue: this.getBadgePointsValue(badgeType)
          }
        });
      }

      // Award badge to user if not already awarded
      const userBadge = await prisma.userBadges.findUnique({
        where: {
          userId_badgeId: {
            userId,
            badgeId: badge.id
          }
        }
      });

      if (!userBadge) {
        await prisma.userBadges.create({
          data: {
            userId,
            badgeId: badge
          }
        });

        // Emit badge earned event
        this.emit('badgeEarned', {
          userId,
          badge: {
            id: badge.id,
            name: badge.name,
            description: badge.description,
            badgeType: badge.badgeType,
            iconUrl: badge.iconUrl,
            pointsValue: badge.pointsValue
          }
        });

        return badge.id;
      }

      return userBadge.badgeId;
    } catch (error) {
      logger.error('Error awarding badge:', error);
      throw error;
    }
  }

  getBadgePointsValue(badgeType) {
    const badgeValues = {
      'BRONZE': 10,
      'SILVER': 25,
      'GOLD': 50,
      'PLATINUM': 100,
      'DIAMOND': 200
    };
    return badgeValues[badgeType] || 10;
  }

  async updateStreak(userId, streakType, activityDate = new Date()) {
    try {
      const streakRecord = await prisma.streakTracking.findUnique({
        where: {
          userId_streakType: {
            userId,
            streakType
          }
        }
      });

      let newStreak = 1;
      let shouldReset = false;

      if (streakRecord?.lastActivityDate) {
        const daysDiff = Math.floor((activityDate - streakRecord.lastActivityDate) / (1000 * 60 * 60 * 24));
        
        switch (streakType) {
          case 'daily_login':
            shouldReset = daysDiff > 1;
            break;
          case 'weekly_activity':
            shouldReset = daysDiff > 7;
            break;
          case 'mentorship_streak':
            shouldReset = daysDiff > 1;
            break;
        }
      }

      if (shouldReset) {
        newStreak = 1;
      } else if (streakRecord) {
        newStreak = streakRecord.currentStreak + 1;
      }

      // Update streak record
      if (streakRecord) {
        await prisma.streakTracking.update({
          where: { id: streakRecord.id },
          data: {
            currentStreak: newStreak,
            longestStreak: Math.max(streakRecord.longestStreak, newStreak),
            lastActivityDate: activityDate
          }
        });
      } else {
        await prisma.streakTracking.create({
          data: {
            userId,
            streakType,
            currentStreak: newStreak,
            longestStreak: newStreak,
            lastActivityDate: activityDate
          }
        });
      }

      // Award points for streak milestones
      const streakMilestones = [3, 7, 14, 30, 60, 100];
      if (streakMilestones.includes(newStreak)) {
        await this.awardPoints(userId, newStreak * 10, 'streak', null, 
          `Streak milestone: ${newStreak} days`, 
          { streakType, streakDays: newStreak });

        // Emit streak milestone event
        this.emit('streakMilestone', {
          userId,
          streakType,
          currentStreak: newStreak,
          milestone: newStreak
        });
      }

      return newStreak;
    } catch (error) {
      logger.error('Error updating streak:', error);
      throw error;
    }
  }

  async getUserPoints(userId) {
    try {
      const cacheKey = `user_points_${userId}`;
      let userPoints = gamificationCache.get(cacheKey);

      if (!userPoints) {
        const totalPoints = await prisma.userPoint.aggregate({
          where: { userId },
          _sum: { points: true }
        });

        userPoints = {
          userId,
          totalPoints: totalPoints._sum.points || 0,
          level: this.calculateLevel(totalPoints._sum.points || 0)
        };

        gamificationCache.set(cacheKey, userPoints);
      }

      return userPoints;
    } catch (error) {
      logger.error('Error getting user points:', error);
      throw error;
    }
  }

  async getUserBadges(userId) {
    try {
      const cacheKey = `user_badges_${userId}`;
      let badges = gamificationCache.get(cacheKey);

      if (!badges) {
        badges = await prisma.userBadge.findMany({
          where: { userId },
          include: {
            badge: true
          },
          orderBy: {
            earnedAt: 'desc'
          }
        });

        gamificationCache.set(cacheKey, badges);
      }

      return badges;
    } catch (error) {
      logger.error('Error getting user badges:', error);
      throw error;
    }
  }

  async getUserAchievements(userId) {
    try {
      const cacheKey = `user_achievements_${userId}`;
      let achievements = gamificationCache.get(cacheKey);

      if (!achievements) {
        achievements = await prisma.userAchievement.findMany({
          where: { userId },
          include: {
            achievement: true
          },
          orderBy: {
            progress: 'desc'
          }
        });

        gamificationCache.set(cacheKey, achievements);
      }

      return achievements;
    } catch (error) {
      logger.error('Error getting user achievements:', error);
      throw error;
    }
  }

  async getLeaderboard(leaderboardType, skillFilter = null, limit = 50) {
    try {
      const cacheKey = `leaderboard_${leaderboardType}_${skillFilter}_${limit}`;
      let leaderboard = gamificationCache.get(cacheKey);

      if (!leaderboard) {
        const leaderboardRecord = await prisma.leaderboards.findFirst({
          where: {
            leaderboardType,
            skillFilter,
            isActive: true
          }
        });

        if (!leaderboardRecord) {
          return [];
        }

        leaderboard = await prisma.leaderboardEntries.findMany({
          where: {
            leaderboardId: leaderboardRecord.id
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                profileImage: true
              }
            },
            userPoints: {
              select: {
                level: true,
                totalPointsEarned: true
              }
            }
          },
          orderBy: {
            rankPosition: 'asc'
          },
          take: limit
        });

        gamificationCache.set(cacheKey, leaderboard);
      }

      return leaderboard;
    } catch (error) {
      logger.error('Error getting leaderboard:', error);
      throw error;
    }
  }

  async getUserLeaderboardRank(userId, leaderboardType, skillFilter = null) {
    try {
      const cacheKey = `user_rank_${userId}_${leaderboardType}_${skillFilter}`;
      let rank = gamificationCache.get(cacheKey);

      if (!rank) {
        const leaderboardRecord = await prisma.leaderboards.findFirst({
          where: {
            leaderboardType,
            skillFilter,
            isActive: true
          }
        });

        if (leaderboardRecord) {
          const entry = await prisma.leaderboardEntries.findFirst({
            where: {
              leaderboardId: leaderboardRecord.id,
              userId
            },
            include: {
              leaderboard: true
            }
          });

          if (entry) {
            rank = {
              rankPosition: entry.rankPosition,
              totalUsers: await prisma.leaderboardEntries.count({
                where: { leaderboardId: leaderboardRecord.id }
              }),
              leaderboardName: leaderboardRecord.name,
              score: entry.score,
              previousRank: entry.previousRank
            };
          }
        }

        gamificationCache.set(cacheKey, rank);
      }

      return rank;
    } catch (error) {
      logger.error('Error getting user leaderboard rank:', error);
      throw error;
    }
  }

  async updateLeaderboard(leaderboardId) {
    try {
      const leaderboardRecord = await prisma.leaderboards.findUnique({
        where: { id: leaderboardId }
      });

      if (!leaderboardRecord) {
        return 0;
      }

      // Clear existing entries
      await prisma.leaderboardEntries.deleteMany({
        where: { leaderboardId }
      });

      let entries = [];

      switch (leaderboardRecord.leaderboardType) {
        case 'GLOBAL':
          entries = await this.getGlobalLeaderboardEntries(leaderboardRecord);
          break;
        case 'SKILL_BASED':
          entries = await this.getSkillBasedLeaderboardEntries(leaderboardRecord);
          break;
        case 'FRIEND_BASED':
          entries = await this.getFriendBasedLeaderboardEntries(leaderboardRecord);
          break;
        case 'WEEKLY':
          entries = await this.getWeeklyLeaderboardEntries(leaderboardRecord);
          break;
        case 'MONTHLY':
          entries = await this.getMonthlyLeaderboardEntries(leaderboardRecord);
          break;
      }

      // Insert new entries with ranks
      let rankCounter = 1;
      let previousScore = null;
      let rankOffset = 0;

      for (const entry of entries) {
        if (previousScore !== null && entry.score === previousScore) {
          rankOffset++;
        } else {
          rankCounter += rankOffset;
          rankOffset = 0;
        }

        await prisma.leaderboardEntries.create({
          data: {
            leaderboardId,
            userId: entry.userId,
            rankPosition: rankCounter,
            score: entry.score,
            metadata: entry.metadata || {}
          }
        });

        previousScore = entry.score;
      }

      // Update leaderboard metadata
      await prisma.leaderboards.update({
        where: { id: leaderboardId },
        data: {
          lastResetAt: new Date(),
          updatedAt: new Date()
        }
      });

      // Clear cache
      gamificationCache.del(`leaderboard_${leaderboardRecord.leaderboardType}_${leaderboardRecord.skillFilter}`);

      return entries.length;
    } catch (error) {
      logger.error('Error updating leaderboard:', error);
      throw error;
    }
  }

  async getGlobalLeaderboardEntries(leaderboardRecord) {
    return await prisma.userPoints.findMany({
      select: {
        userId: true,
        totalPointsEarned: true
      },
      orderBy: {
        totalPointsEarned: 'desc'
      },
      take: leaderboardRecord.maxEntries
    });
  }

  async getSkillBasedLeaderboardEntries(leaderboardRecord) {
    const usersWithSkill = await prisma.user.findMany({
      where: {
        skills: {
          has: leaderboardRecord.skillFilter
        }
      },
      select: {
        id: true
      }
    });

    const entries = [];
    for (const user of usersWithSkill) {
      const sessionCount = await prisma.mentorshipSession.count({
        where: {
          mentorId: user.id,
          status: 'COMPLETED',
          mentor: {
            skills: {
              has: leaderboardRecord.skillFilter
            }
          }
        }
      });

      entries.push({
        userId: user.id,
        score: sessionCount * 10,
        metadata: { sessionCount }
      });
    }

    return entries.sort((a, b) => b.score - a.score).slice(0, leaderboardRecord.maxEntries);
  }

  async getFriendBasedLeaderboardEntries(leaderboardRecord) {
    // This would need to be implemented based on user relationships
    // For now, return empty
    return [];
  }

  async getWeeklyLeaderboardEntries(leaderboardRecord) {
    const weeklyPoints = await prisma.activityLog.groupBy({
      by: ['userId'],
      where: {
        createdAt: {
          gte: new Date(new Date().setDate(new Date().getDate() - 7))
        }
      },
      _sum: {
        pointsEarned: true
      },
      orderBy: {
        _sum: {
          pointsEarned: 'desc'
        }
      },
      take: leaderboardRecord.maxEntries
    });

    return weeklyPoints.map(entry => ({
      userId: entry.userId,
      score: entry._sum.pointsEarned || 0
    }));
  }

  async getMonthlyLeaderboardEntries(leaderboardRecord) {
    const monthlyPoints = await prisma.activityLog.groupBy({
      by: ['userId'],
      where: {
        createdAt: {
          gte: new Date(new Date().setDate(1))
        }
      },
      _sum: {
        pointsEarned: true
      },
      orderBy: {
        _sum: {
          pointsEarned: 'desc'
        }
      },
      take: leaderboardRecord.maxEntries
    });

    return monthlyPoints.map(entry => ({
      userId: entry.userId,
      score: entry._sum.pointsEarned || 0
    }));
  }

  async updateRelevantLeaderboards(userId) {
    try {
      // Update global leaderboards
      const globalLeaderboards = await prisma.leaderboards.findMany({
        where: {
          leaderboardType: 'GLOBAL',
          isActive: true
        }
      });

      for (const leaderboard of globalLeaderboards) {
        await this.updateLeaderboard(leaderboard.id);
      }

      // Update skill-based leaderboards for user's skills
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { skills: true }
      });

      if (user?.skills) {
        for (const skill of user.skills) {
          const skillLeaderboard = await prisma.leaderboards.findFirst({
            where: {
              leaderboardType: 'SKILL_BASED',
              skillFilter: skill,
              isActive: true
            }
          });

          if (skillLeaderboard) {
            await this.updateLeaderboard(skillLeaderboard.id);
          }
        }
      }

      // Emit leaderboard updated event
      this.emit('leaderboardUpdated', { userId });
    } catch (error) {
      logger.error('Error updating relevant leaderboards:', error);
    }
  }

  async getUserGamificationSummary(userId) {
    try {
      const cacheKey = `user_summary_${userId}`;
      let summary = gamificationCache.get(cacheKey);

      if (!summary) {
        const [userPoints, userBadges, userAchievements, dailyStreak, weeklyStreak] = await Promise.all([
          this.getUserPoints(userId),
          this.getUserBadges(userId),
          this.getUserAchievements(userId),
          prisma.streakTracking.findUnique({
            where: {
              userId_streakType: {
                userId,
                streakType: 'daily_login'
              }
            }
          }),
          prisma.streakTracking.findUnique({
            where: {
              userId_streakType: {
                userId,
                streakType: 'weekly_activity'
              }
            }
          })
        ]);

        summary = {
          points: userPoints,
          badges: userBadges,
          achievements: userAchievements,
          dailyStreak: dailyStreak?.currentStreak || 0,
          weeklyStreak: weeklyStreak?.currentStreak || 0,
          completedAchievements: userAchievements.filter(a => a.isCompleted).length,
          totalAchievements: userAchievements.length
        };

        gamificationCache.set(cacheKey, summary);
      }

      return summary;
    } catch (error) {
      logger.error('Error getting user gamification summary:', error);
      throw error;
    }
  }

  async getUserActivityHistory(userId, limit = 50) {
    try {
      const activities = await prisma.activityLog.findMany({
        where: { userId },
        orderBy: {
          createdAt: 'desc'
        },
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              profileImage: true
            }
          }
        }
      });

      return activities;
    } catch (error) {
      logger.error('Error getting user activity history:', error);
      throw error;
    }
  }

  async getPointTransactions(userId, limit = 50) {
    try {
      const transactions = await prisma.pointTransactions.findMany({
        where: { userId },
        orderBy: {
          createdAt: 'desc'
        },
        take: limit
      });

      return transactions;
    } catch (error) {
      logger.error('Error getting point transactions:', error);
      throw error;
    }
  }

  async initializeUserGamification(userId) {
    try {
      // Create user points record
      await prisma.userPoints.upsert({
        where: { userId },
        update: {},
        create: {
          userId,
          currentPoints: 0,
          totalPointsEarned: 0,
          experiencePoints: 0,
          level: 1
        }
      });

      // Create gamification preferences
      await prisma.gamificationPreferences.upsert({
        where: { userId },
        update: {},
        create: {
          userId
        }
      });

      // Initialize daily login streak
      await prisma.streakTracking.upsert({
        where: {
          userId_streakType: {
            userId,
            streakType: 'daily_login'
          }
        },
        update: {},
        create: {
          userId,
          streakType: 'daily_login',
          currentStreak: 0,
          longestStreak: 0,
          lastActivityDate: new Date()
        }
      });

      // Initialize weekly activity streak
      await prisma.streakTracking.upsert({
        where: {
          userId_streakType: {
            userId,
            streakType: 'weekly_activity'
          }
        },
        update: {},
        create: {
          userId,
          streakType: 'weekly_activity',
          currentStreak: 0,
          longestStreak: 0,
          lastActivityDate: new Date()
        }
      });

      logger.info(`Initialized gamification for user ${userId}`);
    } catch (error) {
      logger.error('Error initializing user gamification:', error);
      throw error;
    }
  }

  async updateAllLeaderboards() {
    try {
      const leaderboards = await prisma.leaderboards.findMany({
        where: { isActive: true }
      });

      let totalUpdated = 0;
      for (const leaderboard of leaderboards) {
        totalUpdated += await this.updateLeaderboard(leaderboard.id);
      }

      logger.info(`Updated ${totalUpdated} entries across ${leaderboards.length} leaderboards`);
      return totalUpdated;
    } catch (error) {
      logger.error('Error updating all leaderboards:', error);
      throw error;
    }
  }

  async getGamificationStats() {
    try {
      const [
        totalUsers,
        totalPointsAwarded,
        totalBadgesEarned,
        totalAchievementsUnlocked,
        activeStreaks,
        leaderboardEntries
      ] = await Promise.all([
        prisma.userPoints.count(),
        prisma.userPoints.aggregate({
          _sum: { totalPointsEarned: true }
        }),
        prisma.userBadges.count(),
        prisma.userAchievements.count({
          where: { isCompleted: true }
        }),
        prisma.streakTracking.aggregate({
          _sum: { currentStreak: true }
        }),
        prisma.leaderboardEntries.count()
      ]);

      return {
        totalUsers,
        totalPointsAwarded: totalPointsAwarded._sum.totalPointsEarned || 0,
        totalBadgesEarned,
        totalAchievementsUnlocked,
        activeStreaks: activeStreaks._sum.currentStreak || 0,
        leaderboardEntries
      };
    } catch (error) {
      logger.error('Error getting gamification stats:', error);
      throw error;
    }
  }

  clearCache(userId = null) {
    if (userId) {
      // Clear user-specific cache
      gamificationCache.del(`user_points_${userId}`);
      gamificationCache.del(`user_badges_${userId}_true`);
      gamificationCache.del(`user_badges_${userId}_false`);
      gamificationCache.del(`user_achievements_${userId}`);
      gamificationCache.del(`user_summary_${userId}`);
      gamificationCache.del(`user_rank_${userId}_GLOBAL_null`);
      gamificationCache.del(`user_rank_${userId}_SKILL_BASED_javascript`);
      gamificationCache.del(`user_rank_${userId}_SKILL_BASED_react`);
      gamificationCache.del(`user_rank_${userId}_SKILL_BASED_nodejs`);
      gamificationCache.del(`user_rank_${userId}_SKILL_BASED_python`);
    } else {
      // Clear all cache
      gamificationCache.flushAll();
    }
  }

  getCacheStats() {
    return gamificationCache.getStats();
  }
}

module.exports = new GamificationService();
