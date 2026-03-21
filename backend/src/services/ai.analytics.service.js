const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger.util');
const NodeCache = require('node-cache');
const EventEmitter = require('events');

const prisma = new PrismaClient();
const aiAnalyticsCache = new NodeCache({ stdTTL: 600 }); // 10 minutes cache

class AIAnalyticsService extends EventEmitter {
  constructor() {
    super();
    this.isTraining = false;
    this.models = new Map();
    this.predictionQueue = [];
    this.initializeModels();
  }

  async initializeModels() {
    try {
      // Load active AI models from database
      const models = await prisma.aIModel.findMany({
        where: { isActive: true }
      });

      models.forEach(model => {
        this.models.set(model.name, {
          ...model,
          config: JSON.parse(model.config || '{}'),
          performance: JSON.parse(model.performance || '{}')
        });
      });

      logger.info(`Loaded ${models.length} AI models`);
      
      // Start periodic model training
      this.startPeriodicTraining();
      
      // Start prediction processing
      this.startPredictionProcessor();
    } catch (error) {
      logger.error('Error initializing AI models:', error);
    }
  }

  // Analytics Event Tracking
  async trackAnalyticsEvent(userId, eventType, eventData = {}, metadata = {}) {
    try {
      const event = await prisma.aIAnalyticsEvent.create({
        data: {
          userId,
          eventType,
          eventAction: eventData.action,
          eventData: JSON.stringify(eventData),
          sessionId: metadata.sessionId,
          ipAddress: metadata.ipAddress,
          userAgent: metadata.userAgent,
          referrer: metadata.referrer,
          duration: eventData.duration,
          metadata: JSON.stringify(metadata.metadata || {})
        }
      });

      // Update user behavior patterns
      await this.updateUserBehavior(userId, eventType, eventData);

      // Emit real-time event
      this.emit('analyticsEvent', {
        type: eventType,
        userId,
        data: eventData,
        timestamp: event.createdAt
      });

      // Clear relevant cache entries
      this.clearCacheForUser(userId);

      return event;
    } catch (error) {
      logger.error('Error tracking analytics event:', error);
      throw error;
    }
  }

  // User Behavior Analysis
  async updateUserBehavior(userId, eventType, eventData) {
    try {
      const behaviorType = this.mapEventToBehaviorType(eventType);
      
      let userBehavior = await prisma.aIUserBehavior.findUnique({
        where: { userId_behaviorType: { userId, behaviorType } }
      });

      const behaviorData = userBehavior ? JSON.parse(userBehavior.behaviorData) : {};
      
      // Update behavior data based on event type
      this.updateBehaviorData(behaviorData, eventType, eventData);
      
      // Calculate confidence based on data volume
      const confidence = this.calculateBehaviorConfidence(behaviorData);

      if (userBehavior) {
        await prisma.aIUserBehavior.update({
          where: { id: userBehavior.id },
          data: {
            behaviorData: JSON.stringify(behaviorData),
            confidence,
            lastUpdated: new Date()
          }
        });
      } else {
        await prisma.aIUserBehavior.create({
          data: {
            userId,
            behaviorType,
            behaviorData: JSON.stringify(behaviorData),
            confidence
          }
        });
      }
    } catch (error) {
      logger.error('Error updating user behavior:', error);
    }
  }

  mapEventToBehaviorType(eventType) {
    const behaviorMapping = {
      'PAGE_VIEW': 'ENGAGEMENT_PATTERN',
      'CLICK': 'ENGAGEMENT_PATTERN',
      'SCROLL': 'ENGAGEMENT_PATTERN',
      'POST_LIKE': 'CONTENT_PREFERENCE',
      'POST_COMMENT': 'CONTENT_PREFERENCE',
      'POST_CREATE': 'CONTENT_PREFERENCE',
      'MENTOR_SESSION_BOOKED': 'LEARNING_STYLE',
      'MENTOR_SESSION_COMPLETED': 'LEARNING_STYLE',
      'SKILL_VIEW': 'SKILL_INTEREST',
      'SEARCH_QUERY': 'CONTENT_DISCOVERY'
    };

    return behaviorMapping[eventType] || 'GENERAL_BEHAVIOR';
  }

  updateBehaviorData(behaviorData, eventType, eventData) {
    switch (eventType) {
      case 'PAGE_VIEW':
        behaviorData.pageViews = (behaviorData.pageViews || 0) + 1;
        behaviorData.lastPageView = new Date();
        if (eventData.page) {
          behaviorData.viewedPages = behaviorData.viewedPages || [];
          behaviorData.viewedPages.push({
            page: eventData.page,
            timestamp: new Date(),
            duration: eventData.duration
          });
        }
        break;

      case 'POST_LIKE':
        behaviorData.likedPosts = behaviorData.likedPosts || [];
        behaviorData.likedPosts.push({
          postId: eventData.postId,
          timestamp: new Date()
        });
        break;

      case 'POST_COMMENT':
        behaviorData.commentedPosts = behaviorData.commentedPosts || [];
        behaviorData.commentedPosts.push({
          postId: eventData.postId,
          timestamp: new Date()
        });
        break;

      case 'MENTOR_SESSION_BOOKED':
        behaviorData.mentorSessions = behaviorData.mentorSessions || [];
        behaviorData.mentorSessions.push({
          mentorId: eventData.mentorId,
          topic: eventData.topic,
          timestamp: new Date()
        });
        break;

      case 'SEARCH_QUERY':
        behaviorData.searchQueries = behaviorData.searchQueries || [];
        behaviorData.searchQueries.push({
          query: eventData.query,
          timestamp: new Date(),
          results: eventData.results
        });
        break;
    }
  }

  calculateBehaviorConfidence(behaviorData) {
    const factors = [];
    
    if (behaviorData.pageViews) {
      factors.push(Math.min(behaviorData.pageViews / 100, 1));
    }
    
    if (behaviorData.likedPosts) {
      factors.push(Math.min(behaviorData.likedPosts.length / 50, 1));
    }
    
    if (behaviorData.mentorSessions) {
      factors.push(Math.min(behaviorData.mentorSessions.length / 10, 1));
    }
    
    if (behaviorData.searchQueries) {
      factors.push(Math.min(behaviorData.searchQueries.length / 30, 1));
    }

    return factors.length > 0 ? factors.reduce((sum, factor) => sum + factor, 0) / factors.length : 0;
  }

  // Content Recommendations
  async generateContentRecommendations(userId, options = {}) {
    try {
      const {
        contentType = 'POST',
        limit = 10,
        recommendationType = 'PERSONALIZED'
      } = options;

      const cacheKey = `content_recommendations_${userId}_${contentType}_${limit}_${recommendationType}`;
      let recommendations = aiAnalyticsCache.get(cacheKey);

      if (!recommendations) {
        // Get user behavior
        const userBehavior = await prisma.aIUserBehavior.findUnique({
          where: { userId_behaviorType: { userId, behaviorType: 'CONTENT_PREFERENCE' } }
        });

        // Get user's interaction history
        const userInteractions = await prisma.aIAnalyticsEvent.findMany({
          where: {
            userId,
            eventType: { in: ['POST_LIKE', 'POST_COMMENT', 'POST_CREATE'] }
          },
          orderBy: { timestamp: 'desc' },
          take: 100
        });

        // Generate recommendations based on different strategies
        const personalizedRecs = await this.generatePersonalizedRecommendations(userId, userBehavior, userInteractions, contentType);
        const trendingRecs = await this.generateTrendingRecommendations(contentType, limit);
        const similarRecs = await this.generateSimilarContentRecommendations(userId, userInteractions, contentType, limit);

        // Combine and rank recommendations
        recommendations = this.combineRecommendations([
          { type: 'PERSONALIZED', items: personalizedRecs, weight: 0.5 },
          { type: 'TRENDING', items: trendingRecs, weight: 0.3 },
          { type: 'SIMILAR', items: similarRecs, weight: 0.2 }
        ], limit);

        // Store recommendations in database
        await this.storeRecommendations(userId, recommendations, 'CONTENT', contentType);

        aiAnalyticsCache.set(cacheKey, recommendations);
      }

      return recommendations;
    } catch (error) {
      logger.error('Error generating content recommendations:', error);
      throw error;
    }
  }

