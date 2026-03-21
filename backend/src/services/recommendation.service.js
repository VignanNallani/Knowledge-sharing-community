const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger.util');
const NodeCache = require('node-cache');

const prisma = new PrismaClient();
const recommendationCache = new NodeCache({ stdTTL: 300 }); // 5 minutes cache

class RecommendationService {
  constructor() {
    this.algorithms = new Map();
    this.defaultAlgorithm = 'COLLABORATIVE_FILTERING';
    this.cacheStats = {
      hits: 0,
      misses: 0,
      total: 0
    };
    this.initializeAlgorithms();
  }

  initializeAlgorithms() {
    // Initialize default recommendation algorithms
    this.algorithms.set('COLLABORATIVE_FILTERING', {
      name: 'Collaborative Filtering',
      weight: 1.0,
      description: 'Collaborative filtering based on user similarities',
      config: {
        min_common_items: 1,
        similarity_threshold: 0.1,
        boost_recent: true
      }
    });

    this.algorithms.set('CONTENT_BASED', {
      name: 'Content-Based Filtering',
      weight: 0.8,
      description: 'Content similarity based recommendations',
      config: {
        similarity_threshold: 0.3,
        content_weight: 0.7,
        engagement_weight: 0.3
      }
    });

    this.algorithms.set('SKILL_BASED', {
      user: 'Skill-Based Filtering',
      weight: 0.9,
      description: 'Skill-based mentor recommendations',
      config: {
        skill_match_threshold: 0.6,
        experience_weight: 0.3,
        rating_weight: 0.4,
        availability_weight: 0.3
      }
    });

    this.algorithms.set('TRENDING_BASED', {
      name: 'Trending Content',
      weight: 0.7,
      description: 'Trending content recommendations',
      config: {
        time_window_hours: 24,
        engagement_weight: 0.4,
        recency_weight: 0.3,
        quality_weight: 0.3
      }
    });

    this.algorithms.set('HYBRID_RECOMMENDATION', {
      name: 'Hybrid Recommendation',
      weight: 1.0,
      description: 'Hybrid approach combining multiple algorithms',
      config: {
        collaborative_weight: 0.4,
        content_weight: 0.3,
        trending_weight: 0.3
      }
    });

    this.algorithms.set('POPULARITY_BASED', {
      name: 'Popularity-Based',
      weight: 0.6,
      description: 'Popularity-based recommendations',
      config: {
        likes_weight: 0.4,
        comments_weight: 0.3,
        shares_weight: 0.3
      }
    });
  }

  async generateRecommendations(userId, type, limit = 10, filters = {}) {
    try {
      const cacheKey = `recommendations_${userId}_${type}_${limit}_${JSON.stringify(filters)}`;
      let recommendations = recommendationCache.get(cacheKey);

      if (!recommendations) {
        // Get user preferences
        const preferences = await this.getUserPreferences(userId);
        
        // Choose algorithm based on type
        const algorithmType = this.getAlgorithmForType(type, preferences);
        
        // Generate recommendations based on algorithm
        switch (algorithmType) {
          case 'MENTOR':
            recommendations = await this.generateMentorRecommendations(userId, limit, filters, preferences);
            break;
          case 'SESSION':
            recommendations = await this.generateSessionRecommendations(userId, limit, filters, preferences);
            break;
          case 'POST':
            recommendations = await this.generatePostRecommendations(userId, limit, filters, preferences);
            break;
          case 'CONTENT':
            recommendations = await this.generateContentRecommendations(userId, limit, filters, preferences);
            break;
          default:
            recommendations = await this.generateHybridRecommendations(userId, type, limit, filters, preferences);
            break;
        }

        // Cache recommendations
        recommendationCache.set(cacheKey, recommendations);
        this.updateCacheStats('hit');
      } else {
        this.updateCacheStats('hit');
      }

      // Log recommendation generation
      await this.logRecommendationGeneration(userId, type, recommendations.length, algorithmType);

      return recommendations;
    } catch (error) {
      logger.error('Error generating recommendations:', error);
      throw error;
    }
  }

