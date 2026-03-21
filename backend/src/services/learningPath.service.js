const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger.util');
const NodeCache = require('node-cache');
const EventEmitter = require('events');

const prisma = new PrismaClient();
const learningPathCache = new NodeCache({ stdTTL: 600 }); // 10 minutes cache

class LearningPathService extends EventEmitter {
  constructor() {
    super();
    this.pathGenerationQueue = [];
    this.isProcessing = false;
    this.startPathProcessor();
  }

  // Generate personalized learning path for user
  async generatePersonalizedPath(userId, options = {}) {
    try {
      const {
        targetSkills = [],
        difficulty = 'INTERMEDIATE',
        pathType = 'PERSONALIZED',
        estimatedDuration = 40, // hours
        careerGoals = [],
        currentSkills = [],
        learningStyle = 'VISUAL'
      } = options;

      logger.info(`Generating personalized learning path for user ${userId}`, {
        targetSkills,
        difficulty,
        pathType,
        estimatedDuration
      });

      // Get user data and analytics
      const userData = await this.getUserLearningData(userId);
      
      // Analyze skill gaps and learning preferences
      const skillAnalysis = await this.analyzeSkillGaps(userId, targetSkills, currentSkills);
      
      // Generate path structure
      const pathStructure = await this.generatePathStructure(
        skillAnalysis,
        difficulty,
        estimatedDuration,
        learningStyle,
        careerGoals
      );

      // Create learning path
      const learningPath = await prisma.learningPath.create({
        data: {
          userId,
          name: this.generatePathName(targetSkills, pathType),
          description: this.generatePathDescription(skillAnalysis, pathType),
          skills: targetSkills,
          targetSkills: JSON.stringify(targetSkills),
          difficulty,
          estimatedDuration,
          pathType,
          metadata: JSON.stringify({
            skillAnalysis,
            learningStyle,
            careerGoals,
            generatedAt: new Date(),
            version: '1.0'
          })
        }
      });

      // Create learning path steps
      const steps = await this.createLearningPathSteps(learningPath.id, pathStructure);

      // Initialize progress tracking
      await this.initializeProgressTracking(userId, learningPath.id, steps);

      // Update AI analytics with learning path data
      await this.updateAIAnalytics(userId, learningPath, skillAnalysis);

      // Emit real-time update
      this.emit('learningPathCreated', {
        userId,
        learningPath,
        steps,
        skillAnalysis
      });

      // Clear cache for user
      this.clearCacheForUser(userId);

      logger.info(`Successfully generated learning path ${learningPath.id} for user ${userId}`, {
        stepsCount: steps.length,
        estimatedDuration,
        difficulty
      });

      return {
        learningPath,
        steps,
        skillAnalysis,
        recommendations: await this.generateRecommendations(userId, learningPath.id)
      };

    } catch (error) {
      logger.error('Error generating personalized learning path:', error);
      throw new Error(`Failed to generate learning path: ${error.message}`);
    }
  }

