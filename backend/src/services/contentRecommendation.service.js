const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger.util');
const NodeCache = require('node-cache');
const EventEmitter = require('events');

const prisma = new PrismaClient();
const contentCache = new NodeCache({ stdTTL: 900 }); // 15 minutes cache

class ContentRecommendationService extends EventEmitter {
  constructor() {
    super();
    this.recommendationQueue = [];
    this.isProcessing = false;
    this.startRecommendationProcessor();
  }

  // Generate hybrid content recommendations for user
  async generateContentRecommendations(userId, options = {}) {
    try {
      const {
        skillGapId = null,
        userSkillId = null,
        contentTypes = ['COURSE', 'TUTORIAL', 'ARTICLE', 'VIDEO', 'MENTOR_SESSION'],
        limit = 20,
        algorithm = 'HYBRID',
        includeTrending = true,
        personalizedOnly = false,
        difficulty = null,
        learningStyle = null,
        timeConstraint = null // minutes
      } = options;

      logger.info(`Generating content recommendations for user ${userId}`, {
        skillGapId,
        userSkillId,
        contentTypes,
        limit,
        algorithm,
        includeTrending
      });

      // Get user data and context
      const userData = await this.getUserRecommendationContext(userId);
      const skillGaps = await this.getRelevantSkillGaps(userId, skillGapId);
      const userSkills = await this.getUserSkills(userId, userSkillId);

      // Generate recommendations using different algorithms
      const recommendations = await this.generateHybridRecommendations(
        userId,
        userData,
        skillGaps,
        userSkills,
        {
          contentTypes,
          limit,
          algorithm,
          includeTrending,
          personalizedOnly,
          difficulty,
          learningStyle,
          timeConstraint
        }
      );

      // Apply filters and ranking
      const filteredRecommendations = this.applyFilters(recommendations, options);
      const rankedRecommendations = this.rankRecommendations(filteredRecommendations, userData);

      // Store recommendations
      await this.storeRecommendations(userId, rankedRecommendations, options);

      // Emit event for real-time updates
      this.emit('contentRecommendationsGenerated', {
        userId,
        recommendations: rankedRecommendations,
        context: {
          skillGaps: skillGaps.length,
          userSkills: userSkills.length,
          algorithm
        },
        timestamp: new Date()
      });

      logger.info(`Content recommendations generated for user ${userId}`, {
        totalRecommendations: rankedRecommendations.length,
        topScore: rankedRecommendations[0]?.recommendationScore || 0
      });

      return {
        userId,
        recommendations: rankedRecommendations,
        metadata: {
          totalGenerated: recommendations.length,
          afterFiltering: filteredRecommendations.length,
          finalCount: rankedRecommendations.length,
          algorithmUsed: algorithm,
          skillGapsAddressed: skillGaps.length,
          contentTypes: this.getContentTypesDistribution(rankedRecommendations)
        }
      };

    } catch (error) {
      logger.error(`Failed to generate content recommendations for user ${userId}:`, error);
      throw new Error(`Failed to generate content recommendations: ${error.message}`);
    }
  }

