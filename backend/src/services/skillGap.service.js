const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger.util');
const NodeCache = require('node-cache');
const EventEmitter = require('events');

const prisma = new PrismaClient();
const skillGapCache = new NodeCache({ stdTTL: 600 }); // 10 minutes cache

class SkillGapService extends EventEmitter {
  constructor() {
    super();
    this.analysisQueue = [];
    this.isProcessing = false;
    this.startAnalysisProcessor();
  }

  // Analyze user skills and detect gaps using AI
  async analyzeUserSkillGaps(userId, options = {}) {
    try {
      const {
        includeHistorical = true,
        predictFutureNeeds = true,
        careerGoals = [],
        industry = 'TECH',
        experienceLevel = 'INTERMEDIATE'
      } = options;

      logger.info(`Analyzing skill gaps for user ${userId}`, {
        includeHistorical,
        predictFutureNeeds,
        careerGoals,
        industry,
        experienceLevel
      });

      // Get user's current skills and learning data
      const userSkills = await this.getUserSkills(userId);
      const learningProgress = await this.getUserLearningProgress(userId);
      const careerData = await this.getUserCareerData(userId);

      // Analyze current skill gaps
      const currentGaps = await this.detectCurrentSkillGaps(userSkills, learningProgress, careerData);
      
      // Predict future skill needs
      let futureGaps = [];
      if (predictFutureNeeds) {
        futureGaps = await this.predictFutureSkillGaps(userSkills, careerGoals, industry);
      }

      // Analyze historical patterns
      let historicalInsights = {};
      if (includeHistorical) {
        historicalInsights = await this.analyzeHistoricalPatterns(userId);
      }

      // Combine and prioritize gaps
      const allGaps = this.combineAndPrioritizeGaps(currentGaps, futureGaps, historicalInsights);

      // Store skill gaps
      await this.storeSkillGaps(userId, allGaps);

      // Generate AI insights
      const aiInsights = await this.generateAIInsights(allGaps, userSkills, careerData);

      // Emit event for real-time updates
      this.emit('skillGapsAnalyzed', {
        userId,
        gaps: allGaps,
        insights: aiInsights,
        timestamp: new Date()
      });

      logger.info(`Skill gap analysis completed for user ${userId}`, {
        totalGaps: allGaps.length,
        criticalGaps: allGaps.filter(gap => gap.gapSeverity === 'CRITICAL').length
      });

      return {
        userId,
        gaps: allGaps,
        insights: aiInsights,
        summary: this.generateGapSummary(allGaps),
        recommendations: this.generateGapRecommendations(allGaps)
      };

    } catch (error) {
      logger.error(`Failed to analyze skill gaps for user ${userId}:`, error);
      throw new Error(`Failed to analyze skill gaps: ${error.message}`);
    }
  }

  // Get user's current skills
  async getUserSkills(userId) {
    try {
      const userSkills = await prisma.userSkill.findMany({
        where: { userId },
        include: {
          skillGaps: true,
          contentRecommendations: true
        },
        orderBy: [
          { priority: 'desc' },
          { careerRelevance: 'desc' },
          { currentLevel: 'desc' }
        ]
      });

      // Get skill mastery data for additional context
      const skillMastery = await prisma.skillMastery.findMany({
        where: { userId },
        orderBy: { lastAssessed: 'desc' }
      });

      // Combine user skills with mastery data
      return userSkills.map(skill => ({
        ...skill,
        masteryData: skillMastery.find(m => m.skill === skill.skillName),
        relatedSkills: skill.relatedSkills ? JSON.parse(skill.relatedSkills) : [],
        growthTrajectory: this.calculateGrowthTrajectory(skill, skillMastery)
      }));

    } catch (error) {
      logger.error(`Failed to get user skills for ${userId}:`, error);
      throw new Error(`Failed to get user skills: ${error.message}`);
    }
  }