  async generateMentorRecommendations(userId, limit, filters, preferences) {
    try {
      const {
        skills,
        experienceLevel,
        availability,
        rating,
        timeRange
      } = filters;

      const cacheKey = `mentor_recommendations_${userId}_${JSON.stringify(filters)}`;
      let mentors = recommendationCache.get(cacheKey);

      if (!mentors) {
        // Get active mentors with filtering
        const whereClause = {
          role: 'MENTOR',
          isActive: true
        };

        if (skills && skills.length > 0) {
          whereClause.skills = {
            hasSome: skills
          };
        }

        if (experienceLevel) {
          whereClause.experienceLevel = experienceLevel;
        }

        if (availability !== undefined) {
          whereClause.availability = availability;
        }

        if (rating) {
          whereClause.rating = { gte: rating };
        }

        mentors = await prisma.user.findMany({
          where: whereClause,
          include: {
            _count: {
              select: {
                followers: true,
                posts: true,
                mentorshipsAsMentor: true,
                mentorshipsAsMentee: true
              }
            },
            mentorshipSessionsAsMentor: {
              where: {
                status: 'COMPLETED',
                createdAt: { gte: this.getDateRangeStart(timeRange || '30d') }
              },
              include: {
                feedback: true,
                mentee: {
                  select: {
                    id: true,
                    name: true,
                    profileImage: true
                  }
                }
              },
              take: limit * 2 // Get more than needed for filtering
            },
            orderBy: [
              { _count: { followers: 'desc' },
              { _count: { posts: 'desc' },
              { _count: { mentorshipsAsMentor: 'desc' }
            ],
            take: limit
          });

          // Apply collaborative filtering
          const userSimilarityMap = new Map();
          const mentorSimilarityScores = [];

          for (const mentor of mentors) {
            const similarity = await this.calculateUserSimilarity(userId, mentor.id);
            userSimilarityMap.set(mentor.id, similarity);
          }

          // Sort by similarity
          mentors.sort((a, b) => {
            const scoreA = userSimilarityMap.get(a.id) || 0;
            const scoreB = userSimilarityMap.get(b.id) || 0;
            return scoreB - scoreA;
          });

          // Apply skill matching
          if (skills && skills.length > 0) {
            mentors = mentors.filter(mentor => {
              return mentor.skills.some(skill => skills.includes(skill));
            });
          }

          // Apply rating filter
          if (rating) {
            mentors = mentors.filter(mentor => {
              const avgRating = mentor._count?.mentorshipsAsMentor?.reduce((sum, session) => 
                sum + (session.feedback?.rating || 0), 0) / 
                mentor._count?.mentorshipsAsMentor.length || 1
              );
              return avgRating >= rating;
            });
          }

          mentors = mentors.slice(0, limit);
        }

        recommendationCache.set(cacheKey, mentors);
      }

      // Apply additional filtering
      if (availability !== undefined) {
        mentors = mentors.filter(mentor => {
          return mentor.availability === availability;
        });
      }

      return mentors.map(mentor => ({
        id: mentor.id,
        name: mentor.name,
        profileImage: mentor.profileImage,
        bio: mentor.bio,
        skills: mentor.skills,
        _count: mentor._count,
        similarityScore: userSimilarityMap.get(mentor.id) || 0,
        recommendationScore: this.calculateRecommendationScore(
          userSimilarityMap.get(mentor.id) || 0,
          mentor._count?.followers || 0,
          mentor._count?.posts || 0,
          mentor._count?.mentorshipsAsMentor || 0
        ),
        type: 'MENTOR',
        algorithm: 'COLLABORATIVE_FILTERING',
        metadata: {
          skills,
          experienceLevel,
          availability,
          rating,
          timeRange
        }
      }));
    } catch (error) {
      logger.error('Error generating mentor recommendations:', error);
      throw error;
    }
  }

  async generateSessionRecommendations(userId, limit, filters, preferences) {
    try {
      const {
        skills,
        experienceLevel,
        timeRange,
        availability,
        rating
      } = filters;

      const cacheKey = `session_recommendations_${userId}_${JSON.stringify(filters)}`;
      let sessions = recommendationCache.get(cacheKey);

      if (!sessions) {
        // Get completed sessions with filtering
        const whereClause = {
          status: 'COMPLETED',
          createdAt: { gte: this.getDateRangeStart(timeRange || '30d') }
        };

        if (skills && skills.length > 0) {
          whereClause.mentor = {
            skills: {
              hasSome: skills
            }
          };
        }

        if (rating) {
          whereClause.feedback = {
            rating: { gte: rating }
          };
        }

        if (availability !== undefined) {
          whereClause.mentor = {
            availability: availability
          };
        }

        sessions = await prisma.mentorshipSession.findMany({
          where: whereClause,
          include: {
            mentor: {
              select: {
                id: true,
                name: true,
                profileImage: true,
                bio: true,
                skills: true
              }
            },
            mentee: {
              select: {
                id: true,
                name: true,
                profileImage: true
              }
            },
            feedback: true,
            _count: {
              mentor: {
                followers: true,
                posts: true,
                mentorshipsAsMentor: true,
                mentorshipsAsMentee: true
              }
            }
          },
          orderBy: [
            { feedback: { rating: 'desc' },
            { createdAt: 'desc' }
          ],
          take: limit * 2 // Get more than needed for filtering
        });

        // Apply AI metadata for enhanced scoring
        const sessionScores = new Map();
        for (const session of sessions) {
          const score = await this.calculateSessionScore(session, preferences);
          sessionScores.set(session.id, score);
        }

        // Sort by score
        sessions.sort((a, b) => {
          const scoreA = sessionScores.get(a.id) || 0;
          const scoreB = sessionScores.get(b.id) || 0;
          return scoreB - scoreA;
        });

        sessions = sessions.slice(0, limit);
        recommendationCache.set(cacheKey, sessions);
      }

      // Apply additional filtering
      if (skills && skills.length > 0) {
        sessions = sessions.filter(session => {
          return session.mentor.skills.some(skill => skills.includes(skill));
        });
      }

      return sessions.map(session => ({
        id: session.id,
        title: session.title,
        description: session.description,
        mentor: session.mentor,
        mentee: session.mentee,
        feedback: session.feedback,
        scheduledAt: session.scheduledAt,
        completedAt: session.completedAt,
        duration: session.duration,
        price: session.price,
        recommendationScore: sessionScores.get(session.id) || 0,
        type: 'SESSION',
        algorithm: 'CONTENT_BASED',
        metadata: {
          skills,
          experienceLevel,
          availability,
          rating: session.feedback?.rating,
          timeRange
        }
      }));
    } catch (error) {
      logger.error('Error generating session recommendations:', error);
      throw error;
    }
  }

  async generatePostRecommendations(userId, limit, filters, preferences) {
    try {
      const {
        skills,
        categories,
        timeRange,
        minEngagement
      } = filters;

      const cacheKey = `post_recommendations_${userId}_${JSON.stringify(filters)}`;
      let posts = recommendationCache.get(cacheKey);

      if (!posts) {
        // Get published posts with filtering
        const whereClause = {
          isPublished: true,
          createdAt: { gte: this.getDateRangeStart(timeRange || '30d') }
        };

        if (skills && skills.length > 0) {
          whereClause.skills = {
            hasSome: skills
          };
        }

        if (categories && categories.length > 0) {
          whereClause.categories = {
            hasSome: categories
          };
        }

        if (minEngagement !== undefined) {
          whereClause._count = {
            likes: { gte: minEngagement }
          };
        }

        posts = await prisma.post.findMany({
          where: whereClause,
          include: {
            author: {
              select: {
                id: true,
                name: true,
                profileImage: true,
                bio: true,
                skills: true
              }
            },
            _count: {
              likes: true,
              comments: true,
              bookmarks: true,
              shares: true
            },
            aiMetadata: {
              select: {
                feature_vector: true,
                engagement_prediction: true,
                trending_score: true,
                quality_score: true
              }
            }
          },
          orderBy: [
            { aiMetadata: { trending_score: 'desc' },
            { _count: { likes: 'desc' },
            { createdAt: 'desc' }
          ],
          take: limit * 2 // Get more than needed for filtering
        });

        // Calculate post scores
        const postScores = new Map();
        for (const post of posts) {
          const score = this.calculatePostScore(post, preferences);
          postScores.set(post.id, score);
        }

        // Sort by score
        posts.sort((a, b) => {
          const scoreA = postScores.get(a.id) || 0;
          const scoreB = postScores.get(b.id) || 0;
          return scoreB - scoreA;
        });

        posts = posts.slice(0, limit);
        recommendationCache.set(cacheKey, posts);
      }

      // Apply additional filtering
      if (skills && skills.length > 0) {
        posts = posts.filter(post => {
          return post.author.skills.some(skill => skills.includes(skill));
        });
      }

      if (categories && categories.length > 0) {
        posts = posts.filter(post => {
          return post.categories?.some(category => categories.includes(category));
        });
      }

      return posts.map(post => ({
        id: post.id,
        title: post.title,
        content: post.content,
        image: post.image,
        author: post.author,
        tags: post.tags,
        _count: post._count,
        recommendationScore: postScores.get(post.id) || 0,
        type: 'POST',
        algorithm: 'CONTENT_BASED',
        metadata: {
          skills,
          categories,
          timeRange,
          minEngagement
        }
      }));
    } catch (error) {
      logger.error('Error generating post recommendations:', error);
      throw error;
    }
  }

  async generateContentRecommendations(userId, limit, filters, preferences) {
    try {
      const {
        categories,
        timeRange,
        minQuality
      } = filters;

      const cacheKey = `content_recommendations_${userId}_${JSON.stringify(filters)}`;
      let content = recommendationCache.get(cacheKey);

      if (!content) {
        // Get all published content with filtering
        const whereClause = {
          isPublished: true,
          createdAt: { gte: this.getDateRangeStart(timeRange || '30d') }
        };

        if (categories && categories.length > 0) {
          whereClause.categories = {
            hasSome: categories
          };
        }

        if (minQuality !== undefined) {
          whereClause.aiMetadata = {
            quality_score: { gte: minQuality }
          };
        }

        content = await prisma.post.findMany({
          where: whereClause,
          include: {
            author: {
              select: {
                id: true,
                name: true,
                profileImage: true,
                bio: true,
                skills: true
              }
            },
            _count: {
              likes: true,
              comments: true,
              bookmarks: true,
              shares: true
            },
            aiMetadata: {
              feature_vector: true,
              engagement_prediction: true,
              trending_score: true,
              quality_score: true
            }
          },
          orderBy: [
            { aiMetadata: { trending_score: 'desc' },
            { _count: { likes: 'desc' },
            { createdAt: 'desc' }
          ],
          take: limit * 2 // Get more than needed for filtering
        });

        // Calculate content scores
        const contentScores = new Map();
        for (const item of content) {
          const score = this.calculateContentScore(item, preferences);
          contentScores.set(item.id, score);
        }

        // Sort by score
        content.sort((a, b) => {
          const scoreA = contentScores.get(a.id) || 0;
          const scoreB = contentScores.get(b.id) || 0;
          return scoreB - scoreA;
        });

        content = content.slice(0, limit);
        recommendationCache.set(cacheKey, content);
      }

      return content.map(item => ({
        id: item.id,
        title: item.title,
        content: item.content,
        image: item.image,
        author: item.author,
        tags: item.tags,
        _count: item._count,
        recommendationScore: contentScores.get(item.id) || 0,
        type: 'CONTENT',
        algorithm: 'CONTENT_BASED',
        metadata: {
          categories,
          timeRange,
          minQuality
        }
      }));
    } catch (error) {
      logger.error('Error generating content recommendations:', error);
      throw error;
    }
  }

  async generateHybridRecommendations(userId, type, limit, filters, preferences) {
    try {
      // Get recommendations from multiple algorithms
      const [
        collaborativeRecs,
        contentRecs,
        trendingRecs
      ] = await Promise.all([
        this.generateMentorRecommendations(userId, Math.ceil(limit / 3), filters, preferences),
        this.generatePostRecommendations(userId, Math.ceil(limit / 3), filters, preferences),
        this.generateTrendingContent(userId, Math.ceil(limit / 3), filters, preferences)
      ]);

      // Combine and deduplicate
      const allRecommendations = [
        ...collaborativeRecs,
        ...contentRecs,
        ...trendingRecs
      ];

      // Remove duplicates by entity ID
      const uniqueRecommendations = [];
      const seen = new Set();

      for (const rec of allRecommendations) {
        const key = `${type}_${rec.id}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniqueRecommendations.push(rec);
        }
      }

      // Sort by hybrid score
      uniqueRecommendations.sort((a, b) => {
        const scoreA = a.recommendationScore || 0;
        const scoreB = b.recommendationScore || 0;
        return scoreB - scoreA;
      });

      return uniqueRecommendations.slice(0, limit);
    } catch (error) {
      logger.error('Error generating hybrid recommendations:', error);
      throw error;
    }
  }

  async generateTrendingContent(userId, limit, filters, preferences) {
    try {
      const { timeRange = '30d', categories } = filters;
      
      const cacheKey = `trending_${userId}_${timeRange}_${JSON.stringify(categories)}`;
      let trending = recommendationCache.get(cacheKey);

      if (!trending) {
        // Get trending posts
        const whereClause = {
          isPublished: true,
          createdAt: { gte: this.getDateRangeStart(timeRange) }
        };

        if (categories && categories.length > 0) {
          whereClause.categories = {
            hasSome: categories
          };
        }

        trending = await prisma.post.findMany({
          where: whereClause,
          include: {
            author: {
              select: {
                id: true,
                name: true,
                profileImage: true,
                bio: true,
                skills: true
              }
            },
            _count: {
              likes: true,
              comments: true,
              bookmarks: true,
              shares: true
            },
            aiMetadata: {
              trending_score: true,
              quality_score: true
            }
          },
          orderBy: [
            { aiMetadata: { trending_score: 'desc' },
            { _count: { likes: 'desc' },
            { createdAt: 'desc' }
          ],
          take: limit
        });

        // Get trending sessions
        const trendingSessions = await prisma.mentorshipSession.findMany({
          where: {
            status: 'COMPLETED',
            createdAt: { gte: this.getDateRangeStart(timeRange) }
          },
          include: {
            mentor: {
              select: {
                id: true,
                name: true,
                profileImage: true,
                bio: true,
                skills: true
              }
            },
            mentee: {
              select: {
                id: true,
                name: true,
                profileImage: true
              }
            },
            feedback: true
          },
          orderBy: [
            { createdAt: 'desc' }
          ],
          take: Math.floor(limit / 2)
        });

        // Combine and sort by trending score
        const allTrending = [
          ...trendingPosts,
          ...trendingSessions
        ];

        // Sort by trending score
        allTrending.sort((a, b) => {
          const scoreA = a.aiMetadata?.trending_score || 0;
          const scoreB = b.aiMetadata?.trending_score || 0;
          return scoreB - scoreA;
        });

        trending = allTrending.slice(0, limit);
        recommendationCache.set(cacheKey, trending);
      }

      return trending.map(item => ({
        id: item.id,
        title: item.title || item.title,
        description: item.description || item.description,
        author: item.author || item.mentor,
        _count: item._count,
        recommendationScore: item.aiMetadata?.trending_score || 0,
        type: item.type || 'TRENDING',
        algorithm: 'TRENDING_BASED',
        metadata: {
          timeRange,
          categories
        }
      }));
    } catch (error) {
      logger.error('Error generating trending content:', error);
      throw error;
    }
  }

  async calculateUserSimilarity(userId1, userId2) {
    try {
      const similarity = await prisma.$queryRaw`
        SELECT calculate_collaborative_similarity($1, $2)
      `);

      return similarity;
    } catch (error) {
      logger.error('Error calculating user similarity:', error);
      return 0;
    }
  }

  calculateContentScore(post, preferences) {
    const engagementWeight = preferences.engagementWeight || 0.3;
    const qualityWeight = preferences.qualityWeight || 0.3;
    const recencyWeight = preferences.recencyWeight || 0.4;

    const engagementScore = (post._count?.likes || 0) * engagementWeight;
    const qualityScore = post.aiMetadata?.quality_score || 0) * qualityWeight;
    const recencyScore = this.calculateRecencyScore(post.createdAt, preferences.recencyWeight || 0.3);

    return engagementScore + qualityScore + recencyScore;
  }

  calculateSessionScore(session, preferences) {
    const ratingWeight = preferences.ratingWeight || 0.4;
    const experienceWeight = preferences.experienceWeight || 0.3;
    const availabilityWeight = preferences.availabilityWeight || 0.3;

    const rating = session.feedback?.rating || 0;
    const experience = session.mentor?.experience || 0;
    const availability = session.availability || 0;

    const ratingScore = rating * ratingWeight;
    const experienceScore = experience * experienceWeight;
    const availabilityScore = availability * availabilityWeight;

    return ratingScore + experienceScore + availabilityScore;
  }

  calculateRecencyScore(createdAt, weight = 0.3) {
    const now = new Date();
    const created = new Date(createdAt);
    const hoursOld = (now - created) / (1000 * 60 * 60);
    
    return Math.max(0, 1 - (hoursOld / 24 * 7)) * weight;
  }

  calculateRecommendationScore(similarity, followersCount, postsCount, mentorshipCount, algorithmWeight = 1.0) {
    const similarityScore = similarity || 0;
    const followersScore = Math.log10(followersCount + 1) / Math.log10(100) * 0.2;
    const postsScore = Math.log10(postsCount + 1) / Math.log10(100) * 0.2;
    const mentorshipScore = Math.log10(mentorshipCount + 1) / Math.log10(50) * 0.2;
    const algorithmWeight = algorithmWeight || 1.0;

    return (similarityScore + followersScore + postsScore + mentorshipScore) * algorithmWeight;
  }

  async getUserPreferences(userId) {
    try {
      let preferences = await prisma.userRecommendationPreferences.findUnique({
        where: { userId }
      });

      if (!preferences) {
        // Create default preferences
        preferences = await prisma.userRecommendationPreferences.create({
          userId,
          skillWeights: {
            javascript: 1.0,
            react: 0.9,
            nodejs: 0.8,
            python: 0.7,
        },
          categoryPreferences: {
            posts: true,
          },
          interactionHistory: [],
          feedbackHistory: [],
          autoRefresh: true,
          refreshFrequency: 3600
        });
      }

      return preferences;
    } catch (error) {
      logger.error('Error getting user preferences:', error);
      // Return default preferences
      return {
        userId,
        skillWeights: {
          javascript: 1.0,
          react: 0.9,
          nodejs: 0.8,
          python: 0.7
        },
        categoryPreferences: {
          posts: true,
          sessions: true,
          mentors: true
        },
        interactionHistory: [],
        feedbackHistory: [],
        autoRefresh: true,
        refreshFrequency: 3600
      };
    }
  }

  async updateUserPreferences(userId, preferences) {
    try {
      const updated = await prisma.userRecommendationPreferences.upsert({
        where: { userId },
        update: preferences,
        create: { userId, ...preferences }
      });

      // Clear relevant cache entries
      this.clearCacheForUser(userId);

      return updated;
    } catch (error) {
      logger.error('Error updating user preferences:', error);
      throw error;
    }
  }

  async logRecommendationGeneration(userId, type, count, algorithmType) {
    try {
      await prisma.analyticsEvents.create({
        userId,
        eventType: 'RECOMMENDATION_GENERATED',
        eventData: {
          type,
          count,
          algorithmType,
          timestamp: new Date()
        }
      });
    } catch (error) {
      logger.error('Error logging recommendation generation:', error);
    }
  }

  async saveRecommendation(userId, type, entityId, score, algorithmType, metadata = {}) {
    try {
      const expiresAt = new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)); // 7 days

      const recommendation = await prisma.recommendationLogs.create({
        userId,
        recommendationType: type,
        entityId,
        recommendationScore: score,
        algorithmType,
        algorithmData: metadata,
        expiresAt
      });

      // Clear relevant cache entries
      this.clearCacheForType(type);

      return recommendation;
    } catch (error) {
      logger.error('Error saving recommendation:', error);
      throw error;
    }
  }

  async markRecommendationClicked(recommendationId, userId) {
    try {
      const result = await prisma.recommendationLogs.update({
        where: { id: recommendationId, userId },
        data: {
          isClicked: true,
          clickedAt: new Date()
        }
      });

      // Update user preferences based on interaction
      await this.updateUserPreferences(userId, {
        interactionHistory: {
          type: 'click',
          entityId: recommendationId,
          timestamp: new Date()
        }
      });

      return result;
    } catch (error) {
      logger.error('Error marking recommendation as clicked:', error);
      throw error;
    }
  }

  async dismissRecommendation(recommendationId, userId) {
    try {
      const result = await prisma.recommendationLogs.update({
        where: { id: recommendationId, userId },
        data: {
          isDismissed: true,
          dismissedAt: new Date()
        }
      });

      // Update user preferences based on dismissal
      await this.updateUserPreferences(userId, {
        feedbackHistory: {
          type: 'dismiss',
          entityId: recommendationId,
          timestamp: new Date()
        }
      });

      return result;
    } catch (error) {
      logger.error('Error dismissing recommendation:', error);
      throw error;
    }
  }

  async getRecommendationFeedback(recommendationId, userId) {
    try {
      const feedback = await prisma.recommendationFeedback.findUnique({
        where: {
          recommendationId,
          userId
        },
        orderBy: { createdAt: 'desc' }
      });

      return feedback;
    } catch (error) {
      logger.error('Error getting recommendation feedback:', error);
      return [];
    }
  }

  async getRecommendationHistory(userId, filters = {}) {
    try {
      const {
        type,
        startDate,
        endDate,
        limit = 50,
        status
      } = filters;

      const whereClause = { userId };
      
      if (type) whereClause.recommendationType = type;
      if (startDate) whereClause.createdAt = { gte: new Date(startDate) };
      if (endDate) whereClause.createdAt = { lte: new Date(endDate) };
      if (status) whereClause.isClicked = status;

      const recommendations = await prisma.recommendationLogs.findMany({
        where: whereClause,
        include: {
          entity: true
        },
        orderBy: { createdAt: 'desc' },
        take: limit
      });

      return recommendations;
    } catch (error) {
      logger.error('Error getting recommendation history:', error);
      return [];
    }
  }

  async getRecommendationStats() {
    try {
      const [
        totalRecommendations,
        clickedRecommendations,
        dismissedRecommendations,
        averageRating
      ] = await Promise.all([
        prisma.recommendationLogs.count(),
        prisma.recommendationLogs.count({ where: { isClicked: true } }),
        prisma.recommendationLogs.count({ where: { isDismissed: true } }),
        prisma.recommendationFeedback.aggregate({
          where: { rating: { not: null } },
          _avg: { rating: true }
        })
      ]);

      const averageRating = averageRating.length > 0 ? averageRating[0].avg : 0;

      return {
        total: totalRecommendations,
        clicked: clickedRecommendations,
        dismissed: dismissedRecommendations,
        averageRating,
        clickRate: totalRecommendations > 0 ? (clickedRecommendations / totalRecommendations) * 100 : 0,
        dismissRate: totalRecommendations > 0 ? (dismissedRecommendations / totalRecommendations) * 100 : 0
      };
    } catch (error) {
      logger.error('Error getting recommendation stats:', error);
      return {
        total: 0,
        clicked: 0,
        dismissed: 0,
        averageRating: 0,
        clickRate: 0,
        dismissRate: 0
      };
    }
  }

  clearCacheForUser(userId) {
    const keys = analyticsCache.keys();
    keys.forEach(key => {
      if (key.includes(`recommendations_${userId}`)) {
        analyticsCache.del(key);
      }
    });
  }

  clearCacheForType(type) {
    const keys = analyticsCache.keys();
    keys.forEach(key => {
      if (key.includes(`${type}_recommendations`)) {
        analyticsCache.del(key);
      }
    });
  }

  clearAllCache() {
    analyticsCache.flushAll();
  }

  getCacheStats() {
    return {
      keys: analyticsCache.keys().length,
      stats: analyticsCache.getStats()
    };
  }

  getAlgorithmForType(type, preferences) {
    // Algorithm selection based on type and user preferences
    const typeAlgorithmMap = {
      'MENTOR': 'SKILL_BASED',
      'SESSION': 'CONTENT_BASED',
      'POST': 'CONTENT_BASED',
      'CONTENT': 'TRENDING_BASED'
    };

    // Check if user has preferences for this type
    if (preferences && preferences.categoryPreferences) {
      if (preferences.categoryPreferences[type]) {
        return typeAlgorithmMap[type] || 'COLLABORATIVE_FILTERING';
      }
    }

    return typeAlgorithmMap[type] || 'HYBRID_RECOMMENDATION';
  }

  async refreshRecommendationCache() {
    try {
      const refreshed = await prisma.recommendationCache.deleteMany({
        where: {
          expiresAt: { lt: new Date() }
        }
      });

      // Re-populate cache with fresh recommendations
      await this.populateRecommendationCache();

      return refreshed.count;
    } catch (error) {
      logger.error('Error refreshing recommendation cache:', error);
      return 0;
    }
  }

  async populateRecommendationCache() {
    try {
      // Pre-populate cache with popular content
      const [topMentors, topPosts, topSessions] = await Promise.all([
        this.getTopMentors('7d', 50),
        this.getTopPosts('7d', 50),
        this.getTrendingContent('7d', 50)
      ]);

      // Cache top content
      const cacheEntries = [
        ...topMentors.map(mentor => ({
          cacheKey: `mentor_recommendations_${mentor.id}`,
          recommendationData: mentor,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
        })),
        ...topPosts.map(post => ({
          cacheKey: `post_recommendations_${post.id}`,
          recommendationData: post,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
        })),
        ...topSessions.map(session => ({
          cacheKey: `session_recommendations_${session.id}`,
          recommendationData: session,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
        }))
      ];

      for (const entry of cacheEntries) {
        recommendationCache.set(entry.cacheKey, entry.recommendationData);
      }

      return cacheEntries.length;
    } catch (error) {
      logger.error('Error populating recommendation cache:', error);
      return 0;
    }
  }

  async getTopMentors(timeRange = '30d', limit = 50) {
    try {
      const startDate = this.getDateRangeStart(timeRange);
      
      const mentors = await prisma.user.findMany({
        where: {
          role: 'MENTOR',
          isActive: true,
          createdAt: { gte: startDate }
        },
        include: {
          _count: {
            followers: true,
            posts: true,
            mentorshipsAsMentor: true,
            mentorshipsAsMentee: true
          },
          mentorshipSessionsAsMentor: {
            where: {
              status: 'COMPLETED',
              createdAt: { gte: startDate }
            },
            include: {
              feedback: true,
              mentee: {
                select: {
                  id: true,
                  name: true,
                  profileImage: true
                }
              }
            },
            take: limit
          },
          orderBy: [
            { _count: { followers: 'desc' },
            { _count: { posts: 'desc' },
            { _count: { mentorshipsAsMentor: 'desc' }
          ],
          take: limit
        });

      return mentors;
    } catch (error) {
      logger.error('Error getting top mentors:', error);
      return [];
    }
  }

  async getTopPosts(timeRange = '30d', limit = 50) {
    try {
      const startDate = this.getDateRangeStart(timeRange);
      
      const posts = await prisma.post.findMany({
        where: {
          isPublished: true,
          createdAt: { gte: startDate }
        },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              profileImage: true,
              bio: true,
              skills: true
            }
          },
          _count: {
            likes: true,
            comments: true,
            bookmarks: true,
            shares: true
          },
          aiMetadata: {
            feature_vector: true,
            engagement_prediction: true,
            trending_score: true,
            quality_score: true
          }
        },
        orderBy: [
          { aiMetadata: { trending_score: 'desc' },
          { _count: { likes: 'desc' },
          { createdAt: 'desc' }
        ],
        take: limit
      });

      return posts;
    } catch (error) {
      logger.error('Error getting top posts:', error);
      return [];
    }
  }

  async getTrendingContent(timeRange = '30d', limit = 50) {
    try {
      const startDate = this.getDateRangeStart(timeRange);
      
      const posts = await prisma.post.findMany({
        where: {
          isPublished: true,
          createdAt: { gte: startDate }
        },
        include: {
          author: {
            select: {
              id: true,
              name: },
          },
          _count: {
            likes: true,
            comments: true,
            bookmarks: true,
            shares: true
          },
          aiMetadata: {
            trending_score: true,
            quality_score: true
          }
        },
        orderBy: [
          { aiMetadata: { trending_score: 'desc' },
          { createdAt: 'desc' }
        ],
        take: limit
      });

      return posts;
    } catch (error) {
      logger.error('Error getting trending content:', error);
      return [];
    }
  }

  getDateRangeStart(timeRange) {
    const now = new Date();
    const startDate = new Date();
    
    switch (timeRange) {
      case '1d':
        startDate.setDate(now.getDate() - 1);
        break;
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
        break;
    }
    
    return startDate;
  }
}

module.exports = new RecommendationService();