  // Get user recommendation context
  async getUserRecommendationContext(userId) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          aiUserBehavior: true,
          userSkills: {
            include: {
              skillGaps: true,
              contentRecommendations: true
            }
          },
          skillGaps: {
            where: { status: 'ACTIVE' },
            include: {
              userSkill: true
            }
          }
        }
      });

      const behavior = user.aiUserBehavior;
      const behaviorData = behavior ? JSON.parse(behavior.behaviorData || '{}') : {};

      // Get learning history
      const learningHistory = await this.getUserLearningHistory(userId);
      
      // Get interaction patterns
      const interactionPatterns = await this.getInteractionPatterns(userId);

      return {
        user: {
          id: user.id,
          name: user.name,
          role: user.role,
          experienceLevel: behaviorData.experienceLevel || 'INTERMEDIATE'
        },
        preferences: {
          learningStyle: behaviorData.learningStyle || 'VISUAL',
          difficulty: behaviorData.preferredDifficulty || 'INTERMEDIATE',
          contentTypes: behaviorData.preferredContentTypes || ['TUTORIAL', 'VIDEO'],
          timePerSession: behaviorData.timePerSession || 60,
          careerGoals: behaviorData.careerGoals || [],
          industry: behaviorData.industry || 'TECH'
        },
        skills: user.userSkills,
        skillGaps: user.skillGaps,
        learningHistory,
        interactionPatterns,
        demographics: {
          age: behaviorData.age || null,
          location: behaviorData.location || null,
          timezone: behaviorData.timezone || 'UTC'
        }
      };

    } catch (error) {
      logger.error(`Failed to get user recommendation context for ${userId}:`, error);
      throw new Error(`Failed to get user recommendation context: ${error.message}`);
    }
  }

  // Get relevant skill gaps
  async getRelevantSkillGaps(userId, skillGapId = null) {
    try {
      const whereClause = skillGapId 
        ? { userId, id: skillGapId }
        : { userId, status: 'ACTIVE' };

      const gaps = await prisma.skillGap.findMany({
        where: whereClause,
        include: {
          userSkill: true,
          contentRecommendations: true
        },
        orderBy: [
          { urgency: 'desc' },
          { impactScore: 'desc' }
        ]
      });

      return gaps.map(gap => ({
        ...gap,
        recommendedActions: gap.recommendedActions ? JSON.parse(gap.recommendedActions) : [],
        prerequisites: gap.prerequisites ? JSON.parse(gap.prerequisites) : [],
        aiInsights: gap.aiInsights ? JSON.parse(gap.aiInsights) : {}
      }));

    } catch (error) {
      logger.error(`Failed to get relevant skill gaps for ${userId}:`, error);
      throw new Error(`Failed to get relevant skill gaps: ${error.message}`);
    }
  }

  // Get user skills
  async getUserSkills(userId, userSkillId = null) {
    try {
      const whereClause = userSkillId
        ? { userId, id: userSkillId }
        : { userId };

      const skills = await prisma.userSkill.findMany({
        where: whereClause,
        include: {
          skillGaps: true,
          contentRecommendations: true
        },
        orderBy: [
          { priority: 'desc' },
          { careerRelevance: 'desc' }
        ]
      });

      return skills.map(skill => ({
        ...skill,
        relatedSkills: skill.relatedSkills ? JSON.parse(skill.relatedSkills) : []
      }));

    } catch (error) {
      logger.error(`Failed to get user skills for ${userId}:`, error);
      throw new Error(`Failed to get user skills: ${error.message}`);
    }
  }

  // Generate hybrid recommendations
  async generateHybridRecommendations(userId, userData, skillGaps, userSkills, options) {
    try {
      const recommendations = [];

      // 1. Collaborative Filtering Recommendations
      const collaborativeRecs = await this.generateCollaborativeRecommendations(userId, userData, options);
      recommendations.push(...collaborativeRecs);

      // 2. Content-Based Recommendations
      const contentBasedRecs = await this.generateContentBasedRecommendations(userId, userData, skillGaps, options);
      recommendations.push(...contentBasedRecs);

      // 3. Skill Gap-Based Recommendations
      const skillGapRecs = await this.generateSkillGapRecommendations(userId, userData, skillGaps, options);
      recommendations.push(...skillGapRecs);

      // 4. Trending Content Recommendations
      if (options.includeTrending) {
        const trendingRecs = await this.generateTrendingRecommendations(userId, userData, options);
        recommendations.push(...trendingRecs);
      }

      // 5. Personalized AI Recommendations
      const personalizedRecs = await this.generatePersonalizedRecommendations(userId, userData, skillGaps, userSkills, options);
      recommendations.push(...personalizedRecs);

      // Remove duplicates and merge scores
      const uniqueRecommendations = this.mergeRecommendationScores(recommendations);

      return uniqueRecommendations;

    } catch (error) {
      logger.error('Failed to generate hybrid recommendations:', error);
      throw new Error(`Failed to generate hybrid recommendations: ${error.message}`);
    }
  }

  // Collaborative Filtering Recommendations
  async generateCollaborativeRecommendations(userId, userData, options) {
    try {
      // Find similar users based on skills, learning history, and preferences
      const similarUsers = await this.findSimilarUsers(userId, userData);

      const recommendations = [];

      for (const similarUser of similarUsers) {
        // Get content that similar users found valuable
        const userRecommendations = await prisma.contentRecommendation.findMany({
          where: {
            userId: similarUser.id,
            status: 'COMPLETED',
            rating: { gte: 4 }
          },
          include: {
            userSkill: true,
            skillGap: true
          },
          orderBy: { rating: 'desc' },
          take: 10
        });

        for (const rec of userRecommendations) {
          // Calculate collaborative score
          const similarityScore = similarUser.similarity;
          const ratingScore = rec.rating / 5;
          const collaborativeScore = similarityScore * ratingScore * 0.8; // Weight for collaborative filtering

          recommendations.push({
            userId,
            contentType: this.mapContentType(rec.contentType),
            contentId: rec.contentId,
            title: rec.title,
            description: rec.description,
            recommendationScore: collaborativeScore,
            algorithm: 'COLLABORATIVE',
            priority: this.calculatePriority(collaborativeScore),
            difficulty: rec.difficulty,
            estimatedDuration: rec.estimatedDuration,
            learningStyle: rec.learningStyle,
            tags: rec.tags ? JSON.parse(rec.tags) : [],
            qualityScore: rec.qualityScore,
            personalizedScore: collaborativeScore,
            aiReasoning: `Recommended based on similar users who rated this content ${rec.rating}/5`,
            contextFactors: {
              similarUserId: similarUser.id,
              similarityScore: similarityScore,
              userRating: rec.rating
            }
          });
        }
      }

      return recommendations;

    } catch (error) {
      logger.error('Failed to generate collaborative recommendations:', error);
      return [];
    }
  }

  // Content-Based Recommendations
  async generateContentBasedRecommendations(userId, userData, skillGaps, options) {
    try {
      const recommendations = [];

      // Get content based on user's skill gaps and current skills
      for (const skillGap of skillGaps) {
        const contentForSkill = await this.findContentForSkill(skillGap, options);

        for (const content of contentForSkill) {
          const contentScore = this.calculateContentBasedScore(content, skillGap, userData);
          
          recommendations.push({
            userId,
            userSkillId: skillGap.userSkillId,
            skillGapId: skillGap.id,
            contentType: content.type,
            contentId: content.id,
            title: content.title,
            description: content.description,
            recommendationScore: contentScore,
            algorithm: 'CONTENT_BASED',
            priority: this.calculatePriority(contentScore),
            difficulty: content.difficulty,
            estimatedDuration: content.duration,
            learningStyle: content.learningStyle,
            tags: content.tags || [],
            qualityScore: content.qualityScore || 0.7,
            personalizedScore: contentScore,
            aiReasoning: `Matches your skill gap in ${skillGap.skillName} with ${contentScore.toFixed(2)} relevance`,
            contextFactors: {
              skillGap: skillGap.skillName,
              gapSeverity: skillGap.gapSeverity,
              contentMatch: contentScore
            }
          });
        }
      }

      return recommendations;

    } catch (error) {
      logger.error('Failed to generate content-based recommendations:', error);
      return [];
    }
  }

  // Skill Gap-Based Recommendations
  async generateSkillGapRecommendations(userId, userData, skillGaps, options) {
    try {
      const recommendations = [];

      for (const skillGap of skillGaps) {
        // Get specific content recommendations for this skill gap
        const gapSpecificContent = await this.findGapSpecificContent(skillGap, options);

        for (const content of gapSpecificContent) {
          const gapScore = this.calculateGapSpecificScore(content, skillGap, userData);
          
          recommendations.push({
            userId,
            userSkillId: skillGap.userSkillId,
            skillGapId: skillGap.id,
            contentType: content.contentType,
            contentId: content.contentId,
            title: content.title,
            description: content.description,
            recommendationScore: gapScore,
            algorithm: 'AI_DRIVEN',
            priority: this.calculatePriority(gapScore),
            difficulty: content.difficulty,
            estimatedDuration: content.estimatedDuration,
            learningStyle: content.learningStyle,
            prerequisites: content.prerequisites || [],
            learningOutcomes: content.learningOutcomes || [],
            tags: content.tags || [],
            qualityScore: content.qualityScore || 0.8,
            personalizedScore: gapScore,
            aiReasoning: `Specifically addresses your ${skillGap.gapSeverity} skill gap in ${skillGap.skillName}`,
            contextFactors: {
              gapType: skillGap.gapType,
              urgency: skillGap.urgency,
              impactScore: skillGap.impactScore,
              timeToClose: skillGap.timeToClose
            }
          });
        }
      }

      return recommendations;

    } catch (error) {
      logger.error('Failed to generate skill gap-based recommendations:', error);
      return [];
    }
  }

  // Trending Content Recommendations
  async generateTrendingRecommendations(userId, userData, options) {
    try {
      const recommendations = [];

      // Get trending content in user's areas of interest
      const trendingContent = await this.getTrendingContent(userData, options);

      for (const content of trendingContent) {
        const trendingScore = this.calculateTrendingScore(content, userData);
        
        recommendations.push({
          userId,
          contentType: content.contentType,
          contentId: content.id,
          title: content.title,
          description: content.description,
          recommendationScore: trendingScore,
          algorithm: 'TRENDING',
          priority: this.calculatePriority(trendingScore),
          difficulty: content.difficulty,
          estimatedDuration: content.duration,
          learningStyle: content.learningStyle,
          tags: content.tags || [],
          qualityScore: content.qualityScore || 0.7,
          trendingScore: content.trendingScore || 0.8,
          personalizedScore: trendingScore * 0.6, // Lower weight for trending
          aiReasoning: `Trending content with ${content.engagement?.views || 0} views and ${content.engagement?.likes || 0} likes`,
          contextFactors: {
            trendingRank: content.rank,
            engagementMetrics: content.engagement,
            timeTrending: content.timeTrending
          }
        });
      }

      return recommendations;

    } catch (error) {
      logger.error('Failed to generate trending recommendations:', error);
      return [];
    }
  }

  // Personalized AI Recommendations
  async generatePersonalizedRecommendations(userId, userData, skillGaps, userSkills, options) {
    try {
      const recommendations = [];

      // Use AI to generate highly personalized recommendations
      const userProfile = this.buildUserProfile(userData, skillGaps, userSkills);
      const personalizedContent = await this.getPersonalizedContent(userProfile, options);

      for (const content of personalizedContent) {
        const personalizedScore = this.calculatePersonalizedScore(content, userProfile);
        
        recommendations.push({
          userId,
          userSkillId: content.userSkillId,
          skillGapId: content.skillGapId,
          contentType: content.contentType,
          contentId: content.contentId,
          title: content.title,
          description: content.description,
          recommendationScore: personalizedScore,
          algorithm: 'PERSONALIZED',
          priority: this.calculatePriority(personalizedScore),
          difficulty: content.difficulty,
          estimatedDuration: content.estimatedDuration,
          learningStyle: content.learningStyle,
          prerequisites: content.prerequisites || [],
          learningOutcomes: content.learningOutcomes || [],
          tags: content.tags || [],
          qualityScore: content.qualityScore || 0.9,
          personalizedScore: personalizedScore,
          aiReasoning: content.aiReasoning || 'AI-generated recommendation based on your learning profile',
          contextFactors: {
            userProfileFactors: content.profileFactors,
            personalizationScore: personalizedScore,
            aiConfidence: content.aiConfidence || 0.8
          }
        });
      }

      return recommendations;

    } catch (error) {
      logger.error('Failed to generate personalized recommendations:', error);
      return [];
    }
  }

  // Apply filters to recommendations
  applyFilters(recommendations, options) {
    try {
      let filtered = [...recommendations];

      // Filter by content types
      if (options.contentTypes && options.contentTypes.length > 0) {
        filtered = filtered.filter(rec => options.contentTypes.includes(rec.contentType));
      }

      // Filter by difficulty
      if (options.difficulty) {
        filtered = filtered.filter(rec => rec.difficulty === options.difficulty);
      }

      // Filter by learning style
      if (options.learningStyle) {
        filtered = filtered.filter(rec => rec.learningStyle === options.learningStyle);
      }

      // Filter by time constraint
      if (options.timeConstraint) {
        filtered = filtered.filter(rec => 
          !rec.estimatedDuration || rec.estimatedDuration <= options.timeConstraint
        );
      }

      // Filter by minimum quality score
      filtered = filtered.filter(rec => rec.qualityScore >= 0.5);

      return filtered;

    } catch (error) {
      logger.error('Failed to apply filters:', error);
      return recommendations;
    }
  }

  // Rank recommendations
  rankRecommendations(recommendations, userData) {
    try {
      return recommendations.sort((a, b) => {
        // Primary sort by recommendation score
        if (b.recommendationScore !== a.recommendationScore) {
          return b.recommendationScore - a.recommendationScore;
        }

        // Secondary sort by personalized score
        if (b.personalizedScore !== a.personalizedScore) {
          return b.personalizedScore - a.personalizedScore;
        }

        // Tertiary sort by quality score
        if (b.qualityScore !== a.qualityScore) {
          return b.qualityScore - a.qualityScore;
        }

        // Final sort by priority
        const priorityOrder = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
        const aPriority = priorityOrder[a.priority] || 0;
        const bPriority = priorityOrder[b.priority] || 0;
        return bPriority - aPriority;
      });

    } catch (error) {
      logger.error('Failed to rank recommendations:', error);
      return recommendations;
    }
  }

  // Store recommendations
  async storeRecommendations(userId, recommendations, options) {
    try {
      // Delete existing active recommendations for this context
      const deleteWhere = { userId };
      if (options.skillGapId) deleteWhere.skillGapId = options.skillGapId;
      if (options.userSkillId) deleteWhere.userSkillId = options.userSkillId;

      await prisma.contentRecommendation.deleteMany({
        where: deleteWhere
      });

      // Create new recommendations
      const recommendationData = recommendations.map(rec => ({
        userId,
        userSkillId: rec.userSkillId || null,
        skillGapId: rec.skillGapId || null,
        contentType: rec.contentType,
        contentId: rec.contentId,
        title: rec.title,
        description: rec.description,
        recommendationScore: rec.recommendationScore,
        algorithm: rec.algorithm,
        priority: rec.priority,
        difficulty: rec.difficulty,
        estimatedDuration: rec.estimatedDuration,
        learningStyle: rec.learningStyle,
        prerequisites: JSON.stringify(rec.prerequisites || []),
        learningOutcomes: JSON.stringify(rec.learningOutcomes || []),
        tags: JSON.stringify(rec.tags || []),
        engagementMetrics: JSON.stringify(rec.engagementMetrics || {}),
        qualityScore: rec.qualityScore,
        trendingScore: rec.trendingScore || 0,
        personalizedScore: rec.personalizedScore,
        aiReasoning: rec.aiReasoning,
        contextFactors: JSON.stringify(rec.contextFactors || {}),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      }));

      await prisma.contentRecommendation.createMany({
        data: recommendationData
      });

      logger.info(`Stored ${recommendationData.length} content recommendations for user ${userId}`);

    } catch (error) {
      logger.error(`Failed to store recommendations for user ${userId}:`, error);
      throw new Error(`Failed to store recommendations: ${error.message}`);
    }
  }

  // Get user's content recommendations
  async getUserRecommendations(userId, options = {}) {
    try {
      const {
        status = 'ACTIVE',
        contentType = null,
        algorithm = null,
        priority = null,
        limit = 20,
        offset = 0
      } = options;

      const whereClause = { userId };
      if (status) whereClause.status = status;
      if (contentType) whereClause.contentType = contentType;
      if (algorithm) whereClause.algorithm = algorithm;
      if (priority) whereClause.priority = priority;

      const recommendations = await prisma.contentRecommendation.findMany({
        where: whereClause,
        include: {
          userSkill: true,
          skillGap: true
        },
        orderBy: [
          { recommendationScore: 'desc' },
          { priority: 'desc' },
          { recommendedAt: 'desc' }
        ],
        take: limit,
        skip: offset
      });

      return recommendations.map(rec => ({
        ...rec,
        prerequisites: rec.prerequisites ? JSON.parse(rec.prerequisites) : [],
        learningOutcomes: rec.learningOutcomes ? JSON.parse(rec.learningOutcomes) : [],
        tags: rec.tags ? JSON.parse(rec.tags) : [],
        engagementMetrics: rec.engagementMetrics ? JSON.parse(rec.engagementMetrics) : {},
        contextFactors: rec.contextFactors ? JSON.parse(rec.contextFactors) : {}
      }));

    } catch (error) {
      logger.error(`Failed to get user recommendations for ${userId}:`, error);
      throw new Error(`Failed to get user recommendations: ${error.message}`);
    }
  }

  // Update recommendation status
  async updateRecommendationStatus(userId, recommendationId, status, metadata = {}) {
    try {
      const updateData = {
        status,
        lastAccessedAt: new Date()
      };

      if (status === 'VIEWED') {
        updateData.viewedAt = new Date();
      } else if (status === 'COMPLETED') {
        updateData.completedAt = new Date();
      } else if (status === 'DISMISSED') {
        updateData.feedback = metadata.feedback;
      }

      if (metadata.rating) {
        updateData.rating = metadata.rating;
      }

      const updatedRecommendation = await prisma.contentRecommendation.update({
        where: { id: recommendationId, userId },
        data: updateData
      });

      // Emit status update event
      this.emit('recommendationStatusUpdated', {
        userId,
        recommendationId,
        status,
        metadata,
        timestamp: new Date()
      });

      return updatedRecommendation;

    } catch (error) {
      logger.error(`Failed to update recommendation status for ${userId}:`, error);
      throw new Error(`Failed to update recommendation status: ${error.message}`);
    }
  }

  // Get recommendation analytics
  async getRecommendationAnalytics(userId, timeRange = '30d') {
    try {
      const dateRange = this.calculateDateRange(timeRange);
      
      const recommendations = await prisma.contentRecommendation.findMany({
        where: {
          userId,
          recommendedAt: {
            gte: dateRange.start,
            lte: dateRange.end
          }
        },
        orderBy: { recommendedAt: 'asc' }
      });

      return {
        totalRecommendations: recommendations.length,
        recommendationsByType: this.groupRecommendationsByType(recommendations),
        recommendationsByAlgorithm: this.groupRecommendationsByAlgorithm(recommendations),
        recommendationsByStatus: this.groupRecommendationsByStatus(recommendations),
        engagementRate: this.calculateEngagementRate(recommendations),
        completionRate: this.calculateCompletionRate(recommendations),
        averageRating: this.calculateAverageRating(recommendations),
        popularContentTypes: this.getPopularContentTypes(recommendations),
        effectiveAlgorithms: this.getEffectiveAlgorithms(recommendations),
        timeToEngagement: this.calculateTimeToEngagement(recommendations)
      };

    } catch (error) {
      logger.error(`Failed to get recommendation analytics for ${userId}:`, error);
      throw new Error(`Failed to get recommendation analytics: ${error.message}`);
    }
  }

  // Helper methods
  mergeRecommendationScores(recommendations) {
    const merged = new Map();

    for (const rec of recommendations) {
      const key = `${rec.contentType}-${rec.contentId}`;
      
      if (merged.has(key)) {
        const existing = merged.get(key);
        // Merge scores using weighted average
        const algorithms = [existing.algorithm, rec.algorithm];
        const weights = this.getAlgorithmWeights(algorithms);
        
        const mergedScore = (existing.recommendationScore * weights[0] + rec.recommendationScore * weights[1]) / (weights[0] + weights[1]);
        
        merged.set(key, {
          ...existing,
          recommendationScore: Math.max(existing.recommendationScore, rec.recommendationScore, mergedScore),
          algorithms: [...(existing.algorithms || [existing.algorithm]), rec.algorithm],
          aiReasoning: `${existing.aiReasoning} | ${rec.aiReasoning}`
        });
      } else {
        merged.set(key, { ...rec, algorithms: [rec.algorithm] });
      }
    }

    return Array.from(merged.values());
  }

  getAlgorithmWeights(algorithms) {
    const weights = {
      'COLLABORATIVE': 0.7,
      'CONTENT_BASED': 0.8,
      'AI_DRIVEN': 0.9,
      'TRENDING': 0.6,
      'PERSONALIZED': 0.9
    };

    return algorithms.map(alg => weights[alg] || 0.5);
  }

  calculatePriority(score) {
    if (score >= 0.8) return 'URGENT';
    if (score >= 0.6) return 'HIGH';
    if (score >= 0.4) return 'MEDIUM';
    return 'LOW';
  }

  mapContentType(type) {
    const mapping = {
      'post': 'ARTICLE',
      'session': 'MENTOR_SESSION',
      'course': 'COURSE',
      'tutorial': 'TUTORIAL',
      'video': 'VIDEO'
    };
    return mapping[type] || type;
  }

  // Background processor for queued recommendations
  startRecommendationProcessor() {
    setInterval(async () => {
      if (!this.isProcessing && this.recommendationQueue.length > 0) {
        this.isProcessing = true;
        
        try {
          const recommendation = this.recommendationQueue.shift();
          await this.processQueuedRecommendation(recommendation);
        } catch (error) {
          logger.error('Error processing queued recommendation:', error);
        } finally {
          this.isProcessing = false;
        }
      }
    }, 3000); // Process every 3 seconds
  }

  async processQueuedRecommendation(recommendation) {
    return await this.generateContentRecommendations(recommendation.userId, recommendation.options);
  }

  // Queue recommendation generation
  queueRecommendation(userId, options = {}) {
    this.recommendationQueue.push({ userId, options, timestamp: new Date() });
  }

  // Health check
  async getHealthStatus() {
    try {
      const cacheStats = contentCache.getStats();
      return {
        status: 'healthy',
        timestamp: new Date(),
        cache: {
          keys: cacheStats.keys,
          hits: cacheStats.hits,
          misses: cacheStats.misses,
          hitRate: cacheStats.hits / (cacheStats.hits + cacheStats.misses) || 0
        },
        queue: {
          length: this.recommendationQueue.length,
          processing: this.isProcessing
        }
      };
    } catch (error) {
      return {
        status: 'error',
        timestamp: new Date(),
        error: error.message
      };
    }
  }

  // Clear cache
  clearCache(pattern = null) {
    if (pattern) {
      const keys = contentCache.keys().filter(key => key.includes(pattern));
      keys.forEach(key => contentCache.del(key));
    } else {
      contentCache.flushAll();
    }
  }
}

module.exports = new ContentRecommendationService();