  // Get user's learning progress
  async getUserLearningProgress(userId) {
    try {
      const learningPaths = await prisma.learningPath.findMany({
        where: { userId },
        include: {
          steps: {
            include: {
              progress: true
            }
          },
          progress: true
        },
        orderBy: { createdAt: 'desc' }
      });

      const completedPaths = learningPaths.filter(path => path.status === 'COMPLETED');
      const inProgressPaths = learningPaths.filter(path => path.status === 'IN_PROGRESS');

      return {
        totalPaths: learningPaths.length,
        completedPaths: completedPaths.length,
        inProgressPaths: inProgressPaths.length,
        averageProgress: this.calculateAverageProgress(learningPaths),
        skillProgress: this.calculateSkillProgress(learningPaths),
        learningVelocity: this.calculateLearningVelocity(completedPaths),
        preferredDifficulty: this.analyzePreferredDifficulty(learningPaths),
        learningStyle: await this.detectLearningStyle(userId)
      };

    } catch (error) {
      logger.error(`Failed to get learning progress for ${userId}:`, error);
      throw new Error(`Failed to get learning progress: ${error.message}`);
    }
  }

  // Get user's career data and goals
  async getUserCareerData(userId) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          aiUserBehavior: true
        }
      });

      const behavior = user.aiUserBehavior;
      const behaviorData = behavior ? JSON.parse(behavior.behaviorData || '{}') : {};

      return {
        currentRole: behaviorData.currentRole || 'UNKNOWN',
        targetRoles: behaviorData.targetRoles || [],
        careerGoals: behaviorData.careerGoals || [],
        industry: behaviorData.industry || 'TECH',
        experienceLevel: behaviorData.experienceLevel || 'INTERMEDIATE',
        salaryExpectation: behaviorData.salaryExpectation || null,
        workStyle: behaviorData.workStyle || 'HYBRID',
        leadershipInterest: behaviorData.leadershipInterest || false,
        technicalVsManagement: behaviorData.technicalVsManagement || 0.5,
        careerProgression: behaviorData.careerProgression || []
      };

    } catch (error) {
      logger.error(`Failed to get career data for ${userId}:`, error);
      throw new Error(`Failed to get career data: ${error.message}`);
    }
  }

  // Detect current skill gaps
  async detectCurrentSkillGaps(userSkills, learningProgress, careerData) {
    try {
      const gaps = [];

      for (const skill of userSkills) {
        // Check if skill level is below target
        if (skill.currentLevel < skill.targetLevel) {
          const gap = {
            skillName: skill.skillName,
            gapType: 'UNDERDEVELOPED',
            currentLevel: skill.currentLevel,
            requiredLevel: skill.targetLevel,
            gapSeverity: this.calculateGapSeverity(skill.currentLevel, skill.targetLevel),
            confidence: skill.confidence,
            impactScore: this.calculateImpactScore(skill, careerData),
            urgency: this.calculateUrgency(skill, careerData),
            timeToClose: this.estimateTimeToClose(skill),
            recommendedActions: this.generateRecommendedActions(skill),
            prerequisites: this.identifyPrerequisites(skill),
            relatedGaps: this.findRelatedGaps(skill, userSkills)
          };

          gaps.push(gap);
        }
      }

      // Check for missing critical skills
      const missingSkills = await this.identifyMissingSkills(userSkills, careerData);
      gaps.push(...missingSkills);

      return gaps;

    } catch (error) {
      logger.error('Failed to detect current skill gaps:', error);
      throw new Error(`Failed to detect current skill gaps: ${error.message}`);
    }
  }

  // Predict future skill needs
  async predictFutureSkillGaps(userSkills, careerGoals, industry) {
    try {
      const futureSkills = await this.getIndustryTrends(industry);
      const careerRequirements = await this.getCareerRequirements(careerGoals);
      
      const futureGaps = [];

      // Analyze industry trends
      for (const trend of futureSkills) {
        const userSkill = userSkills.find(s => s.skillName === trend.skill);
        
        if (!userSkill || userSkill.currentLevel < trend.requiredLevel) {
          futureGaps.push({
            skillName: trend.skill,
            gapType: 'MISSING_SKILL',
            currentLevel: userSkill?.currentLevel || 0,
            requiredLevel: trend.requiredLevel,
            gapSeverity: this.calculateFutureGapSeverity(trend),
            confidence: trend.confidence,
            impactScore: trend.impactScore,
            urgency: this.calculateFutureUrgency(trend),
            timeToClose: trend.timeToMaster,
            recommendedActions: trend.learningPath,
            prerequisites: trend.prerequisites,
            relatedGaps: [],
            isFutureGap: true,
            timeframe: trend.timeframe
          });
        }
      }

      // Analyze career requirements
      for (const requirement of careerRequirements) {
        const userSkill = userSkills.find(s => s.skillName === requirement.skill);
        
        if (!userSkill || userSkill.currentLevel < requirement.level) {
          futureGaps.push({
            skillName: requirement.skill,
            gapType: 'PREREQUISITE',
            currentLevel: userSkill?.currentLevel || 0,
            requiredLevel: requirement.level,
            gapSeverity: this.calculateCareerGapSeverity(requirement),
            confidence: requirement.confidence,
            impactScore: requirement.importance,
            urgency: this.calculateCareerUrgency(requirement),
            timeToClose: requirement.estimatedTime,
            recommendedActions: requirement.recommendedActions,
            prerequisites: requirement.prerequisites,
            relatedGaps: [],
            isFutureGap: true,
            timeframe: requirement.timeframe
          });
        }
      }

      return futureGaps;

    } catch (error) {
      logger.error('Failed to predict future skill gaps:', error);
      throw new Error(`Failed to predict future skill gaps: ${error.message}`);
    }
  }

  // Analyze historical patterns
  async analyzeHistoricalPatterns(userId) {
    try {
      const historicalData = await prisma.skillGap.findMany({
        where: { userId },
        orderBy: { detectedAt: 'desc' },
        take: 50
      });

      const learningHistory = await prisma.learningPathProgress.findMany({
        where: { userId },
        orderBy: { lastAccessedAt: 'desc' },
        take: 100
      });

      return {
        skillAcquisitionRate: this.calculateSkillAcquisitionRate(historicalData),
        preferredLearningMethods: this.analyzePreferredMethods(learningHistory),
        completionPatterns: this.analyzeCompletionPatterns(learningHistory),
        difficultyProgression: this.analyzeDifficultyProgression(historicalData),
        timeMasteryPatterns: this.analyzeTimeMasteryPatterns(historicalData),
        seasonalPatterns: this.analyzeSeasonalPatterns(learningHistory),
        retentionRate: this.calculateRetentionRate(historicalData, learningHistory)
      };

    } catch (error) {
      logger.error('Failed to analyze historical patterns:', error);
      throw new Error(`Failed to analyze historical patterns: ${error.message}`);
    }
  }

  // Combine and prioritize gaps
  combineAndPrioritizeGaps(currentGaps, futureGaps, historicalInsights) {
    try {
      const allGaps = [...currentGaps, ...futureGaps];

      // Apply historical insights to adjust priorities
      const adjustedGaps = allGaps.map(gap => ({
        ...gap,
        adjustedScore: this.calculateAdjustedScore(gap, historicalInsights),
        personalizedPriority: this.calculatePersonalizedPriority(gap, historicalInsights)
      }));

      // Sort by priority
      return adjustedGaps.sort((a, b) => {
        // Primary sort by urgency
        const urgencyOrder = { IMMEDIATE: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
        const aUrgency = urgencyOrder[a.urgency] || 0;
        const bUrgency = urgencyOrder[b.urgency] || 0;
        
        if (aUrgency !== bUrgency) {
          return bUrgency - aUrgency;
        }

        // Secondary sort by adjusted score
        return b.adjustedScore - a.adjustedScore;
      });

    } catch (error) {
      logger.error('Failed to combine and prioritize gaps:', error);
      throw new Error(`Failed to combine and prioritize gaps: ${error.message}`);
    }
  }

  // Store skill gaps in database
  async storeSkillGaps(userId, gaps) {
    try {
      // Delete existing active gaps
      await prisma.skillGap.deleteMany({
        where: {
          userId,
          status: 'ACTIVE'
        }
      });

      // Create new skill gaps
      const gapData = gaps.map(gap => ({
        userId,
        userSkillId: gap.userSkillId || null,
        gapType: gap.gapType,
        currentLevel: gap.currentLevel,
        requiredLevel: gap.requiredLevel,
        gapSeverity: gap.gapSeverity,
        confidence: gap.confidence,
        impactScore: gap.impactScore,
        timeToClose: gap.timeToClose,
        urgency: gap.urgency,
        recommendedActions: JSON.stringify(gap.recommendedActions || []),
        prerequisites: JSON.stringify(gap.prerequisites || []),
        relatedGaps: JSON.stringify(gap.relatedGaps || []),
        status: 'ACTIVE',
        aiInsights: JSON.stringify(gap.aiInsights || {}),
        progressTracker: 0.0
      }));

      await prisma.skillGap.createMany({
        data: gapData
      });

      logger.info(`Stored ${gapData.length} skill gaps for user ${userId}`);

    } catch (error) {
      logger.error(`Failed to store skill gaps for user ${userId}:`, error);
      throw new Error(`Failed to store skill gaps: ${error.message}`);
    }
  }

  // Generate AI insights
  async generateAIInsights(gaps, userSkills, careerData) {
    try {
      const insights = {
        overallSkillHealth: this.calculateOverallSkillHealth(userSkills),
        criticalGaps: gaps.filter(gap => gap.gapSeverity === 'CRITICAL'),
        growthOpportunities: this.identifyGrowthOpportunities(gaps, userSkills),
        learningPathway: this.recommendLearningPathway(gaps, careerData),
        timeInvestment: this.estimateTotalTimeInvestment(gaps),
        careerAlignment: this.assessCareerAlignment(gaps, careerData),
        skillSynergies: this.identifySkillSynergies(gaps),
        marketDemand: this.assessMarketDemand(gaps),
        personalizedStrategy: this.generatePersonalizedStrategy(gaps, userSkills, careerData)
      };

      return insights;

    } catch (error) {
      logger.error('Failed to generate AI insights:', error);
      throw new Error(`Failed to generate AI insights: ${error.message}`);
    }
  }

  // Get user's skill gaps
  async getUserSkillGaps(userId, options = {}) {
    try {
      const {
        status = 'ACTIVE',
        severity = null,
        gapType = null,
        limit = 50,
        offset = 0
      } = options;

      const whereClause = { userId };
      if (status) whereClause.status = status;
      if (severity) whereClause.gapSeverity = severity;
      if (gapType) whereClause.gapType = gapType;

      const gaps = await prisma.skillGap.findMany({
        where: whereClause,
        include: {
          userSkill: {
            include: {
              contentRecommendations: true
            }
          }
        },
        orderBy: [
          { urgency: 'desc' },
          { impactScore: 'desc' },
          { detectedAt: 'desc' }
        ],
        take: limit,
        skip: offset
      });

      return gaps.map(gap => ({
        ...gap,
        recommendedActions: gap.recommendedActions ? JSON.parse(gap.recommendedActions) : [],
        prerequisites: gap.prerequisites ? JSON.parse(gap.prerequisites) : [],
        relatedGaps: gap.relatedGaps ? JSON.parse(gap.relatedGaps) : [],
        aiInsights: gap.aiInsights ? JSON.parse(gap.aiInsights) : {}
      }));

    } catch (error) {
      logger.error(`Failed to get user skill gaps for ${userId}:`, error);
      throw new Error(`Failed to get user skill gaps: ${error.message}`);
    }
  }

  // Update skill gap progress
  async updateSkillGapProgress(userId, gapId, progressData) {
    try {
      const {
        progressValue,
        status = null,
        feedback = null,
        completedAt = null
      } = progressData;

      const updateData = {
        progressTracker: progressValue,
        lastAssessed: new Date()
      };

      if (status) updateData.status = status;
      if (feedback) updateData.aiInsights = feedback;
      if (completedAt) updateData.completedAt = completedAt;

      const updatedGap = await prisma.skillGap.update({
        where: { id: gapId, userId },
        data: updateData
      });

      // Emit progress update event
      this.emit('skillGapProgressUpdated', {
        userId,
        gapId,
        progress: progressValue,
        status: updatedGap.status,
        timestamp: new Date()
      });

      return updatedGap;

    } catch (error) {
      logger.error(`Failed to update skill gap progress for ${userId}:`, error);
      throw new Error(`Failed to update skill gap progress: ${error.message}`);
    }
  }

  // Close skill gap
  async closeSkillGap(userId, gapId, closureData) {
    try {
      const {
        reason = 'COMPLETED',
        finalLevel = null,
        feedback = null,
        timeSpent = null
      } = closureData;

      const updatedGap = await prisma.skillGap.update({
        where: { id: gapId, userId },
        data: {
          status: 'CLOSED',
          progressTracker: 1.0,
          completedAt: new Date(),
          aiInsights: JSON.stringify({
            ...JSON.parse(this.aiInsights || '{}'),
            closureReason: reason,
            finalLevel,
            feedback,
            timeSpent
          })
        }
      });

      // Update user skill if applicable
      if (finalLevel && updatedGap.userSkillId) {
        await prisma.userSkill.update({
          where: { id: updatedGap.userSkillId },
          data: {
            currentLevel: finalLevel,
            lastUpdated: new Date()
          }
        });
      }

      // Emit gap closure event
      this.emit('skillGapClosed', {
        userId,
        gapId,
        reason,
        finalLevel,
        timestamp: new Date()
      });

      return updatedGap;

    } catch (error) {
      logger.error(`Failed to close skill gap for ${userId}:`, error);
      throw new Error(`Failed to close skill gap: ${error.message}`);
    }
  }

  // Get skill gap analytics
  async getSkillGapAnalytics(userId, timeRange = '30d') {
    try {
      const dateRange = this.calculateDateRange(timeRange);
      
      const gaps = await prisma.skillGap.findMany({
        where: {
          userId,
          detectedAt: {
            gte: dateRange.start,
            lte: dateRange.end
          }
        },
        orderBy: { detectedAt: 'asc' }
      });

      return {
        totalGaps: gaps.length,
        gapsBySeverity: this.groupGapsBySeverity(gaps),
        gapsByType: this.groupGapsByType(gaps),
        gapsByUrgency: this.groupGapsByUrgency(gaps),
        closureRate: this.calculateClosureRate(gaps),
        averageTimeToClose: this.calculateAverageTimeToClose(gaps),
        progressTrends: this.calculateProgressTrends(gaps),
        skillCategories: this.analyzeSkillCategories(gaps),
        impactDistribution: this.analyzeImpactDistribution(gaps),
        recommendations: this.generateAnalyticsRecommendations(gaps)
      };

    } catch (error) {
      logger.error(`Failed to get skill gap analytics for ${userId}:`, error);
      throw new Error(`Failed to get skill gap analytics: ${error.message}`);
    }
  }

  // Helper methods
  calculateGapSeverity(currentLevel, requiredLevel) {
    const gap = requiredLevel - currentLevel;
    if (gap >= 0.7) return 'CRITICAL';
    if (gap >= 0.4) return 'HIGH';
    if (gap >= 0.2) return 'MEDIUM';
    return 'LOW';
  }

  calculateImpactScore(skill, careerData) {
    let score = skill.careerRelevance || 0.5;
    
    // Boost score for skills critical to career goals
    if (careerData.targetRoles && careerData.targetRoles.length > 0) {
      score += 0.2;
    }
    
    // Consider industry demand
    if (careerData.industry === 'TECH') {
      score += 0.1;
    }
    
    return Math.min(score, 1.0);
  }

  calculateUrgency(skill, careerData) {
    if (skill.priority === 'CRITICAL') return 'IMMEDIATE';
    if (skill.priority === 'HIGH') return 'HIGH';
    if (skill.growthRate < 0) return 'HIGH';
    return 'MEDIUM';
  }

  estimateTimeToClose(skill) {
    const gap = skill.targetLevel - skill.currentLevel;
    const baseTime = 40; // hours per 0.1 skill level
    return Math.ceil(gap * 10 * baseTime);
  }

  generateRecommendedActions(skill) {
    const actions = [];
    const gap = skill.targetLevel - skill.currentLevel;
    
    if (gap > 0.5) {
      actions.push('Complete comprehensive learning path');
      actions.push('Get mentor guidance');
    }
    
    if (gap > 0.3) {
      actions.push('Practice with real projects');
      actions.push('Join study groups');
    }
    
    actions.push('Take online courses');
    actions.push('Read technical documentation');
    
    return actions;
  }

  // Background processor for queued analyses
  startAnalysisProcessor() {
    setInterval(async () => {
      if (!this.isProcessing && this.analysisQueue.length > 0) {
        this.isProcessing = true;
        
        try {
          const analysis = this.analysisQueue.shift();
          await this.processQueuedAnalysis(analysis);
        } catch (error) {
          logger.error('Error processing queued analysis:', error);
        } finally {
          this.isProcessing = false;
        }
      }
    }, 5000); // Process every 5 seconds
  }

  async processQueuedAnalysis(analysis) {
    return await this.analyzeUserSkillGaps(analysis.userId, analysis.options);
  }

  // Queue skill gap analysis
  queueAnalysis(userId, options = {}) {
    this.analysisQueue.push({ userId, options, timestamp: new Date() });
  }

  // Health check
  async getHealthStatus() {
    try {
      const cacheStats = skillGapCache.getStats();
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
          length: this.analysisQueue.length,
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
      const keys = skillGapCache.keys().filter(key => key.includes(pattern));
      keys.forEach(key => skillGapCache.del(key));
    } else {
      skillGapCache.flushAll();
    }
  }
}

module.exports = new SkillGapService();