  // Get user learning data and analytics
  async getUserLearningData(userId) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          aiUserBehavior: true,
          skillMastery: true,
          learningPaths: {
            where: { isActive: true },
            orderBy: { createdAt: 'desc' },
            take: 5
          },
          aiPredictions: {
            where: { predictionType: 'PERFORMANCE' },
            orderBy: { createdAt: 'desc' },
            take: 10
          }
        }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Get recent learning activities
      const recentActivities = await prisma.aIAnalyticsEvent.findMany({
        where: {
          userId,
          eventType: {
            in: ['SKILL_VIEW', 'POST_CREATE', 'POST_LIKE', 'MENTOR_SESSION_BOOKED', 'MENTOR_SESSION_COMPLETED']
          }
        },
        orderBy: { timestamp: 'desc' },
        take: 50
      });

      return {
        user,
        behavior: user.aiUserBehavior ? JSON.parse(user.aiUserBehavior.behaviorData || '{}') : {},
        skillMastery: user.skillMastery,
        previousPaths: user.learningPaths,
        predictions: user.aiPredictions,
        recentActivities
      };

    } catch (error) {
      logger.error('Error getting user learning data:', error);
      throw error;
    }
  }

  // Analyze skill gaps and learning needs
  async analyzeSkillGaps(userId, targetSkills, currentSkills = []) {
    try {
      const skillGaps = [];
      const skillLevels = {};

      // Get current skill mastery
      const currentMastery = await prisma.skillMastery.findMany({
        where: { userId }
      });

      const masteryMap = currentMastery.reduce((acc, skill) => {
        acc[skill.skill] = skill.masteryLevel;
        return acc;
      }, {});

      // Analyze each target skill
      for (const skill of targetSkills) {
        const currentLevel = masteryMap[skill] || 0;
        const targetLevel = this.getTargetSkillLevel(skill);
        const gap = targetLevel - currentLevel;

        skillLevels[skill] = {
          current: currentLevel,
          target: targetLevel,
          gap: Math.max(0, gap),
          priority: this.calculateSkillPriority(skill, gap, currentSkills)
        };

        if (gap > 0) {
          skillGaps.push({
            skill,
            currentLevel,
            targetLevel,
            gap,
            priority: skillLevels[skill].priority,
            estimatedTime: this.estimateSkillTime(skill, gap)
          });
        }
      }

      // Sort by priority
      skillGaps.sort((a, b) => b.priority - a.priority);

      return {
        skillGaps,
        skillLevels,
        totalGapTime: skillGaps.reduce((total, gap) => total + gap.estimatedTime, 0),
        recommendedOrder: this.getRecommendedSkillOrder(skillGaps)
      };

    } catch (error) {
      logger.error('Error analyzing skill gaps:', error);
      throw error;
    }
  }

  // Generate path structure based on skill analysis
  async generatePathStructure(skillAnalysis, difficulty, estimatedDuration, learningStyle, careerGoals) {
    try {
      const { skillGaps, recommendedOrder } = skillAnalysis;
      const pathStructure = [];

      let currentTime = 0;
      const stepDuration = Math.floor(estimatedDuration * 60 / recommendedOrder.length); // Convert to minutes

      for (let i = 0; i < recommendedOrder.length; i++) {
        const skill = recommendedOrder[i];
        const skillGap = skillGaps.find(gap => gap.skill === skill);
        
        if (!skillGap) continue;

        // Generate steps for this skill
        const skillSteps = await this.generateSkillSteps(
          skill,
          skillGap,
          difficulty,
          learningStyle,
          stepDuration,
          i
        );

        pathStructure.push(...skillSteps);
        currentTime += stepDuration;
      }

      // Add assessment and project steps
      const assessmentSteps = this.generateAssessmentSteps(pathStructure, difficulty);
      const projectSteps = this.generateProjectSteps(pathStructure, careerGoals);

      return [...pathStructure, ...assessmentSteps, ...projectSteps];

    } catch (error) {
      logger.error('Error generating path structure:', error);
      throw error;
    }
  }

  // Generate steps for a specific skill
  async generateSkillSteps(skill, skillGap, difficulty, learningStyle, estimatedTime, order) {
    try {
      const steps = [];
      const stepTypes = this.getStepTypesForLearningStyle(learningStyle);
      
      // Get relevant content for this skill
      const relevantContent = await this.getRelevantContent(skill, difficulty);
      
      // Generate content consumption steps
      const contentSteps = stepTypes.map((stepType, index) => ({
        skill,
        stepType,
        stepOrder: order * 10 + index,
        title: `${stepType}: ${skill}`,
        description: `Learn ${skill} through ${stepType.toLowerCase()}`,
        stepData: JSON.stringify({
          skill,
          difficulty,
          learningStyle,
          content: relevantContent.filter(content => content.type === stepType),
          estimatedTime: Math.floor(estimatedTime / stepTypes.length)
        }),
        resources: JSON.stringify(relevantContent.map(content => content.id)),
        estimatedTime: Math.floor(estimatedTime / stepTypes.length),
        difficulty
      }));

      steps.push(...contentSteps);

      // Add practice step
      steps.push({
        skill,
        stepType: 'EXERCISE',
        stepOrder: order * 10 + stepTypes.length,
        title: `Practice: ${skill}`,
        description: `Practice exercises for ${skill}`,
        stepData: JSON.stringify({
          skill,
          difficulty,
          exerciseCount: Math.ceil(skillGap.gap * 5),
          estimatedTime: Math.floor(estimatedTime * 0.3)
        }),
        estimatedTime: Math.floor(estimatedTime * 0.3),
        difficulty
      });

      return steps;

    } catch (error) {
      logger.error('Error generating skill steps:', error);
      throw error;
    }
  }

  // Get relevant content for a skill
  async getRelevantContent(skill, difficulty) {
    try {
      // Get posts related to this skill
      const posts = await prisma.post.findMany({
        where: {
          OR: [
            { title: { contains: skill, mode: 'insensitive' } },
            { content: { contains: skill, mode: 'insensitive' } }
          ]
        },
        include: {
          author: {
            select: { id: true, name: true, role: true }
          },
          _count: {
            select: { likes: true, comments: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      });

      // Get mentors with this skill
      const mentors = await prisma.user.findMany({
        where: {
          role: 'MENTOR',
          skills: { contains: skill, mode: 'insensitive' }
        },
        include: {
          mentorshipsAsMentor: {
            include: {
              mentee: { select: { id: true, name: true } }
            }
          },
          _count: {
            select: { mentorshipsAsMentor: true }
          }
        },
        take: 5
      });

      return [
        ...posts.map(post => ({
          id: `post_${post.id}`,
          type: 'CONTENT',
          title: post.title,
          description: post.content.substring(0, 200),
          author: post.author.name,
          engagement: post._count.likes + post._count.comments,
          url: `/posts/${post.id}`
        })),
        ...mentors.map(mentor => ({
          id: `mentor_${mentor.id}`,
          type: 'MENTOR_SESSION',
          title: `Mentor Session with ${mentor.name}`,
          description: `1-on-1 session about ${skill}`,
          author: mentor.name,
          experience: mentor._count.mentorshipsAsMentor,
          url: `/mentors/${mentor.id}`
        }))
      ];

    } catch (error) {
      logger.error('Error getting relevant content:', error);
      return [];
    }
  }

  // Create learning path steps in database
  async createLearningPathSteps(learningPathId, pathStructure) {
    try {
      const steps = await prisma.learningPathStep.createMany({
        data: pathStructure.map((step, index) => ({
          learningPathId,
          skill: step.skill,
          stepOrder: step.stepOrder,
          stepType: step.stepType,
          stepData: step.stepData,
          title: step.title,
          description: step.description,
          resources: step.resources,
          estimatedTime: step.estimatedTime,
          difficulty: step.difficulty
        }))
      });

      // Return created steps
      return await prisma.learningPathStep.findMany({
        where: { learningPathId },
        orderBy: { stepOrder: 'asc' }
      });

    } catch (error) {
      logger.error('Error creating learning path steps:', error);
      throw error;
    }
  }

  // Initialize progress tracking
  async initializeProgressTracking(userId, learningPathId, steps) {
    try {
      // Create overall path progress
      await prisma.learningPathProgress.create({
        data: {
          userId,
          learningPathId,
          progressType: 'PATH_PROGRESS',
          progressValue: 0,
          progressData: JSON.stringify({
            totalSteps: steps.length,
            completedSteps: 0,
            currentStep: 1,
            estimatedCompletion: this.calculateEstimatedCompletion(steps)
          })
        }
      });

      // Create step progress records
      for (const step of steps) {
        await prisma.learningPathProgress.create({
          data: {
            userId,
            learningPathId,
            stepId: step.id,
            progressType: 'STEP_PROGRESS',
            progressValue: 0,
            progressData: JSON.stringify({
              stepType: step.stepType,
              estimatedTime: step.estimatedTime,
              timeSpent: 0,
              attempts: 0
            })
          }
        });
      }

    } catch (error) {
      logger.error('Error initializing progress tracking:', error);
      throw error;
    }
  }

  // Update learning path progress
  async updateProgress(userId, learningPathId, stepId, progressData) {
    try {
      const { progressValue, timeSpent, completed } = progressData;

      // Update step progress
      await prisma.learningPathProgress.updateMany({
        where: {
          userId,
          learningPathId,
          stepId,
          progressType: 'STEP_PROGRESS'
        },
        data: {
          progressValue,
          timeSpent,
          lastAccessedAt: new Date(),
          progressData: JSON.stringify({
            ...progressData,
            updatedAt: new Date()
          })
        }
      });

      // Mark step as completed if necessary
      if (completed) {
        await prisma.learningPathStep.update({
          where: { id: stepId },
          data: {
            completed: true,
            completedAt: new Date()
          }
        });
      }

      // Calculate overall path progress
      const allSteps = await prisma.learningPathStep.findMany({
        where: { learningPathId }
      });

      const completedSteps = await prisma.learningPathStep.findMany({
        where: { 
          learningPathId,
          completed: true
        }
      });

      const overallProgress = completedSteps.length / allSteps.length;

      // Update overall path progress
      await prisma.learningPathProgress.updateMany({
        where: {
          userId,
          learningPathId,
          progressType: 'PATH_PROGRESS'
        },
        data: {
          progressValue: overallProgress,
          lastAccessedAt: new Date(),
          progressData: JSON.stringify({
            totalSteps: allSteps.length,
            completedSteps: completedSteps.length,
            currentStep: completedSteps.length + 1,
            overallProgress,
            updatedAt: new Date()
          })
        }
      });

      // Update learning path
      await prisma.learningPath.update({
        where: { id: learningPathId },
        data: {
          progress: overallProgress,
          updatedAt: new Date(),
          ...(overallProgress >= 1.0 && { 
            status: 'completed',
            completedAt: new Date()
          })
        }
      });

      // Update skill mastery
      await this.updateSkillMastery(userId, learningPathId, stepId, progressValue);

      // Emit real-time update
      this.emit('progressUpdated', {
        userId,
        learningPathId,
        stepId,
        progressValue,
        overallProgress,
        completed
      });

      // Clear cache
      this.clearCacheForUser(userId);

      return {
        stepProgress: progressValue,
        overallProgress,
        completedSteps: completedSteps.length,
        totalSteps: allSteps.length
      };

    } catch (error) {
      logger.error('Error updating learning path progress:', error);
      throw error;
    }
  }

  // Update skill mastery based on progress
  async updateSkillMastery(userId, learningPathId, stepId, progressValue) {
    try {
      const step = await prisma.learningPathStep.findUnique({
        where: { id: stepId }
      });

      if (!step) return;

      // Get or create skill mastery record
      const existingMastery = await prisma.skillMastery.findUnique({
        where: { userId_skill: { userId, skill: step.skill } }
      });

      const masteryLevel = existingMastery ? existingMastery.masteryLevel : 0;
      const newMasteryLevel = Math.min(1.0, masteryLevel + (progressValue * 0.1)); // Increment by 10% of progress

      if (existingMastery) {
        await prisma.skillMastery.update({
          where: { id: existingMastery.id },
          data: {
            masteryLevel: newMasteryLevel,
            confidence: Math.min(1.0, existingMastery.confidence + 0.05),
            lastAssessed: new Date(),
            assessmentData: JSON.stringify({
              stepId,
              progressValue,
              previousLevel: masteryLevel,
              newLevel: newMasteryLevel,
              learningPathId,
              assessedAt: new Date()
            })
          }
        });
      } else {
        await prisma.skillMastery.create({
          data: {
            userId,
            skill: step.skill,
            masteryLevel: newMasteryLevel,
            confidence: 0.5,
            learningPathId,
            assessmentData: JSON.stringify({
              stepId,
              progressValue,
              initialLevel: 0,
              newLevel: newMasteryLevel,
              learningPathId,
              assessedAt: new Date()
            })
          }
        });
      }

    } catch (error) {
      logger.error('Error updating skill mastery:', error);
      throw error;
    }
  }

  // Get learning paths for user
  async getUserLearningPaths(userId, options = {}) {
    try {
      const { 
        status = null, 
        pathType = null, 
        limit = 10, 
        offset = 0 
      } = options;

      const cacheKey = `learning_paths_${userId}_${status}_${pathType}_${limit}_${offset}`;
      const cached = learningPathCache.get(cacheKey);
      
      if (cached) {
        return cached;
      }

      const whereClause = {
        userId,
        isActive: true
      };

      if (status) {
        whereClause.status = status;
      }

      if (pathType) {
        whereClause.pathType = pathType;
      }

      const learningPaths = await prisma.learningPath.findMany({
        where: whereClause,
        include: {
          steps: {
            orderBy: { stepOrder: 'asc' }
          },
          progress: {
            where: { userId },
            orderBy: { lastAccessedAt: 'desc' }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
      });

      // Add progress summary
      const pathsWithProgress = learningPaths.map(path => ({
        ...path,
        progressSummary: this.calculateProgressSummary(path),
        nextStep: this.getNextStep(path),
        estimatedCompletion: this.calculateEstimatedCompletion(path.steps)
      }));

      learningPathCache.set(cacheKey, pathsWithProgress);
      return pathsWithProgress;

    } catch (error) {
      logger.error('Error getting user learning paths:', error);
      throw error;
    }
  }

  // Get learning path details
  async getLearningPathDetails(learningPathId, userId) {
    try {
      const cacheKey = `learning_path_details_${learningPathId}_${userId}`;
      const cached = learningPathCache.get(cacheKey);
      
      if (cached) {
        return cached;
      }

      const learningPath = await prisma.learningPath.findFirst({
        where: {
          id: learningPathId,
          userId
        },
        include: {
          steps: {
            orderBy: { stepOrder: 'asc' },
            include: {
              progress: {
                where: { userId },
                orderBy: { lastAccessedAt: 'desc' }
              }
            }
          },
          progress: {
            where: { 
              userId,
              progressType: 'PATH_PROGRESS'
            }
          }
        }
      });

      if (!learningPath) {
        throw new Error('Learning path not found');
      }

      // Add detailed analytics
      const pathDetails = {
        ...learningPath,
        analytics: await this.getPathAnalytics(learningPathId, userId),
        recommendations: await this.getPathRecommendations(learningPathId, userId),
        skillProgress: await this.getSkillProgress(learningPathId, userId)
      };

      learningPathCache.set(cacheKey, pathDetails);
      return pathDetails;

    } catch (error) {
      logger.error('Error getting learning path details:', error);
      throw error;
    }
  }

  // Generate recommendations for learning path
  async generateRecommendations(userId, learningPathId) {
    try {
      const recommendations = [];

      // Get current progress
      const progress = await prisma.learningPathProgress.findMany({
        where: {
          userId,
          learningPathId
        }
      });

      // Get next steps recommendations
      const nextSteps = await this.getNextStepsRecommendations(userId, learningPathId);
      recommendations.push(...nextSteps);

      // Get mentor recommendations
      const mentorRecs = await this.getMentorRecommendations(userId, learningPathId);
      recommendations.push(...mentorRecs);

      // Get content recommendations
      const contentRecs = await this.getContentRecommendations(userId, learningPathId);
      recommendations.push(...contentRecs);

      return recommendations;

    } catch (error) {
      logger.error('Error generating recommendations:', error);
      throw error;
    }
  }

  // Get next steps recommendations
  async getNextStepsRecommendations(userId, learningPathId) {
    try {
      const incompleteSteps = await prisma.learningPathStep.findMany({
        where: {
          learningPathId,
          completed: false
        },
        orderBy: { stepOrder: 'asc' },
        take: 3
      });

      return incompleteSteps.map(step => ({
        type: 'NEXT_STEP',
        title: step.title,
        description: step.description,
        stepId: step.id,
        stepType: step.stepType,
        estimatedTime: step.estimatedTime,
        priority: 1 - (step.stepOrder / 100) // Higher priority for earlier steps
      }));

    } catch (error) {
      logger.error('Error getting next steps recommendations:', error);
      return [];
    }
  }

  // Get mentor recommendations for learning path
  async getMentorRecommendations(userId, learningPathId) {
    try {
      const learningPath = await prisma.learningPath.findUnique({
        where: { id: learningPathId },
        include: {
          steps: {
            where: { stepType: 'MENTOR_SESSION' },
            take: 5
          }
        }
      });

      if (!learningPath) return [];

      const skills = learningPath.skills;
      const mentorRecommendations = [];

      for (const skill of skills) {
        const mentors = await prisma.user.findMany({
          where: {
            role: 'MENTOR',
            skills: { contains: skill, mode: 'insensitive' }
          },
          include: {
            mentorshipsAsMentor: {
              include: {
                mentee: { select: { id: true, name: true } }
              }
            },
            _count: {
              select: { mentorshipsAsMentor: true }
            }
          },
          take: 2
        });

        mentorRecommendations.push(...mentors.map(mentor => ({
          type: 'MENTOR_RECOMMENDATION',
          title: `Learn ${skill} with ${mentor.name}`,
          description: `Expert in ${skill} with ${mentor._count.mentorshipsAsMentor} sessions`,
          mentorId: mentor.id,
          skill,
          experience: mentor._count.mentorshipsAsMentor,
          rating: this.calculateMentorRating(mentor)
        })));
      }

      return mentorRecommendations.slice(0, 5);

    } catch (error) {
      logger.error('Error getting mentor recommendations:', error);
      return [];
    }
  }

  // Get content recommendations for learning path
  async getContentRecommendations(userId, learningPathId) {
    try {
      const learningPath = await prisma.learningPath.findUnique({
        where: { id: learningPathId }
      });

      if (!learningPath) return [];

      const skills = learningPath.skills;
      const contentRecommendations = [];

      for (const skill of skills) {
        const posts = await prisma.post.findMany({
          where: {
            OR: [
              { title: { contains: skill, mode: 'insensitive' } },
              { content: { contains: skill, mode: 'insensitive' } }
            ]
          },
          include: {
            author: {
              select: { id: true, name: true, role: true }
            },
            _count: {
              select: { likes: true, comments: true }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 3
        });

        contentRecommendations.push(...posts.map(post => ({
          type: 'CONTENT_RECOMMENDATION',
          title: post.title,
          description: post.content.substring(0, 200),
          postId: post.id,
          author: post.author.name,
          engagement: post._count.likes + post._count.comments,
          skill
        })));
      }

      return contentRecommendations.slice(0, 10);

    } catch (error) {
      logger.error('Error getting content recommendations:', error);
      return [];
    }
  }

  // Delete learning path
  async deleteLearningPath(learningPathId, userId) {
    try {
      // Verify ownership
      const learningPath = await prisma.learningPath.findFirst({
        where: {
          id: learningPathId,
          userId
        }
      });

      if (!learningPath) {
        throw new Error('Learning path not found or access denied');
      }

      // Soft delete (mark as inactive)
      await prisma.learningPath.update({
        where: { id: learningPathId },
        data: {
          isActive: false,
          status: 'deleted'
        }
      });

      // Clear cache
      this.clearCacheForUser(userId);

      // Emit update
      this.emit('learningPathDeleted', {
        userId,
        learningPathId
      });

      return { success: true };

    } catch (error) {
      logger.error('Error deleting learning path:', error);
      throw error;
    }
  }

  // Utility methods
  generatePathName(targetSkills, pathType) {
    if (targetSkills.length === 0) {
      return 'General Learning Path';
    }
    
    const skillNames = targetSkills.slice(0, 3).join(', ');
    const suffix = targetSkills.length > 3 ? ` & ${targetSkills.length - 3} more` : '';
    
    return `${pathType.charAt(0) + pathType.slice(1).toLowerCase()} Path: ${skillNames}${suffix}`;
  }

  generatePathDescription(skillAnalysis, pathType) {
    const { skillGaps, totalGapTime } = skillAnalysis;
    
    if (skillGaps.length === 0) {
      return 'A comprehensive learning path to enhance your skills.';
    }
    
    const topSkills = skillGaps.slice(0, 3).map(gap => gap.skill).join(', ');
    const timeEstimate = Math.ceil(totalGapTime / 60); // Convert to hours
    
    return `${pathType} learning path focusing on ${topSkills}. Estimated completion time: ${timeEstimate} hours.`;
  }

  getTargetSkillLevel(skill) {
    // Define target levels for different skills
    const skillLevels = {
      'JavaScript': 0.8,
      'React': 0.7,
      'Node.js': 0.7,
      'Python': 0.8,
      'Machine Learning': 0.6,
      'Data Science': 0.7,
      'Web Development': 0.8,
      'Mobile Development': 0.7,
      'DevOps': 0.6,
      'Cloud Computing': 0.6
    };
    
    return skillLevels[skill] || 0.7; // Default to 70% mastery
  }

  calculateSkillPriority(skill, gap, currentSkills) {
    let priority = gap * 10; // Base priority from gap
    
    // Boost priority for skills in current role/career
    if (currentSkills.includes(skill)) {
      priority *= 1.5;
    }
    
    // Boost priority for high-demand skills
    const highDemandSkills = ['JavaScript', 'React', 'Python', 'Machine Learning'];
    if (highDemandSkills.includes(skill)) {
      priority *= 1.2;
    }
    
    return Math.min(priority, 100); // Cap at 100
  }

  estimateSkillTime(skill, gap) {
    // Estimate time in hours based on skill complexity and gap
    const baseTimes = {
      'JavaScript': 40,
      'React': 30,
      'Node.js': 35,
      'Python': 45,
      'Machine Learning': 60,
      'Data Science': 50,
      'Web Development': 40,
      'Mobile Development': 45,
      'DevOps': 40,
      'Cloud Computing': 35
    };
    
    const baseTime = baseTimes[skill] || 40;
    return Math.ceil(baseTime * gap);
  }

  getRecommendedSkillOrder(skillGaps) {
    // Sort by priority, then by dependencies
    const sorted = [...skillGaps].sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      
      // Prefer foundational skills first
      const foundationalSkills = ['JavaScript', 'Python', 'Web Development'];
      const aIsFoundational = foundationalSkills.includes(a.skill);
      const bIsFoundational = foundationalSkills.includes(b.skill);
      
      if (aIsFoundational && !bIsFoundational) return -1;
      if (!aIsFoundational && bIsFoundational) return 1;
      
      return a.estimatedTime - b.estimatedTime;
    });
    
    return sorted.map(gap => gap.skill);
  }

  getStepTypesForLearningStyle(learningStyle) {
    const styles = {
      'VISUAL': ['CONTENT', 'VIDEO'],
      'AUDITORY': ['CONTENT', 'PODCAST'],
      'KINESTHETIC': ['EXERCISE', 'PROJECT'],
      'READING': ['CONTENT', 'DOCUMENTATION'],
      'INTERACTIVE': ['EXERCISE', 'MENTOR_SESSION']
    };
    
    return styles[learningStyle] || ['CONTENT', 'EXERCISE'];
  }

  generateAssessmentSteps(pathStructure, difficulty) {
    const assessments = [];
    const assessmentCount = Math.ceil(pathStructure.length / 5); // Assessment every 5 steps
    
    for (let i = 0; i < assessmentCount; i++) {
      assessments.push({
        skill: 'ASSESSMENT',
        stepType: 'ASSESSMENT',
        stepOrder: (i + 1) * 50,
        title: `Skill Assessment ${i + 1}`,
        description: `Comprehensive assessment of learned skills`,
        stepData: JSON.stringify({
          difficulty,
          assessmentType: 'COMPREHENSIVE',
          questionCount: 10 + (i * 5),
          timeLimit: 30
        }),
        estimatedTime: 30,
        difficulty
      });
    }
    
    return assessments;
  }

  generateProjectSteps(pathStructure, careerGoals) {
    const projects = [];
    const projectCount = Math.max(1, Math.floor(pathStructure.length / 8)); // Project every 8 steps
    
    for (let i = 0; i < projectCount; i++) {
      projects.push({
        skill: 'PROJECT',
        stepType: 'PROJECT',
        stepOrder: (i + 1) * 80,
        title: `Capstone Project ${i + 1}`,
        description: `Apply learned skills in a real-world project`,
        stepData: JSON.stringify({
          projectType: careerGoals.length > 0 ? 'CAREER_FOCUSED' : 'SKILL_APPLICATION',
          complexity: 'INTERMEDIATE',
          deliverables: ['Code Repository', 'Documentation', 'Presentation'],
          estimatedDuration: 120 // 2 hours
        }),
        estimatedTime: 120,
        difficulty: 'INTERMEDIATE'
      });
    }
    
    return projects;
  }

  calculateProgressSummary(learningPath) {
    const totalSteps = learningPath.steps.length;
    const completedSteps = learningPath.steps.filter(step => step.completed).length;
    const inProgressSteps = learningPath.steps.filter(step => 
      !step.completed && step.progress && step.progress.length > 0
    ).length;
    
    return {
      totalSteps,
      completedSteps,
      inProgressSteps,
      notStartedSteps: totalSteps - completedSteps - inProgressSteps,
      completionRate: totalSteps > 0 ? completedSteps / totalSteps : 0
    };
  }

  getNextStep(learningPath) {
    const nextIncomplete = learningPath.steps.find(step => !step.completed);
    
    if (!nextIncomplete) return null;
    
    return {
      stepId: nextIncomplete.id,
      title: nextIncomplete.title,
      stepType: nextIncomplete.stepType,
      estimatedTime: nextIncomplete.estimatedTime,
      order: nextIncomplete.stepOrder
    };
  }

  calculateEstimatedCompletion(steps) {
    const incompleteSteps = steps.filter(step => !step.completed);
    const totalEstimatedTime = incompleteSteps.reduce((total, step) => 
      total + (step.estimatedTime || 0), 0
    );
    
    return {
      totalMinutes: totalEstimatedTime,
      totalHours: Math.ceil(totalEstimatedTime / 60),
      estimatedDays: Math.ceil(totalEstimatedTime / (8 * 60)) // Assuming 8 hours per day
    };
  }

  calculateMentorRating(mentor) {
    // Calculate rating based on sessions and feedback
    const sessions = mentor.mentorshipsAsMentor || [];
    if (sessions.length === 0) return 4.5; // Default rating
    
    const totalRating = sessions.reduce((sum, session) => {
      // This would come from actual feedback in a real implementation
      return sum + 4.5; // Placeholder
    }, 0);
    
    return Math.min(5, totalRating / sessions.length);
  }

  async getPathAnalytics(learningPathId, userId) {
    try {
      const progress = await prisma.learningPathProgress.findMany({
        where: {
          userId,
          learningPathId
        }
      });

      const totalTimeSpent = progress.reduce((total, p) => total + (p.timeSpent || 0), 0);
      const averageProgress = progress.reduce((sum, p) => sum + p.progressValue, 0) / progress.length;

      return {
        totalTimeSpent,
        averageProgress,
        lastAccessed: Math.max(...progress.map(p => p.lastAccessedAt.getTime())),
        streakDays: this.calculateStreakDays(progress),
        completionRate: this.calculateCompletionRate(progress)
      };

    } catch (error) {
      logger.error('Error getting path analytics:', error);
      return {};
    }
  }

  async getPathRecommendations(learningPathId, userId) {
    try {
      // This would integrate with the AI analytics service
      return [];
    } catch (error) {
      logger.error('Error getting path recommendations:', error);
      return [];
    }
  }

  async getSkillProgress(learningPathId, userId) {
    try {
      const skillMastery = await prisma.skillMastery.findMany({
        where: {
          userId,
          learningPathId
        }
      });

      return skillMastery.map(skill => ({
        skill: skill.skill,
        masteryLevel: skill.masteryLevel,
        confidence: skill.confidence,
        lastAssessed: skill.lastAssessed
      }));

    } catch (error) {
      logger.error('Error getting skill progress:', error);
      return [];
    }
  }

  calculateStreakDays(progress) {
    // Calculate consecutive days of activity
    const sortedDates = progress
      .map(p => p.lastAccessedAt.toISOString().split('T')[0])
      .sort();
    
    let streak = 0;
    let currentDate = new Date().toISOString().split('T')[0];
    
    for (let i = sortedDates.length - 1; i >= 0; i--) {
      if (sortedDates[i] === currentDate) {
        streak++;
        currentDate = new Date(Date.parse(currentDate) - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      } else {
        break;
      }
    }
    
    return streak;
  }

  calculateCompletionRate(progress) {
    if (progress.length === 0) return 0;
    
    const completedProgress = progress.filter(p => p.progressValue >= 1.0);
    return completedProgress.length / progress.length;
  }

  async updateAIAnalytics(userId, learningPath, skillAnalysis) {
    try {
      // Track learning path creation event
      await prisma.aIAnalyticsEvent.create({
        data: {
          userId,
          eventType: 'LEARNING_PATH_CREATED',
          eventData: JSON.stringify({
            learningPathId: learningPath.id,
            pathType: learningPath.pathType,
            skills: learningPath.skills,
            difficulty: learningPath.difficulty,
            estimatedDuration: learningPath.estimatedDuration
          }),
          timestamp: new Date()
        }
      });

      // Update user behavior
      // This would integrate with the AI analytics service

    } catch (error) {
      logger.error('Error updating AI analytics:', error);
    }
  }

  // Cache management
  clearCacheForUser(userId) {
    const keys = learningPathCache.keys().filter(key => key.includes(userId));
    keys.forEach(key => learningPathCache.del(key));
  }

  clearAllCache() {
    learningPathCache.flushAll();
  }

  getCacheStats() {
    return learningPathCache.getStats();
  }

  // Background processing
  startPathProcessor() {
    setInterval(async () => {
      if (this.isProcessing || this.pathGenerationQueue.length === 0) {
        return;
      }

      this.isProcessing = true;
      
      try {
        const { userId, options, resolve, reject } = this.pathGenerationQueue.shift();
        
        try {
          const result = await this.generatePersonalizedPath(userId, options);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      } catch (error) {
        logger.error('Error in path processor:', error);
      } finally {
        this.isProcessing = false;
      }
    }, 1000); // Process every second
  }

  // Queue path generation for background processing
  queuePathGeneration(userId, options) {
    return new Promise((resolve, reject) => {
      this.pathGenerationQueue.push({
        userId,
        options,
        resolve,
        reject
      });
    });
  }

  // Health check
  async getHealthStatus() {
    try {
      const cacheStats = this.getCacheStats();
      const queueLength = this.pathGenerationQueue.length;
      
      return {
        status: 'healthy',
        cache: cacheStats,
        queue: {
          length: queueLength,
          processing: this.isProcessing
        },
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Error getting health status:', error);
      return {
        status: 'error',
        error: error.message,
        timestamp: new Date()
      };
    }
  }
}

module.exports = new LearningPathService();