  async generatePersonalizedRecommendations(userId, userBehavior, userInteractions, contentType) {
    try {
      const behaviorData = userBehavior ? JSON.parse(userBehavior.behaviorData) : {};
      
      // Extract user preferences from behavior
      const preferences = this.extractUserPreferences(behaviorData, userInteractions);
      
      let recommendations = [];

      if (contentType === 'POST') {
        // Get posts based on user preferences
        const posts = await prisma.post.findMany({
          where: {
            isPublished: true,
            // Filter based on user's liked content categories
            OR: this.buildPreferenceQuery(preferences)
          },
          include: {
            author: {
              select: {
                id: true,
                name: true,
                profileImage: true
              }
            },
            _count: {
              select: {
                likes: true,
                comments: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 50
        });

        recommendations = posts.map(post => ({
          contentId: post.id,
          contentType: 'POST',
          score: this.calculatePersonalizationScore(post, preferences),
          reason: 'Based on your interests and past interactions',
          data: {
            title: post.title,
            author: post.author,
            likes: post._count.likes,
            comments: post._count.comments
          }
        }));
      }

      return recommendations.sort((a, b) => b.score - a.score).slice(0, 20);
    } catch (error) {
      logger.error('Error generating personalized recommendations:', error);
      return [];
    }
  }

  async generateTrendingRecommendations(contentType, limit) {
    try {
      let recommendations = [];

      if (contentType === 'POST') {
        // Get trending posts based on recent engagement
        const trendingPosts = await prisma.post.findMany({
          where: {
            isPublished: true,
            createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
          },
          include: {
            author: {
              select: {
                id: true,
                name: true,
                profileImage: true
              }
            },
            _count: {
              select: {
                likes: true,
                comments: true
              }
            }
          },
          orderBy: { likes: { _count: 'desc' } },
          take: limit * 2
        });

        recommendations = trendingPosts.map(post => ({
          contentId: post.id,
          contentType: 'POST',
          score: this.calculateTrendingScore(post),
          reason: 'Trending in the community',
          data: {
            title: post.title,
            author: post.author,
            likes: post._count.likes,
            comments: post._count.comments
          }
        }));
      }

      return recommendations.sort((a, b) => b.score - a.score).slice(0, limit);
    } catch (error) {
      logger.error('Error generating trending recommendations:', error);
      return [];
    }
  }

  async generateSimilarContentRecommendations(userId, userInteractions, contentType, limit) {
    try {
      // Get user's recently liked posts
      const likedPosts = userInteractions
        .filter(interaction => interaction.eventType === 'POST_LIKE')
        .slice(0, 10);

      if (likedPosts.length === 0) return [];

      // Get post IDs from interactions
      const postIds = likedPosts.map(interaction => JSON.parse(interaction.eventData || '{}').postId).filter(Boolean);

      if (postIds.length === 0) return [];

      // Get similar posts based on content and tags
      const similarPosts = await prisma.post.findMany({
        where: {
          isPublished: true,
          id: { notIn: postIds },
          // Find posts with similar tags or from same authors
          OR: [
            { authorId: { in: likedPosts.map(i => JSON.parse(i.eventData || '{}').authorId).filter(Boolean) } },
            // Add more similarity criteria based on your data structure
          ]
        },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              profileImage: true
            }
          },
          _count: {
            select: {
              likes: true,
              comments: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit
      });

      return similarPosts.map(post => ({
        contentId: post.id,
        contentType: 'POST',
        score: this.calculateSimilarityScore(post, likedPosts),
        reason: 'Similar to content you liked',
        data: {
          title: post.title,
          author: post.author,
          likes: post._count.likes,
          comments: post._count.comments
        }
      }));
    } catch (error) {
      logger.error('Error generating similar content recommendations:', error);
      return [];
    }
  }

  extractUserPreferences(behaviorData, userInteractions) {
    const preferences = {
      categories: {},
      authors: {},
      topics: {},
      timeOfDay: {},
      contentType: {}
    };

    // Extract from behavior data
    if (behaviorData.viewedPages) {
      behaviorData.viewedPages.forEach(page => {
        const hour = new Date(page.timestamp).getHours();
        preferences.timeOfDay[hour] = (preferences.timeOfDay[hour] || 0) + 1;
      });
    }

    if (behaviorData.likedPosts) {
      behaviorData.likedPosts.forEach(like => {
        // Extract author preferences
        if (like.authorId) {
          preferences.authors[like.authorId] = (preferences.authors[like.authorId] || 0) + 1;
        }
      });
    }

    // Extract from interactions
    userInteractions.forEach(interaction => {
      const eventData = JSON.parse(interaction.eventData || '{}');
      
      if (eventData.category) {
        preferences.categories[eventData.category] = (preferences.categories[eventData.category] || 0) + 1;
      }
      
      if (eventData.authorId) {
        preferences.authors[eventData.authorId] = (preferences.authors[eventData.authorId] || 0) + 1;
      }
    });

    return preferences;
  }

  buildPreferenceQuery(preferences) {
    const conditions = [];
    
    // Add category preferences
    if (Object.keys(preferences.categories).length > 0) {
      const topCategories = Object.entries(preferences.categories)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([category]) => category);
      
      conditions.push({ category: { in: topCategories } });
    }

    // Add author preferences
    if (Object.keys(preferences.authors).length > 0) {
      const topAuthors = Object.entries(preferences.authors)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([authorId]) => parseInt(authorId));
      
      conditions.push({ authorId: { in: topAuthors } });
    }

    return conditions;
  }

  calculatePersonalizationScore(content, preferences) {
    let score = 0.5; // Base score

    // Category matching
    if (content.category && preferences.categories[content.category]) {
      score += 0.3 * (preferences.categories[content.category] / 10);
    }

    // Author preference
    if (preferences.authors[content.authorId]) {
      score += 0.2 * (preferences.authors[content.authorId] / 5);
    }

    return Math.min(score, 1.0);
  }

  calculateTrendingScore(content) {
    const ageInDays = (Date.now() - new Date(content.createdAt)) / (1000 * 60 * 60 * 24);
    const engagementScore = (content._count?.likes || 0) + (content._count?.comments || 0) * 2;
    
    // Trending score decreases with age
    const timeDecay = Math.exp(-ageInDays / 7);
    
    return Math.min(engagementScore * timeDecay / 100, 1.0);
  }

  calculateSimilarityScore(content, likedPosts) {
    // Simple similarity based on author and recency
    let score = 0.3; // Base score

    const likedAuthors = likedPosts.map(like => JSON.parse(like.eventData || '{}').authorId).filter(Boolean);
    
    if (likedAuthors.includes(content.authorId)) {
      score += 0.4; // Same author as liked content
    }

    // Add more sophisticated similarity calculation based on your data structure
    return Math.min(score, 1.0);
  }

  combineRecommendations(recommendationSets, limit) {
    const combined = [];
    
    recommendationSets.forEach(set => {
      set.items.forEach(item => {
        combined.push({
          ...item,
          recommendationType: set.type,
          score: item.score * set.weight
        });
      });
    });

    // Remove duplicates and sort by score
    const unique = combined.filter((item, index, self) => 
      index === self.findIndex(t => t.contentId === item.contentId && t.contentType === item.contentType)
    );

    return unique.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  async storeRecommendations(userId, recommendations, type, contentType) {
    try {
      // Clear old recommendations
      await prisma.aIContentRecommendation.deleteMany({
        where: {
          userId,
          contentType,
          expiresAt: { lt: new Date() }
        }
      });

      // Insert new recommendations
      const recommendationData = recommendations.map(rec => ({
        userId,
        contentType: rec.contentType,
        contentId: rec.contentId,
        recommendationType: rec.recommendationType,
        score: rec.score,
        reason: rec.reason,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      }));

      await prisma.aIContentRecommendation.createMany({
        data: recommendationData
      });

      logger.info(`Stored ${recommendationData.length} recommendations for user ${userId}`);
    } catch (error) {
      logger.error('Error storing recommendations:', error);
    }
  }

  // Mentor Matching
  async generateMentorMatches(menteeId, options = {}) {
    try {
      const {
        limit = 10,
        skills = null,
        experience = null
      } = options;

      const cacheKey = `mentor_matches_${menteeId}_${limit}_${skills || 'all'}_${experience || 'all'}`;
      let matches = aiAnalyticsCache.get(cacheKey);

      if (!matches) {
        // Get mentee profile and preferences
        const mentee = await prisma.user.findUnique({
          where: { id: menteeId },
          select: {
            id: true,
            name: true,
            skills: true,
            bio: true
          }
        });

        // Get available mentors
        const mentors = await prisma.user.findMany({
          where: {
            role: 'MENTOR',
            isActive: true
          },
          include: {
            mentorshipsAsMentor: {
              where: { status: 'COMPLETED' },
              select: {
                id: true,
                rating: true
              }
            },
            _count: {
              select: {
                mentorshipsAsMentor: {
                  where: { status: 'COMPLETED' }
                }
              }
            }
          }
        });

        // Calculate match scores
        const scoredMentors = mentors.map(mentor => {
          const matchScore = this.calculateMentorMatchScore(mentee, mentor, skills, experience);
          const compatibilityFactors = this.getCompatibilityFactors(mentee, mentor);
          
          return {
            mentorId: mentor.id,
            matchScore,
            compatibilityFactors,
            recommendationReasons: this.generateMatchReasons(matchScore, compatibilityFactors),
            mentor: {
              id: mentor.id,
              name: mentor.name,
              skills: mentor.skills,
              bio: mentor.bio,
              completedSessions: mentor._count.mentorshipsAsMentor,
              averageRating: this.calculateAverageRating(mentor.mentorshipsAsMentor)
            }
          };
        });

        // Sort and filter matches
        matches = scoredMentors
          .filter(match => match.matchScore > 0.3) // Minimum threshold
          .sort((a, b) => b.matchScore - a.matchScore)
          .slice(0, limit);

        // Store matches in database
        await this.storeMentorMatches(menteeId, matches);

        aiAnalyticsCache.set(cacheKey, matches);
      }

      return matches;
    } catch (error) {
      logger.error('Error generating mentor matches:', error);
      throw error;
    }
  }

  calculateMentorMatchScore(mentee, mentor, requiredSkills, requiredExperience) {
    let score = 0;

    // Skills matching (40% weight)
    if (requiredSkills && mentor.skills) {
      const mentorSkills = mentor.skills.toLowerCase().split(',').map(s => s.trim());
      const requiredSkillList = requiredSkills.toLowerCase().split(',').map(s => s.trim());
      
      const matchingSkills = requiredSkillList.filter(skill => 
        mentorSkills.some(mentorSkill => mentorSkill.includes(skill) || skill.includes(mentorSkill))
      );
      
      score += (matchingSkills.length / requiredSkillList.length) * 0.4;
    } else if (mentor.skills) {
      score += 0.2; // Partial credit for having skills listed
    }

    // Experience matching (30% weight)
    const completedSessions = mentor._count?.mentorshipsAsMentor || 0;
    if (completedSessions > 0) {
      score += Math.min(completedSessions / 50, 1) * 0.3;
    }

    // Rating matching (20% weight)
    const averageRating = this.calculateAverageRating(mentor.mentorshipsAsMentor);
    if (averageRating > 0) {
      score += (averageRating / 5) * 0.2;
    }

    // Availability (10% weight)
    score += 0.1; // Base availability score

    return Math.min(score, 1.0);
  }

  getCompatibilityFactors(mentee, mentor) {
    return {
      skillsMatch: this.calculateSkillsMatch(mentee.skills, mentor.skills),
      experienceLevel: this.getExperienceLevel(mentor._count?.mentorshipsAsMentor || 0),
      rating: this.calculateAverageRating(mentor.mentorshipsAsMentor),
      availability: 0.8 // Placeholder - would check actual availability
    };
  }

  calculateSkillsMatch(menteeSkills, mentorSkills) {
    if (!menteeSkills || !mentorSkills) return 0;
    
    const menteeSkillList = menteeSkills.toLowerCase().split(',').map(s => s.trim());
    const mentorSkillList = mentorSkills.toLowerCase().split(',').map(s => s.trim());
    
    const matchingSkills = menteeSkillList.filter(skill => 
      mentorSkillList.some(mentorSkill => mentorSkill.includes(skill) || skill.includes(mentorSkill))
    );
    
    return matchingSkills.length / Math.max(menteeSkillList.length, 1);
  }

  getExperienceLevel(sessionCount) {
    if (sessionCount >= 50) return 'EXPERT';
    if (sessionCount >= 20) return 'ADVANCED';
    if (sessionCount >= 10) return 'INTERMEDIATE';
    if (sessionCount >= 5) return 'BEGINNER';
    return 'NEW';
  }

  calculateAverageRating(mentorships) {
    if (!mentorships || mentorships.length === 0) return 0;
    
    const ratings = mentorships
      .map(m => m.rating)
      .filter(rating => rating != null);
    
    if (ratings.length === 0) return 0;
    
    return ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
  }

  generateMatchReasons(matchScore, compatibilityFactors) {
    const reasons = [];
    
    if (compatibilityFactors.skillsMatch > 0.7) {
      reasons.push('Strong skills alignment');
    }
    
    if (compatibilityFactors.experienceLevel === 'EXPERT' || compatibilityFactors.experienceLevel === 'ADVANCED') {
      reasons.push('Highly experienced mentor');
    }
    
    if (compatibilityFactors.rating >= 4.5) {
      reasons.push('Excellent user ratings');
    }
    
    if (matchScore > 0.8) {
      reasons.push('Overall high compatibility');
    }
    
    return reasons;
  }

  async storeMentorMatches(menteeId, matches) {
    try {
      // Clear old matches
      await prisma.aIMentorMatch.deleteMany({
        where: {
          menteeId,
          expiresAt: { lt: new Date() }
        }
      });

      // Insert new matches
      const matchData = matches.map(match => ({
        menteeId,
        mentorId: match.mentorId,
        matchScore: match.matchScore,
        compatibilityFactors: JSON.stringify(match.compatibilityFactors),
        recommendationReasons: JSON.stringify(match.recommendationReasons),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      }));

      await prisma.aIMentorMatch.createMany({
        data: matchData
      });

      logger.info(`Stored ${matchData.length} mentor matches for mentee ${menteeId}`);
    } catch (error) {
      logger.error('Error storing mentor matches:', error);
    }
  }

  // Learning Path Generation
  async generateLearningPath(userId, options = {}) {
    try {
      const {
        pathType = 'SKILL_BASED',
        targetSkills = null,
        difficulty = 'INTERMEDIATE',
        estimatedDuration = 40 // hours
      } = options;

      // Get user profile and current skills
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          skills: true,
          bio: true
        }
      });

      // Get user behavior and preferences
      const userBehavior = await prisma.aIUserBehavior.findMany({
        where: { userId }
      });

      // Generate learning path based on type
      let pathData;
      switch (pathType) {
        case 'SKILL_BASED':
          pathData = await this.generateSkillBasedPath(user, userBehavior, targetSkills, difficulty);
          break;
        case 'CAREER_BASED':
          pathData = await this.generateCareerBasedPath(user, userBehavior);
          break;
        case 'PERSONALIZED':
          pathData = await this.generatePersonalizedPath(user, userBehavior);
          break;
        default:
          pathData = await this.generateSkillBasedPath(user, userBehavior, targetSkills, difficulty);
      }

      // Store learning path
      const learningPath = await prisma.aILearningPath.create({
        data: {
          userId,
          pathName: pathData.name,
          pathType,
          pathData: JSON.stringify(pathData),
          estimatedDuration,
          difficulty,
          isActive: true
        }
      });

      // Create learning path steps
      if (pathData.steps && pathData.steps.length > 0) {
        const stepData = pathData.steps.map((step, index) => ({
          pathId: learningPath.id,
          stepOrder: index + 1,
          stepType: step.type,
          stepData: JSON.stringify(step),
          estimatedTime: step.estimatedTime,
          prerequisites: JSON.stringify(step.prerequisites || [])
        }));

        await prisma.aILearningPathStep.createMany({
          data: stepData
        });
      }

      return learningPath;
    } catch (error) {
      logger.error('Error generating learning path:', error);
      throw error;
    }
  }

  async generateSkillBasedPath(user, userBehavior, targetSkills, difficulty) {
    const currentSkills = user.skills ? user.skills.split(',').map(s => s.trim()) : [];
    const targetSkillList = targetSkills ? targetSkills.split(',').map(s => s.trim()) : [];

    // Define learning steps based on skills gap
    const steps = [];
    const skillsGap = targetSkillList.filter(skill => !currentSkills.includes(skill));

    // Add foundational content
    steps.push({
      type: 'CONTENT',
      title: 'Introduction to Core Concepts',
      description: 'Learn the fundamental concepts',
      estimatedTime: 120, // 2 hours
      prerequisites: [],
      resources: [
        { type: 'POST', category: 'TUTORIAL' },
        { type: 'VIDEO', category: 'INTRODUCTION' }
      ]
    });

    // Add skill-specific steps
    skillsGap.forEach((skill, index) => {
      steps.push({
        type: 'CONTENT',
        title: `Master ${skill}`,
        description: `Deep dive into ${skill} concepts and practices`,
        estimatedTime: 240, // 4 hours
        prerequisites: index === 0 ? [] : [skillsGap[index - 1]],
        resources: [
          { type: 'POST', category: skill },
          { type: 'EXERCISE', category: skill }
        ]
      });

      steps.push({
        type: 'EXERCISE',
        title: `${skill} Practice Project`,
        description: `Apply your ${skill} knowledge in a practical project`,
        estimatedTime: 180, // 3 hours
        prerequisites: [`Master ${skill}`],
        resources: [
          { type: 'PROJECT', category: skill }
        ]
      });
    });

    // Add mentorship sessions
    steps.push({
      type: 'MENTOR_SESSION',
      title: 'Guided Mentorship Session',
      description: 'Get personalized guidance from an expert mentor',
      estimatedTime: 60, // 1 hour
      prerequisites: skillsGap.length > 0 ? [`${skillsGap[skillsGap.length - 1]} Practice Project`] : [],
      resources: [
        { type: 'MENTOR', category: 'EXPERT_GUIDANCE' }
      ]
    });

    // Add assessment
    steps.push({
      type: 'ASSESSMENT',
      title: 'Final Assessment',
      description: 'Test your knowledge and skills',
      estimatedTime: 90, // 1.5 hours
      prerequisites: ['Guided Mentorship Session'],
      resources: [
        { type: 'QUIZ', category: 'COMPREHENSIVE' }
      ]
    });

    return {
      name: `${targetSkills || 'Comprehensive'} Learning Path`,
      description: `Personalized learning path to master ${targetSkills || 'core skills'}`,
      steps,
      estimatedDuration: steps.reduce((sum, step) => sum + (step.estimatedTime || 0), 0),
      difficulty
    };
  }

  async generateCareerBasedPath(user, userBehavior) {
    // Analyze user's career goals from bio and behavior
    const careerGoals = this.extractCareerGoals(user, userBehavior);
    
    // Generate career-focused learning path
    const steps = [
      {
        type: 'CONTENT',
        title: 'Career Planning and Goal Setting',
        description: 'Define your career objectives and create a roadmap',
        estimatedTime: 90,
        prerequisites: [],
        resources: [
          { type: 'ARTICLE', category: 'CAREER_PLANNING' }
        ]
      },
      {
        type: 'CONTENT',
        title: 'Industry-Specific Skills',
        description: `Learn essential skills for ${careerGoals.industry || 'your industry'}`,
        estimatedTime: 300,
        prerequisites: ['Career Planning and Goal Setting'],
        resources: [
          { type: 'COURSE', category: careerGoals.industry || 'GENERAL' }
        ]
      },
      {
        type: 'MENTOR_SESSION',
        title: 'Career Guidance Session',
        description: 'Get advice from industry professionals',
        estimatedTime: 60,
        prerequisites: ['Industry-Specific Skills'],
        resources: [
          { type: 'MENTOR', category: 'CAREER_ADVICE' }
        ]
      }
    ];

    return {
      name: 'Career Development Path',
      description: 'Structured path to achieve your career goals',
      steps,
      estimatedDuration: steps.reduce((sum, step) => sum + (step.estimatedTime || 0), 0),
      difficulty: 'INTERMEDIATE'
    };
  }

  async generatePersonalizedPath(user, userBehavior) {
    // Analyze user's learning style and preferences
    const learningStyle = this.analyzeLearningStyle(userBehavior);
    const interests = this.extractInterests(userBehavior);

    // Generate personalized learning path
    const steps = [
      {
        type: 'CONTENT',
        title: `Personalized ${learningStyle.style} Learning`,
        description: `Content tailored to your ${learningStyle.style} learning style`,
        estimatedTime: 180,
        prerequisites: [],
        resources: [
          { type: 'CONTENT', style: learningStyle.style, category: interests.primary }
        ]
      },
      {
        type: 'EXERCISE',
        title: 'Interactive Practice',
        description: 'Hands-on exercises based on your interests',
        estimatedTime: 150,
        prerequisites: [`Personalized ${learningStyle.style} Learning`],
        resources: [
          { type: 'EXERCISE', category: interests.primary }
        ]
      }
    ];

    return {
      name: 'Personalized Learning Journey',
      description: 'Custom learning path based on your preferences and behavior',
      steps,
      estimatedDuration: steps.reduce((sum, step) => sum + (step.estimatedTime || 0), 0),
      difficulty: 'ADAPTIVE'
    };
  }

  extractCareerGoals(user, userBehavior) {
    // Simple extraction - in production, this would be more sophisticated
    const bio = user.bio || '';
    const goals = {
      industry: null,
      role: null,
      timeline: null
    };

    // Extract keywords from bio
    if (bio.toLowerCase().includes('software') || bio.toLowerCase().includes('developer')) {
      goals.industry = 'TECHNOLOGY';
      goals.role = 'DEVELOPER';
    }

    return goals;
  }

  analyzeLearningStyle(userBehavior) {
    const behaviorData = userBehavior.reduce((acc, behavior) => {
      const data = JSON.parse(behavior.behaviorData || '{}');
      return { ...acc, ...data };
    }, {});

    // Analyze interaction patterns
    const style = {
      style: 'VISUAL', // Default
      preferences: []
    };

    // Determine learning style based on behavior patterns
    if (behaviorData.videosWatched > behaviorData.articlesRead) {
      style.style = 'VISUAL';
    } else if (behaviorData.articlesRead > behaviorData.videosWatched) {
      style.style = 'READING';
    } else if (behaviorData.interactiveExercises > 0) {
      style.style = 'KINESTHETIC';
    }

    return style;
  }

  extractInterests(userBehavior) {
    const interests = {
      primary: 'GENERAL',
      secondary: []
    };

    // Extract interests from behavior data
    userBehavior.forEach(behavior => {
      if (behavior.behaviorType === 'CONTENT_PREFERENCE') {
        const data = JSON.parse(behavior.behaviorData || '{}');
        if (data.categories) {
          const topCategory = Object.entries(data.categories)
            .sort(([,a], [,b]) => b - a)[0];
          if (topCategory) {
            interests.primary = topCategory[0];
            interests.secondary = Object.keys(data.categories)
              .filter(cat => cat !== topCategory[0])
              .slice(0, 3);
          }
        }
      }
    });

    return interests;
  }

  // Predictive Analytics
  async generatePredictions(userId, predictionType, options = {}) {
    try {
      const cacheKey = `predictions_${userId}_${predictionType}`;
      let predictions = aiAnalyticsCache.get(cacheKey);

      if (!predictions) {
        // Get user data for prediction
        const userData = await this.getUserPredictionData(userId);
        
        // Generate predictions based on type
        switch (predictionType) {
          case 'ENGAGEMENT':
            predictions = await this.predictEngagement(userData, options);
            break;
          case 'RETENTION':
            predictions = await this.predictRetention(userData, options);
            break;
          case 'PERFORMANCE':
            predictions = await this.predictPerformance(userData, options);
            break;
          case 'CONTENT_SUCCESS':
            predictions = await this.predictContentSuccess(userData, options);
            break;
          default:
            predictions = [];
        }

        // Store predictions
        await this.storePredictions(userId, predictions, predictionType);

        aiAnalyticsCache.set(cacheKey, predictions);
      }

      return predictions;
    } catch (error) {
      logger.error('Error generating predictions:', error);
      throw error;
    }
  }

  async getUserPredictionData(userId) {
    // Get comprehensive user data for predictions
    const [user, behavior, analytics, interactions] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          skills: true,
          bio: true,
          createdAt: true,
          lastLoginAt: true
        }
      }),
      prisma.aIUserBehavior.findMany({
        where: { userId }
      }),
      prisma.aIAnalyticsEvent.findMany({
        where: { userId },
        orderBy: { timestamp: 'desc' },
        take: 100
      }),
      prisma.aIAnalyticsEvent.findMany({
        where: { userId },
        select: ['eventType', 'timestamp']
      })
    ]);

    return {
      user,
      behavior,
      analytics,
      interactions
    };
  }

  async predictEngagement(userData, options) {
    const { timeRange = '30d' } = options;
    
    // Calculate engagement metrics
    const recentEvents = userData.analytics.filter(event => 
      new Date(event.timestamp) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    );

    const engagementScore = this.calculateEngagementScore(recentEvents);
    const trend = this.calculateEngagementTrend(recentEvents);
    
    return [{
      predictionType: 'ENGAGEMENT',
      predictionData: JSON.stringify({
        currentScore: engagementScore,
        trend,
        projectedScore: engagementScore + (trend * 0.1),
        confidence: 0.75,
        factors: {
          loginFrequency: this.calculateLoginFrequency(userData.analytics),
          interactionRate: this.calculateInteractionRate(recentEvents),
          sessionDuration: this.calculateAverageSessionDuration(recentEvents)
        }
      }),
      confidence: 0.75,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    }];
  }

  async predictRetention(userData, options) {
    const { timeRange = '90d' } = options;
    
    // Calculate retention risk factors
    const riskFactors = {
      lowEngagement: false,
      decreasingActivity: false,
      longInactivity: false,
      negativeInteractions: false
    };

    const recentEvents = userData.analytics.filter(event => 
      new Date(event.timestamp) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    );

    // Check risk factors
    if (recentEvents.length < 10) {
      riskFactors.lowEngagement = true;
    }

    const activityTrend = this.calculateActivityTrend(userData.analytics);
    if (activityTrend < -0.2) {
      riskFactors.decreasingActivity = true;
    }

    const daysSinceLastLogin = userData.user.lastLoginAt 
      ? Math.floor((Date.now() - new Date(userData.user.lastLoginAt)) / (1000 * 60 * 60 * 24))
      : 999;

    if (daysSinceLastLogin > 30) {
      riskFactors.longInactivity = true;
    }

    // Calculate retention probability
    const riskScore = Object.values(riskFactors).filter(Boolean).length / 4;
    const retentionProbability = 1 - riskScore;

    return [{
      predictionType: 'RETENTION',
      predictionData: JSON.stringify({
        retentionProbability,
        riskLevel: riskScore > 0.7 ? 'HIGH' : riskScore > 0.4 ? 'MEDIUM' : 'LOW',
        riskFactors,
        daysSinceLastLogin,
        recommendations: this.generateRetentionRecommendations(riskFactors)
      }),
      confidence: 0.8,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    }];
  }

  async predictPerformance(userData, options) {
    const { domain = 'GENERAL' } = options;
    
    // Calculate performance indicators
    const performanceIndicators = {
      learningVelocity: this.calculateLearningVelocity(userData.behavior),
      skillAcquisition: this.calculateSkillAcquisition(userData.behavior),
      engagementQuality: this.calculateEngagementQuality(userData.analytics),
      consistency: this.calculateConsistency(userData.analytics)
    };

    // Generate performance prediction
    const overallScore = Object.values(performanceIndicators)
      .reduce((sum, score) => sum + score, 0) / 4;

    return [{
      predictionType: 'PERFORMANCE',
      predictionData: JSON.stringify({
        overallScore,
        indicators: performanceIndicators,
        projectedPerformance: overallScore + 0.05, // Slight improvement expected
        strengths: this.identifyStrengths(performanceIndicators),
        improvements: this.identifyImprovements(performanceIndicators)
      }),
      confidence: 0.7,
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
    }];
  }

  async predictContentSuccess(userData, options) {
    const { contentType = 'POST' } = options;
    
    // Analyze user's content success patterns
    const userContent = await prisma.post.findMany({
      where: { authorId: userData.user.id },
      include: {
        _count: {
          select: {
            likes: true,
            comments: true
          }
        }
      }
    });

    const successPatterns = this.analyzeContentSuccessPatterns(userContent);
    
    return [{
      predictionType: 'CONTENT_SUCCESS',
      predictionData: JSON.stringify({
        predictedEngagement: successPatterns.averageEngagement,
        optimalPostingTime: successPatterns.optimalTime,
        recommendedTopics: successPatterns.recommendedTopics,
        contentFormatSuggestions: successPatterns.formatSuggestions,
        successProbability: successPatterns.successProbability
      }),
      confidence: 0.65,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    }];
  }

  calculateEngagementScore(events) {
    if (events.length === 0) return 0;

    const engagementEvents = events.filter(event => 
      ['POST_LIKE', 'POST_COMMENT', 'POST_CREATE', 'MENTOR_SESSION_BOOKED'].includes(event.eventType)
    );

    // Score based on variety and frequency
    const varietyScore = new Set(engagementEvents.map(e => e.eventType)).size / 4;
    const frequencyScore = Math.min(engagementEvents.length / 30, 1); // 30 interactions per month = full score

    return (varietyScore + frequencyScore) / 2;
  }

  calculateEngagementTrend(events) {
    if (events.length < 10) return 0;

    // Sort events by timestamp
    const sortedEvents = events.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    // Calculate trend over time
    const firstHalf = sortedEvents.slice(0, Math.floor(sortedEvents.length / 2));
    const secondHalf = sortedEvents.slice(Math.floor(sortedEvents.length / 2));

    const firstHalfRate = firstHalf.length / (sortedEvents.length / 2);
    const secondHalfRate = secondHalf.length / (sortedEvents.length / 2);

    return secondHalfRate - firstHalfRate;
  }

  calculateLoginFrequency(events) {
    const loginEvents = events.filter(event => event.eventType === 'SESSION_START');
    if (loginEvents.length === 0) return 0;

    const uniqueDays = new Set(loginEvents.map(event => 
      new Date(event.timestamp).toDateString()
    )).size;

    return uniqueDays / 30; // Frequency over last 30 days
  }

  calculateInteractionRate(events) {
    const interactionEvents = events.filter(event => 
      ['POST_LIKE', 'POST_COMMENT', 'POST_CREATE'].includes(event.eventType)
    );

    return interactionEvents.length / Math.max(events.length, 1);
  }

  calculateAverageSessionDuration(events) {
    const sessionEvents = events.filter(event => event.duration);
    if (sessionEvents.length === 0) return 0;

    const totalDuration = sessionEvents.reduce((sum, event) => sum + event.duration, 0);
    return totalDuration / sessionEvents.length;
  }

  calculateActivityTrend(allEvents) {
    if (allEvents.length < 20) return 0;

    const sortedEvents = allEvents.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    const firstQuarter = sortedEvents.slice(0, Math.floor(sortedEvents.length / 4));
    const lastQuarter = sortedEvents.slice(Math.floor(sortedEvents.length * 3 / 4));

    const firstQuarterRate = firstQuarter.length / (sortedEvents.length / 4);
    const lastQuarterRate = lastQuarter.length / (sortedEvents.length / 4);

    return (lastQuarterRate - firstQuarterRate) / firstQuarterRate;
  }

  generateRetentionRecommendations(riskFactors) {
    const recommendations = [];

    if (riskFactors.lowEngagement) {
      recommendations.push('Increase engagement through personalized content recommendations');
    }

    if (riskFactors.decreasingActivity) {
      recommendations.push('Re-engage with targeted notifications and incentives');
    }

    if (riskFactors.longInactivity) {
      recommendations.push('Send re-engagement campaign with special offers');
    }

    return recommendations;
  }

  calculateLearningVelocity(behavior) {
    // Calculate how quickly user is learning new skills
    const learningBehavior = behavior.find(b => b.behaviorType === 'LEARNING_STYLE');
    if (!learningBehavior) return 0.5;

    const data = JSON.parse(learningBehavior.behaviorData || '{}');
    return Math.min((data.completedModules || 0) / 10, 1);
  }

  calculateSkillAcquisition(behavior) {
    // Calculate skill acquisition rate
    const skillBehavior = behavior.find(b => b.behaviorType === 'SKILL_INTEREST');
    if (!skillBehavior) return 0.5;

    const data = JSON.parse(skillBehavior.behaviorData || '{}');
    return Math.min((data.newSkills || 0) / 5, 1);
  }

  calculateEngagementQuality(analytics) {
    // Calculate quality of engagement (not just quantity)
    const qualityEvents = analytics.filter(event => 
      ['POST_COMMENT', 'MENTOR_SESSION_COMPLETED'].includes(event.eventType)
    );

    return Math.min(qualityEvents.length / Math.max(analytics.length, 1), 1);
  }

  calculateConsistency(analytics) {
    // Calculate consistency of user activity
    if (analytics.length === 0) return 0;

    const dailyActivity = {};
    analytics.forEach(event => {
      const day = new Date(event.timestamp).toDateString();
      dailyActivity[day] = (dailyActivity[day] || 0) + 1;
    });

    const activeDays = Object.keys(dailyActivity).length;
    const totalDays = Math.max(...Object.values(dailyActivity).map((_, index) => index + 1), 1);

    return activeDays / totalDays;
  }

  identifyStrengths(indicators) {
    const strengths = [];
    
    Object.entries(indicators).forEach(([key, value]) => {
      if (value > 0.7) {
        strengths.push(key.replace(/([A-Z])/g, ' $1').trim());
      }
    });

    return strengths;
  }

  identifyImprovements(indicators) {
    const improvements = [];
    
    Object.entries(indicators).forEach(([key, value]) => {
      if (value < 0.5) {
        improvements.push(key.replace(/([A-Z])/g, ' $1').trim());
      }
    });

    return improvements;
  }

  analyzeContentSuccessPatterns(content) {
    if (content.length === 0) {
      return {
        averageEngagement: 0,
        optimalTime: '10:00',
        recommendedTopics: ['GENERAL'],
        formatSuggestions: ['TUTORIAL'],
        successProbability: 0.5
      };
    }

    // Calculate engagement metrics
    const engagements = content.map(post => ({
      likes: post._count?.likes || 0,
      comments: post._count?.comments || 0,
      createdAt: post.createdAt
    }));

    const averageEngagement = engagements.reduce((sum, e) => 
      sum + e.likes + e.comments * 2, 0) / engagements.length;

    // Find optimal posting time
    const hourEngagement = {};
    engagements.forEach(engagement => {
      const hour = new Date(engagement.createdAt).getHours();
      hourEngagement[hour] = (hourEngagement[hour] || 0) + engagement.likes + engagement.comments;
    });

    const optimalHour = Object.entries(hourEngagement)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 10;

    return {
      averageEngagement,
      optimalTime: `${optimalHour}:00`,
      recommendedTopics: ['TECHNICAL', 'TUTORIAL'], // Would be calculated from content analysis
      formatSuggestions: ['HOW_TO', 'TUTORIAL'],
      successProbability: Math.min(averageEngagement / 10, 1)
    };
  }

  async storePredictions(userId, predictions, predictionType) {
    try {
      // Clear old predictions
      await prisma.aIPrediction.deleteMany({
        where: {
          userId,
          predictionType,
          expiresAt: { lt: new Date() }
        }
      });

      // Insert new predictions
      const predictionData = predictions.map(prediction => ({
        userId,
        predictionType,
        predictionData: prediction.predictionData,
        confidence: prediction.confidence,
        expiresAt: prediction.expiresAt
      }));

      await prisma.aIPrediction.createMany({
        data: predictionData
      });

      logger.info(`Stored ${predictionData.length} ${predictionType} predictions for user ${userId}`);
    } catch (error) {
      logger.error('Error storing predictions:', error);
    }
  }

  // AI Insights Generation
  async generateInsights(insightType, options = {}) {
    try {
      const cacheKey = `insights_${insightType}_${JSON.stringify(options)}`;
      let insights = aiAnalyticsCache.get(cacheKey);

      if (!insights) {
        switch (insightType) {
          case 'USER_TREND':
            insights = await this.generateUserTrendInsights(options);
            break;
          case 'PLATFORM_TREND':
            insights = await this.generatePlatformTrendInsights(options);
            break;
          case 'CONTENT_TREND':
            insights = await this.generateContentTrendInsights(options);
            break;
          case 'PERFORMANCE_ANOMALY':
            insights = await this.generatePerformanceAnomalyInsights(options);
            break;
          default:
            insights = [];
        }

        // Store insights
        await this.storeInsights(insights, insightType);

        aiAnalyticsCache.set(cacheKey, insights);
      }

      return insights;
    } catch (error) {
      logger.error('Error generating insights:', error);
      throw error;
    }
  }

  async generateUserTrendInsights(options) {
    const { timeRange = '30d', userId = null } = options;

    // Get user activity data
    const whereClause = {
      timestamp: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    };

    if (userId) {
      whereClause.userId = userId;
    }

    const events = await prisma.aIAnalyticsEvent.findMany({
      where: whereClause,
      orderBy: { timestamp: 'desc' },
      take: 1000
    });

    const insights = [];

    // Analyze engagement patterns
    const engagementByHour = {};
    const engagementByDay = {};
    
    events.forEach(event => {
      const date = new Date(event.timestamp);
      const hour = date.getHours();
      const day = date.getDay();
      
      engagementByHour[hour] = (engagementByHour[hour] || 0) + 1;
      engagementByDay[day] = (engagementByDay[day] || 0) + 1;
    });

    // Peak activity time insight
    const peakHour = Object.entries(engagementByHour)
      .sort(([,a], [,b]) => b - a)[0];

    if (peakHour) {
      insights.push({
        insightType: 'USER_TREND',
        title: 'Peak Activity Time Identified',
        description: `Users are most active at ${peakHour[0]}:00`,
        insightData: JSON.stringify({
          peakHour: parseInt(peakHour[0]),
          activityCount: peakHour[1],
          recommendation: 'Schedule important content releases during peak hours'
        }),
        confidence: 0.8,
        impact: 'MEDIUM'
      });
    }

    // Engagement trend insight
    const trend = this.calculateEngagementTrend(events);
    if (Math.abs(trend) > 0.1) {
      insights.push({
        insightType: 'USER_TREND',
        title: `Engagement ${trend > 0 ? 'Increasing' : 'Decreasing'}`,
        description: `User engagement is ${trend > 0 ? 'increasing' : 'decreasing'} over the analyzed period`,
        insightData: JSON.stringify({
          trend,
          recommendation: trend > 0 ? 'Continue current engagement strategies' : 'Investigate causes of declining engagement'
        }),
        confidence: 0.7,
        impact: trend > 0 ? 'LOW' : 'HIGH'
      });
    }

    return insights;
  }

  async generatePlatformTrendInsights(options) {
    const { timeRange = '30d' } = options;

    // Get platform-wide metrics
    const [userGrowth, contentGrowth, engagementMetrics] = await Promise.all([
      this.calculateUserGrowth(timeRange),
      this.calculateContentGrowth(timeRange),
      this.calculatePlatformEngagement(timeRange)
    ]);

    const insights = [];

    // User growth insight
    if (userGrowth.growthRate > 0.1) {
      insights.push({
        insightType: 'PLATFORM_TREND',
        title: 'Rapid User Growth Detected',
        description: `Platform user base growing at ${(userGrowth.growthRate * 100).toFixed(1)}% per week`,
        insightData: JSON.stringify({
          growthRate: userGrowth.growthRate,
          newUsers: userGrowth.newUsers,
          recommendation: 'Ensure infrastructure can handle growth'
        }),
        confidence: 0.9,
        impact: 'HIGH'
      });
    }

    // Content quality insight
    if (contentGrowth.averageEngagement < 2) {
      insights.push({
        insightType: 'PLATFORM_TREND',
        title: 'Low Content Engagement',
        description: 'Average content engagement is below optimal levels',
        insightData: JSON.stringify({
          averageEngagement: contentGrowth.averageEngagement,
          recommendation: 'Focus on content quality improvement and user engagement initiatives'
        }),
        confidence: 0.8,
        impact: 'MEDIUM'
      });
    }

    return insights;
  }

  async generateContentTrendInsights(options) {
    const { timeRange = '30d' } = options;

    // Get content performance data
    const topContent = await prisma.post.findMany({
      where: {
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        isPublished: true
      },
      include: {
        _count: {
          select: {
            likes: true,
            comments: true
          }
        }
      },
      orderBy: { likes: { _count: 'desc' } },
      take: 50
    });

    const insights = [];

    // Trending topics insight
    const topicAnalysis = this.analyzeContentTopics(topContent);
    const trendingTopics = Object.entries(topicAnalysis)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);

    if (trendingTopics.length > 0) {
      insights.push({
        insightType: 'CONTENT_TREND',
        title: 'Trending Topics Identified',
        description: `Top trending topics: ${trendingTopics.map(([topic]) => topic).join(', ')}`,
        insightData: JSON.stringify({
          trendingTopics,
          recommendation: 'Create more content around trending topics'
        }),
        confidence: 0.85,
        impact: 'MEDIUM'
      });
    }

    return insights;
  }

  async generatePerformanceAnomalyInsights(options) {
    const { timeRange = '7d' } = options;

    // Get recent performance metrics
    const metrics = await prisma.aIAnalyticsMetrics.findMany({
      where: {
        calculatedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      },
      orderBy: { calculatedAt: 'desc' }
    });

    const insights = [];

    // Detect anomalies in metrics
    const anomalies = this.detectAnomalies(metrics);
    
    anomalies.forEach(anomaly => {
      insights.push({
        insightType: 'PERFORMANCE_ANOMALY',
        title: `${anomaly.metric} Anomaly Detected`,
        description: `${anomaly.metric} is ${anomaly.direction} than expected`,
        insightData: JSON.stringify({
          anomaly,
          recommendation: 'Investigate the cause of this performance anomaly'
        }),
        confidence: anomaly.confidence,
        impact: anomaly.severity
      });
    });

    return insights;
  }

  calculateUserGrowth(timeRange) {
    // Placeholder implementation
    return {
      growthRate: 0.05,
      newUsers: 150,
      totalUsers: 3000
    };
  }

  calculateContentGrowth(timeRange) {
    // Placeholder implementation
    return {
      growthRate: 0.08,
      newContent: 200,
      averageEngagement: 3.5
    };
  }

  calculatePlatformEngagement(timeRange) {
    // Placeholder implementation
    return {
      averageSessionDuration: 1200, // seconds
      dailyActiveUsers: 500,
      engagementRate: 0.65
    };
  }

  analyzeContentTopics(content) {
    const topics = {};
    
    content.forEach(post => {
      // Simple topic extraction - in production, use NLP
      const words = (post.title + ' ' + (post.content || '')).toLowerCase().split(/\s+/);
      const keywords = words.filter(word => word.length > 4);
      
      keywords.forEach(keyword => {
        topics[keyword] = (topics[keyword] || 0) + 1;
      });
    });

    return topics;
  }

  detectAnomalies(metrics) {
    const anomalies = [];
    
    // Simple anomaly detection - in production, use more sophisticated algorithms
    metrics.forEach(metric => {
      const historicalValues = metrics
        .filter(m => m.metricName === metric.metricName)
        .slice(1, 6) // Last 5 values
        .map(m => m.metricValue);

      if (historicalValues.length >= 3) {
        const mean = historicalValues.reduce((sum, val) => sum + val, 0) / historicalValues.length;
        const stdDev = Math.sqrt(
          historicalValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / historicalValues.length
        );

        const threshold = 2 * stdDev;
        const deviation = Math.abs(metric.metricValue - mean);

        if (deviation > threshold) {
          anomalies.push({
            metric: metric.metricName,
            currentValue: metric.metricValue,
            expectedValue: mean,
            direction: metric.metricValue > mean ? 'higher' : 'lower',
            confidence: Math.min(deviation / threshold, 1),
            severity: deviation > 3 * stdDev ? 'HIGH' : 'MEDIUM'
          });
        }
      }
    });

    return anomalies;
  }

  async storeInsights(insights, insightType) {
    try {
      const insightData = insights.map(insight => ({
        insightType,
        title: insight.title,
        description: insight.description,
        insightData: insight.insightData,
        confidence: insight.confidence,
        impact: insight.impact,
        isActionable: insight.isActionable !== false,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      }));

      await prisma.aIInsight.createMany({
        data: insightData
      });

      logger.info(`Stored ${insightData.length} ${insightType} insights`);
    } catch (error) {
      logger.error('Error storing insights:', error);
    }
  }

  // Model Training
  async startPeriodicTraining() {
    setInterval(async () => {
      if (!this.isTraining) {
        await this.trainModels();
      }
    }, 24 * 60 * 60 * 1000); // Daily training
  }

  async trainModels() {
    try {
      this.isTraining = true;
      logger.info('Starting AI model training...');

      const models = await prisma.aIModel.findMany({
        where: { isActive: true }
      });

      for (const model of models) {
        await this.trainModel(model);
      }

      logger.info('AI model training completed');
    } catch (error) {
      logger.error('Error during model training:', error);
    } finally {
      this.isTraining = false;
    }
  }

  async trainModel(model) {
    try {
      // Create training record
      const training = await prisma.aIModelTraining.create({
        data: {
          modelId: model.id,
          trainingType: 'INCREMENTAL',
          status: 'RUNNING',
          progress: 0
        }
      });

      // Simulate training process
      for (let progress = 0; progress <= 100; progress += 10) {
        await prisma.aIModelTraining.update({
          where: { id: training.id },
          data: { progress: progress / 100 }
        });

        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate training time
      }

      // Update model with new performance metrics
      const performanceMetrics = await this.calculateModelPerformance(model);
      
      await prisma.aIModel.update({
        where: { id: model.id },
        data: {
          performance: JSON.stringify(performanceMetrics),
          lastTrainedAt: new Date()
        }
      });

      await prisma.aIModelTraining.update({
        where: { id: training.id },
        data: {
          status: 'COMPLETED',
          progress: 1,
          completedAt: new Date(),
          metrics: JSON.stringify(performanceMetrics)
        }
      });

      logger.info(`Model ${model.name} training completed`);
    } catch (error) {
      logger.error(`Error training model ${model.name}:`, error);
    }
  }

  async calculateModelPerformance(model) {
    // Placeholder implementation - in production, calculate actual metrics
    return {
      accuracy: 0.85 + Math.random() * 0.1,
      precision: 0.82 + Math.random() * 0.1,
      recall: 0.88 + Math.random() * 0.1,
      f1Score: 0.85 + Math.random() * 0.1
    };
  }

  startPredictionProcessor() {
    setInterval(async () => {
      if (this.predictionQueue.length > 0) {
        const batch = this.predictionQueue.splice(0, 10); // Process 10 at a time
        
        for (const prediction of batch) {
          try {
            await this.processPrediction(prediction);
          } catch (error) {
            logger.error('Error processing prediction:', error);
          }
        }
      }
    }, 5000); // Process every 5 seconds
  }

  async processPrediction(prediction) {
    // Simulate prediction processing
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Emit prediction completed event
    this.emit('predictionCompleted', {
      userId: prediction.userId,
      type: prediction.type,
      result: prediction.result
    });
  }

  // Utility Methods
  clearCacheForUser(userId) {
    const keys = aiAnalyticsCache.keys();
    keys.forEach(key => {
      if (key.includes(userId) || key.includes('recommendations') || key.includes('predictions')) {
        aiAnalyticsCache.del(key);
      }
    });
  }

  clearAllCache() {
    aiAnalyticsCache.flushAll();
  }

  getCacheStats() {
    return {
      keys: aiAnalyticsCache.keys().length,
      stats: aiAnalyticsCache.getStats()
    };
  }

  async getAnalyticsMetrics(timeRange = '30d') {
    try {
      const startDate = new Date(Date.now() - this.parseTimeRange(timeRange));
      
      const [totalEvents, uniqueUsers, topEventTypes, userEngagement] = await Promise.all([
        prisma.aIAnalyticsEvent.count({
          where: { timestamp: { gte: startDate } }
        }),
        prisma.aIAnalyticsEvent.groupBy({
          by: ['userId'],
          where: { timestamp: { gte: startDate } }
        }).then(result => result.length),
        prisma.aIAnalyticsEvent.groupBy({
          by: ['eventType'],
          where: { timestamp: { gte: startDate } },
          _count: { eventType: true },
          orderBy: { _count: { eventType: 'desc' } },
          take: 10
        }),
        this.calculateUserEngagementMetrics(startDate)
      ]);

      return {
        timeRange,
        totalEvents,
        uniqueUsers,
        topEventTypes: topEventTypes.map(stat => ({
          eventType: stat.eventType,
          count: stat._count.eventType
        })),
        userEngagement,
        generatedAt: new Date()
      };
    } catch (error) {
      logger.error('Error getting analytics metrics:', error);
      throw error;
    }
  }

  async calculateUserEngagementMetrics(startDate) {
    // Calculate engagement metrics for the time range
    const events = await prisma.aIAnalyticsEvent.findMany({
      where: { timestamp: { gte: startDate } }
    });

    const dailyEngagement = {};
    events.forEach(event => {
      const day = new Date(event.timestamp).toDateString();
      dailyEngagement[day] = (dailyEngagement[day] || 0) + 1;
    });

    const engagementValues = Object.values(dailyEngagement);
    const averageEngagement = engagementValues.length > 0 
      ? engagementValues.reduce((sum, val) => sum + val, 0) / engagementValues.length 
      : 0;

    return {
      averageDailyEngagement: averageEngagement,
      peakEngagement: Math.max(...engagementValues, 0),
      activeDays: engagementValues.length
    };
  }

  parseTimeRange(timeRange) {
    const ranges = {
      '1d': 1 * 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      '90d': 90 * 24 * 60 * 60 * 1000
    };

    return ranges[timeRange] || ranges['30d'];
  }
}

module.exports = new AIAnalyticsService();
