const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger.util');
const NodeCache = require('node-cache');
const EventEmitter = require('events');

const prisma = new PrismaClient();
const mentorCache = new NodeCache({ stdTTL: 600 }); // 10 minutes cache

class MentorRecommendationService extends EventEmitter {
  constructor() {
    super();
    this.scoringQueue = [];
    this.isProcessing = false;
    this.startScoringProcessor();
  }

  // Generate personalized mentor recommendations using hybrid scoring
  async generateMentorRecommendations(userId, options = {}) {
    try {
      const {
        skills = [],
        experience = 'INTERMEDIATE',
        limit = 10,
        scoringWeights = {
          skillMatch: 0.4,
          availability: 0.2,
          performance: 0.3,
          compatibility: 0.1
        },
        filters = {
          minRating: 4.0,
          maxSessions: 50,
          availabilityWindow: 7 // days
        }
      } = options;

      logger.info(`Generating mentor recommendations for user ${userId}`, {
        skills,
        experience,
        limit,
        scoringWeights
      });

      // Get user data and preferences
      const userData = await this.getUserMentorData(userId);
      
      // Get candidate mentors
      const candidateMentors = await this.getCandidateMentors(userId, skills, filters);
      
      // Calculate hybrid scores for each mentor
      const scoredMentors = await this.calculateHybridScores(
        userId,
        candidateMentors,
        userData,
        scoringWeights
      );
      
      // Apply additional filtering and ranking
      const rankedMentors = this.rankAndFilterMentors(scoredMentors, filters);
      
      // Store mentor scores
      await this.storeMentorScores(userId, rankedMentors.slice(0, limit));
      
      // Generate recommendations
      const recommendations = rankedMentors.slice(0, limit).map(mentor => ({
        mentorId: mentor.id,
        mentorName: mentor.name,
        mentorBio: mentor.bio,
        mentorSkills: mentor.skills,
        mentorRole: mentor.role,
        mentorAvatar: mentor.profileImage,
        overallScore: mentor.overallScore,
        skillMatch: mentor.skillMatch,
        availability: mentor.availability,
        performance: mentor.performance,
        compatibility: mentor.compatibility,
        scoringFactors: mentor.scoringFactors,
        recommendationReasons: mentor.recommendationReasons,
        availabilitySlots: mentor.availabilitySlots,
        sessionStats: mentor.sessionStats,
        feedback: mentor.feedback
      }));

      // Emit real-time update
      this.emit('mentorRecommendationsGenerated', {
        userId,
        recommendations,
        totalCandidates: candidateMentors.length,
        scoringWeights
      });

      // Clear cache for user
      this.clearCacheForUser(userId);

      logger.info(`Successfully generated ${recommendations.length} mentor recommendations for user ${userId}`, {
        averageScore: recommendations.reduce((sum, r) => sum + r.overallScore, 0) / recommendations.length
      });

      return recommendations;

    } catch (error) {
      logger.error('Error generating mentor recommendations:', error);
      throw new Error(`Failed to generate mentor recommendations: ${error.message}`);
    }
  }

  // Get user data for mentor matching
  async getUserMentorData(userId) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          aiUserBehavior: true,
          skillMastery: true,
          mentorScoresReceived: {
            include: {
              mentor: {
                select: { id: true, name: true, skills: true }
              }
            }
          },
          mentorshipsAsMentee: {
            include: {
              mentor: {
                select: { id: true, name: true, skills: true }
              },
              slot: true
            }
          }
        }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Get user behavior and preferences
      const behavior = user.aiUserBehavior ? 
        JSON.parse(user.aiUserBehavior.behaviorData || '{}') : {};

      // Get skill preferences
      const skillPreferences = this.extractSkillPreferences(user.skillMastery, behavior);

      // Get past mentor interactions
      const pastInteractions = await this.getPastMentorInteractions(userId);

      return {
        user,
        behavior,
        skillPreferences,
        skillMastery: user.skillMastery,
        pastInteractions,
        previousScores: user.mentorScoresReceived
      };

    } catch (error) {
      logger.error('Error getting user mentor data:', error);
      throw error;
    }
  }

  // Get candidate mentors for matching
  async getCandidateMentors(userId, skills, filters) {
    try {
      const whereClause = {
        role: 'MENTOR',
        isActive: true,
        id: { not: userId } // Exclude self
      };

      // Add skill filter if specified
      if (skills.length > 0) {
        whereClause.OR = skills.map(skill => ({
          skills: { contains: skill, mode: 'insensitive' }
        }));
      }

      // Add availability filter
      if (filters.availabilityWindow) {
        const availabilityStart = new Date();
        const availabilityEnd = new Date();
        availabilityEnd.setDate(availabilityEnd.getDate() + filters.availabilityWindow);

        whereClause.slots = {
          some: {
            status: 'AVAILABLE',
            startTime: { gte: availabilityStart },
            endTime: { lte: availabilityEnd }
          }
        };
      }

      const mentors = await prisma.user.findMany({
        where: whereClause,
        include: {
          slots: {
            where: {
              status: 'AVAILABLE',
              startTime: { gte: new Date() }
            },
            orderBy: { startTime: 'asc' },
            take: 10
          },
          mentorshipsAsMentor: {
            include: {
              mentee: { select: { id: true, name: true } },
              slot: true
            }
          },
          _count: {
            select: { 
              mentorshipsAsMentor: true,
              slots: true
            }
          }
        },
        take: 50 // Limit candidates for performance
      });

      return mentors;

    } catch (error) {
      logger.error('Error getting candidate mentors:', error);
      throw error;
    }
  }

  // Calculate hybrid scores for mentors
  async calculateHybridScores(userId, mentors, userData, scoringWeights) {
    try {
      const scoredMentors = [];

      for (const mentor of mentors) {
        const scores = await this.calculateIndividualScores(
          userId,
          mentor,
          userData,
          scoringWeights
        );

        const overallScore = this.calculateWeightedScore(scores, scoringWeights);

        scoredMentors.push({
          ...mentor,
          ...scores,
          overallScore,
          scoringFactors: this.generateScoringFactors(scores, scoringWeights),
          recommendationReasons: this.generateRecommendationReasons(scores, mentor)
        });
      }

      return scoredMentors;

    } catch (error) {
      logger.error('Error calculating hybrid scores:', error);
      throw error;
    }
  }

  // Calculate individual scoring components
  async calculateIndividualScores(userId, mentor, userData, scoringWeights) {
    try {
      // 1. Skill Match Score
      const skillMatch = await this.calculateSkillMatchScore(
        userData.skillPreferences,
        mentor.skills,
        userData.skillMastery
      );

      // 2. Availability Score
      const availability = await this.calculateAvailabilityScore(
        mentor.slots,
        userData.behavior
      );

      // 3. Performance Score
      const performance = await this.calculatePerformanceScore(
        mentor.mentorshipsAsMentor,
        userData.pastInteractions
      );

      // 4. Compatibility Score
      const compatibility = await this.calculateCompatibilityScore(
        userId,
        mentor,
        userData.behavior,
        userData.previousScores
      );

      return {
        skillMatch,
        availability,
        performance,
        compatibility
      };

    } catch (error) {
      logger.error('Error calculating individual scores:', error);
      throw error;
    }
  }

  // Calculate skill match score
  async calculateSkillMatchScore(userSkillPreferences, mentorSkills, userSkillMastery) {
    try {
      const userSkills = userSkillPreferences.map(pref => pref.skill);
      const mentorSkillList = mentorSkills ? mentorSkills.split(',').map(s => s.trim()) : [];
      
      let matchScore = 0;
      let totalWeight = 0;

      // Calculate skill overlap
      for (const userSkill of userSkills) {
        const skillWeight = userSkillPreferences.find(pref => pref.skill === userSkill)?.weight || 1;
        totalWeight += skillWeight;

        if (mentorSkillList.includes(userSkill)) {
          // Boost score for exact matches
          matchScore += skillWeight * 1.0;
        } else {
          // Check for related skills
          const relatedSkills = this.getRelatedSkills(userSkill);
          const hasRelatedSkill = relatedSkills.some(related => 
            mentorSkillList.some(mentor => mentor.toLowerCase().includes(related.toLowerCase()))
          );
          
          if (hasRelatedSkill) {
            matchScore += skillWeight * 0.7; // 70% score for related skills
          }
        }
      }

      // Normalize score
      const normalizedScore = totalWeight > 0 ? matchScore / totalWeight : 0;

      // Apply mastery-based adjustment
      const masteryAdjustment = this.calculateMasteryAdjustment(userSkillMastery, mentorSkillList);
      
      return Math.min(1.0, normalizedScore + masteryAdjustment);

    } catch (error) {
      logger.error('Error calculating skill match score:', error);
      return 0.5; // Default score
    }
  }

  // Calculate availability score
  async calculateAvailabilityScore(slots, userBehavior) {
    try {
      if (!slots || slots.length === 0) {
        return 0.1; // Very low score for no availability
      }

      // Get user's preferred time slots
      const preferredTimes = userBehavior.preferredTimes || [];
      const preferredDays = userBehavior.preferredDays || [];

      let availabilityScore = 0;
      let totalSlots = slots.length;

      for (const slot of slots) {
        let slotScore = 0.5; // Base score for any availability

        // Boost for preferred times
        const slotHour = new Date(slot.startTime).getHours();
        const slotDay = new Date(slot.startTime).getDay();

        if (preferredTimes.includes(slotHour)) {
          slotScore += 0.3;
        }

        if (preferredDays.includes(slotDay)) {
          slotScore += 0.2;
        }

        // Boost for sooner availability
        const daysUntilSlot = Math.ceil((new Date(slot.startTime) - new Date()) / (1000 * 60 * 60 * 24));
        if (daysUntilSlot <= 3) {
          slotScore += 0.2;
        } else if (daysUntilSlot <= 7) {
          slotScore += 0.1;
        }

        availabilityScore += slotScore;
      }

      // Normalize score
      return Math.min(1.0, availabilityScore / totalSlots);

    } catch (error) {
      logger.error('Error calculating availability score:', error);
      return 0.5; // Default score
    }
  }

  // Calculate performance score
  async calculatePerformanceScore(mentorships, pastInteractions) {
    try {
      if (!mentorships || mentorships.length === 0) {
        return 0.3; // Low score for new mentors
      }

      // Calculate average rating
      let totalRating = 0;
      let ratingCount = 0;
      
      // This would come from actual feedback in a real implementation
      for (const mentorship of mentorships) {
        // Placeholder for actual feedback calculation
        totalRating += 4.5; // Average rating
        ratingCount++;
      }

      const averageRating = ratingCount > 0 ? totalRating / ratingCount : 4.0;

      // Calculate session completion rate
      const completedSessions = mentorships.filter(m => 
        m.status === 'COMPLETED'
      ).length;
      const completionRate = mentorships.length > 0 ? 
        completedSessions / mentorships.length : 0.8;

      // Calculate response time (placeholder)
      const averageResponseTime = 2; // hours
      const responseScore = Math.max(0, 1 - (averageResponseTime / 24)); // Normalize to 0-1

      // Combine performance metrics
      const performanceScore = (
        (averageRating / 5) * 0.5 + // Rating weight
        completionRate * 0.3 + // Completion rate weight
        responseScore * 0.2 // Response time weight
      );

      // Apply past interaction adjustment
      const interactionAdjustment = this.calculateInteractionAdjustment(pastInteractions);

      return Math.min(1.0, performanceScore + interactionAdjustment);

    } catch (error) {
      logger.error('Error calculating performance score:', error);
      return 0.5; // Default score
    }
  }

  // Calculate compatibility score
  async calculateCompatibilityScore(userId, mentor, userBehavior, previousScores) {
    try {
      let compatibilityScore = 0.5; // Base score

      // Learning style compatibility
      const userLearningStyle = userBehavior.learningStyle || 'VISUAL';
      const mentorTeachingStyle = this.getMentorTeachingStyle(mentor);
      const styleCompatibility = this.calculateStyleCompatibility(userLearningStyle, mentorTeachingStyle);
      compatibilityScore += styleCompatibility * 0.3;

      // Experience level compatibility
      const userExperience = userBehavior.experienceLevel || 'INTERMEDIATE';
      const mentorExperience = this.getMentorExperienceLevel(mentor);
      const experienceCompatibility = this.calculateExperienceCompatibility(userExperience, mentorExperience);
      compatibilityScore += experienceCompatibility * 0.3;

      // Communication style compatibility
      const communicationCompatibility = this.calculateCommunicationCompatibility(userBehavior, mentor);
      compatibilityScore += communicationCompatibility * 0.2;

      // Past interaction compatibility
      const pastCompatibility = this.calculatePastCompatibility(previousScores, mentor.id);
      compatibilityScore += pastCompatibility * 0.2;

      return Math.min(1.0, compatibilityScore);

    } catch (error) {
      logger.error('Error calculating compatibility score:', error);
      return 0.5; // Default score
    }
  }

  // Calculate weighted overall score
  calculateWeightedScore(scores, weights) {
    return (
      scores.skillMatch * weights.skillMatch +
      scores.availability * weights.availability +
      scores.performance * weights.performance +
      scores.compatibility * weights.compatibility
    );
  }

  // Generate scoring factors explanation
  generateScoringFactors(scores, weights) {
    return {
      skillMatch: {
        score: scores.skillMatch,
        weight: weights.skillMatch,
        contribution: scores.skillMatch * weights.skillMatch,
        factors: ['Skill overlap', 'Related skills', 'Mastery alignment']
      },
      availability: {
        score: scores.availability,
        weight: weights.availability,
        contribution: scores.availability * weights.availability,
        factors: ['Available slots', 'Preferred times', 'Response time']
      },
      performance: {
        score: scores.performance,
        weight: weights.performance,
        contribution: scores.performance * weights.performance,
        factors: ['Average rating', 'Completion rate', 'Session quality']
      },
      compatibility: {
        score: scores.compatibility,
        weight: weights.compatibility,
        contribution: scores.compatibility * weights.compatibility,
        factors: ['Learning style', 'Experience level', 'Communication']
      }
    };
  }

  // Generate recommendation reasons
  generateRecommendationReasons(scores, mentor) {
    const reasons = [];

    if (scores.skillMatch > 0.8) {
      reasons.push('Excellent skill match for your learning goals');
    }

    if (scores.availability > 0.7) {
      reasons.push('Highly available with flexible scheduling');
    }

    if (scores.performance > 0.8) {
      reasons.push('Outstanding mentor with excellent reviews');
    }

    if (scores.compatibility > 0.7) {
      reasons.push('Great compatibility with your learning style');
    }

    if (mentor._count.mentorshipsAsMentor > 20) {
      reasons.push(`Experienced mentor with ${mentor._count.mentorshipsAsMentor}+ sessions`);
    }

    if (reasons.length === 0) {
      reasons.push('Good overall match for your requirements');
    }

    return reasons;
  }

  // Rank and filter mentors
  rankAndFilterMentors(scoredMentors, filters) {
    try {
      // Apply minimum rating filter
      let filtered = scoredMentors.filter(mentor => {
        // This would use actual ratings in a real implementation
        const mentorRating = 4.5; // Placeholder
        return mentorRating >= (filters.minRating || 4.0);
      });

      // Apply maximum sessions filter
      if (filters.maxSessions) {
        filtered = filtered.filter(mentor => 
          mentor._count.mentorshipsAsMentor <= filters.maxSessions
        );
      }

      // Sort by overall score (descending)
      filtered.sort((a, b) => b.overallScore - a.overallScore);

      return filtered;

    } catch (error) {
      logger.error('Error ranking and filtering mentors:', error);
      return scoredMentors;
    }
  }

  // Store mentor scores in database
  async storeMentorScores(userId, mentors) {
    try {
      // Clear existing scores for user
      await prisma.mentorScore.deleteMany({
        where: { userId }
      });

      // Create new score records
      const scoreData = mentors.map(mentor => ({
        mentorId: mentor.id.toString(),
        userId: userId.toString(),
        score: mentor.overallScore,
        skillMatch: mentor.skillMatch,
        availability: mentor.availability,
        performance: mentor.performance,
        compatibility: mentor.compatibility,
        scoringFactors: JSON.stringify(mentor.scoringFactors),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      }));

      await prisma.mentorScore.createMany({
        data: scoreData
      });

      logger.info(`Stored ${scoreData.length} mentor scores for user ${userId}`);

    } catch (error) {
      logger.error('Error storing mentor scores:', error);
      throw error;
    }
  }

  // Get stored mentor recommendations
  async getStoredMentorRecommendations(userId, options = {}) {
    try {
      const {
        limit = 10,
        minScore = 0.5,
        includeExpired = false
      } = options;

      const cacheKey = `mentor_recommendations_${userId}_${limit}_${minScore}`;
      const cached = mentorCache.get(cacheKey);
      
      if (cached) {
        return cached;
      }

      const whereClause = {
        userId,
        score: { gte: minScore },
        isRecommended: true
      };

      if (!includeExpired) {
        whereClause.expiresAt = { gt: new Date() };
      }

      const mentorScores = await prisma.mentorScore.findMany({
        where: whereClause,
        include: {
          mentor: {
            select: {
              id: true,
              name: true,
              bio: true,
              skills: true,
              profileImage: true,
              role: true
            }
          }
        },
        orderBy: { score: 'desc' },
        take: limit
      });

      const recommendations = mentorScores.map(score => ({
        mentorId: score.mentor.id,
        mentorName: score.mentor.name,
        mentorBio: score.mentor.bio,
        mentorSkills: score.mentor.skills,
        mentorRole: score.mentor.role,
        mentorAvatar: score.mentor.profileImage,
        overallScore: score.score,
        skillMatch: score.skillMatch,
        availability: score.availability,
        performance: score.performance,
        compatibility: score.compatibility,
        scoringFactors: JSON.parse(score.scoringFactors || '{}'),
        feedbackScore: score.feedbackScore,
        feedbackComment: score.feedbackComment,
        expiresAt: score.expiresAt
      }));

      mentorCache.set(cacheKey, recommendations);
      return recommendations;

    } catch (error) {
      logger.error('Error getting stored mentor recommendations:', error);
      throw error;
    }
  }

  // Update mentor feedback
  async updateMentorFeedback(userId, mentorId, feedback) {
    try {
      const { score, comment } = feedback;

      await prisma.mentorScore.updateMany({
        where: {
          userId: userId.toString(),
          mentorId: mentorId.toString()
        },
        data: {
          feedbackScore: score,
          feedbackComment: comment
        }
      });

      // Update mentor recommendation
      await this.updateMentorRecommendation(userId, mentorId, feedback);

      // Emit update
      this.emit('mentorFeedbackUpdated', {
        userId,
        mentorId,
        feedback
      });

      // Clear cache
      this.clearCacheForUser(userId);

      return { success: true };

    } catch (error) {
      logger.error('Error updating mentor feedback:', error);
      throw error;
    }
  }

  // Update mentor recommendation based on feedback
  async updateMentorRecommendation(userId, mentorId, feedback) {
    try {
      // Get current score
      const currentScore = await prisma.mentorScore.findFirst({
        where: {
          userId: userId.toString(),
          mentorId: mentorId.toString()
        }
      });

      if (!currentScore) return;

      // Adjust score based on feedback
      const feedbackAdjustment = (feedback.score - 3) * 0.1; // -0.2 to +0.2
      const newScore = Math.max(0, Math.min(1, currentScore.score + feedbackAdjustment));

      await prisma.mentorScore.update({
        where: { id: currentScore.id },
        data: {
          score: newScore,
          feedbackScore: feedback.score,
          feedbackComment: feedback.comment
        }
      });

    } catch (error) {
      logger.error('Error updating mentor recommendation:', error);
      throw error;
    }
  }

  // Get mentor availability
  async getMentorAvailability(mentorId, options = {}) {
    try {
      const {
        startDate = new Date(),
        endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        status = 'AVAILABLE'
      } = options;

      const slots = await prisma.slot.findMany({
        where: {
          mentorId,
          status,
          startTime: { gte: startDate },
          endTime: { lte: endDate }
        },
        orderBy: { startTime: 'asc' }
      });

      return slots.map(slot => ({
        id: slot.id,
        startTime: slot.startTime,
        endTime: slot.endTime,
        status: slot.status,
        duration: Math.ceil((new Date(slot.endTime) - new Date(slot.startTime)) / (1000 * 60))
      }));

    } catch (error) {
      logger.error('Error getting mentor availability:', error);
      throw error;
    }
  }

  // Utility methods
  extractSkillPreferences(skillMastery, behavior) {
    const preferences = [];
    
    // Extract from skill mastery
    if (skillMastery) {
      skillMastery.forEach(skill => {
        preferences.push({
          skill: skill.skill,
          weight: 1 - skill.masteryLevel, // Higher weight for skills with lower mastery
          priority: skill.masteryLevel < 0.5 ? 'HIGH' : 'MEDIUM'
        });
      });
    }

    // Extract from behavior data
    if (behavior.skillInterests) {
      behavior.skillInterests.forEach(skill => {
        const existing = preferences.find(p => p.skill === skill.skill);
        if (existing) {
          existing.weight = Math.max(existing.weight, skill.weight || 1);
        } else {
          preferences.push({
            skill: skill.skill,
            weight: skill.weight || 1,
            priority: skill.priority || 'MEDIUM'
          });
        }
      });
    }

    return preferences.sort((a, b) => b.weight - a.weight);
  }

  getRelatedSkills(skill) {
    const skillMap = {
      'JavaScript': ['React', 'Node.js', 'Vue.js', 'Angular', 'TypeScript'],
      'React': ['JavaScript', 'TypeScript', 'Redux', 'Next.js', 'Vue.js'],
      'Python': ['Django', 'Flask', 'Machine Learning', 'Data Science', 'FastAPI'],
      'Machine Learning': ['Python', 'TensorFlow', 'PyTorch', 'Data Science', 'Statistics'],
      'Data Science': ['Python', 'R', 'Statistics', 'Machine Learning', 'SQL'],
      'Web Development': ['HTML', 'CSS', 'JavaScript', 'React', 'Node.js'],
      'Mobile Development': ['React Native', 'Flutter', 'Swift', 'Kotlin', 'JavaScript'],
      'DevOps': ['Docker', 'Kubernetes', 'AWS', 'CI/CD', 'Linux'],
      'Cloud Computing': ['AWS', 'Azure', 'Google Cloud', 'Docker', 'Kubernetes']
    };

    return skillMap[skill] || [];
  }

  calculateMasteryAdjustment(userSkillMastery, mentorSkills) {
    if (!userSkillMastery || userSkillMastery.length === 0) {
      return 0;
    }

    let adjustment = 0;
    const mentorSkillList = mentorSkills ? mentorSkills.split(',').map(s => s.trim()) : [];

    for (const userSkill of userSkillMastery) {
      if (mentorSkillList.includes(userSkill.skill)) {
        // Boost score for skills where mentor can help improve
        if (userSkill.masteryLevel < 0.5) {
          adjustment += 0.1; // Higher boost for low mastery skills
        } else if (userSkill.masteryLevel < 0.8) {
          adjustment += 0.05; // Medium boost for intermediate skills
        }
      }
    }

    return Math.min(0.2, adjustment); // Cap adjustment at 0.2
  }

  async getPastMentorInteractions(userId) {
    try {
      const mentorships = await prisma.mentorship.findMany({
        where: { menteeId: userId },
        include: {
          mentor: {
            select: { id: true, name: true, skills: true }
          }
        }
      });

      return mentorships.map(m => ({
        mentorId: m.mentor.id,
        mentorName: m.mentor.name,
        mentorSkills: m.mentor.skills,
        status: m.status,
        createdAt: m.createdAt,
        completedAt: m.completedAt
      }));

    } catch (error) {
      logger.error('Error getting past mentor interactions:', error);
      return [];
    }
  }

  getMentorTeachingStyle(mentor) {
    // This would be stored in mentor profile in a real implementation
    // For now, infer from skills and experience
    const skills = mentor.skills ? mentor.skills.split(',').map(s => s.trim()) : [];
    
    if (skills.includes('Theory') || skills.includes('Academic')) {
      return 'ACADEMIC';
    } else if (skills.includes('Practical') || skills.includes('Hands-on')) {
      return 'PRACTICAL';
    } else if (skills.includes('Mentoring') || skills.includes('Coaching')) {
      return 'MENTORING';
    } else {
      return 'BALANCED';
    }
  }

  getMentorExperienceLevel(mentor) {
    const sessionCount = mentor._count?.mentorshipsAsMentor || 0;
    
    if (sessionCount >= 50) return 'EXPERT';
    if (sessionCount >= 20) return 'ADVANCED';
    if (sessionCount >= 5) return 'INTERMEDIATE';
    return 'BEGINNER';
  }

  calculateStyleCompatibility(userStyle, mentorStyle) {
    const compatibilityMatrix = {
      'VISUAL': {
        'VISUAL': 1.0,
        'PRACTICAL': 0.8,
        'MENTORING': 0.7,
        'ACADEMIC': 0.6,
        'BALANCED': 0.8
      },
      'PRACTICAL': {
        'VISUAL': 0.7,
        'PRACTICAL': 1.0,
        'MENTORING': 0.8,
        'ACADEMIC': 0.5,
        'BALANCED': 0.8
      },
      'MENTORING': {
        'VISUAL': 0.8,
        'PRACTICAL': 0.8,
        'MENTORING': 1.0,
        'ACADEMIC': 0.7,
        'BALANCED': 0.9
      },
      'ACADEMIC': {
        'VISUAL': 0.6,
        'PRACTICAL': 0.5,
        'MENTORING': 0.7,
        'ACADEMIC': 1.0,
        'BALANCED': 0.8
      },
      'BALANCED': {
        'VISUAL': 0.8,
        'PRACTICAL': 0.8,
        'MENTORING': 0.9,
        'ACADEMIC': 0.8,
        'BALANCED': 1.0
      }
    };

    return compatibilityMatrix[userStyle]?.[mentorStyle] || 0.5;
  }

  calculateExperienceCompatibility(userExperience, mentorExperience) {
    const compatibilityMatrix = {
      'BEGINNER': {
        'BEGINNER': 0.7,
        'INTERMEDIATE': 0.9,
        'ADVANCED': 0.8,
        'EXPERT': 0.6
      },
      'INTERMEDIATE': {
        'BEGINNER': 0.8,
        'INTERMEDIATE': 0.9,
        'ADVANCED': 0.9,
        'EXPERT': 0.8
      },
      'ADVANCED': {
        'BEGINNER': 0.6,
        'INTERMEDIATE': 0.8,
        'ADVANCED': 0.9,
        'EXPERT': 0.9
      },
      'EXPERT': {
        'BEGINNER': 0.5,
        'INTERMEDIATE': 0.7,
        'ADVANCED': 0.8,
        'EXPERT': 0.9
      }
    };

    return compatibilityMatrix[userExperience]?.[mentorExperience] || 0.5;
  }

  calculateCommunicationCompatibility(userBehavior, mentor) {
    // This would use actual communication preferences in a real implementation
    const userCommunication = userBehavior.communicationStyle || 'FRIENDLY';
    const mentorCommunication = 'PROFESSIONAL'; // Default

    const compatibilityMatrix = {
      'FRIENDLY': {
        'FRIENDLY': 1.0,
        'PROFESSIONAL': 0.8,
        'FORMAL': 0.6,
        'CASUAL': 0.9
      },
      'PROFESSIONAL': {
        'FRIENDLY': 0.8,
        'PROFESSIONAL': 1.0,
        'FORMAL': 0.9,
        'CASUAL': 0.7
      },
      'FORMAL': {
        'FRIENDLY': 0.6,
        'PROFESSIONAL': 0.9,
        'FORMAL': 1.0,
        'CASUAL': 0.5
      },
      'CASUAL': {
        'FRIENDLY': 0.9,
        'PROFESSIONAL': 0.7,
        'FORMAL': 0.5,
        'CASUAL': 1.0
      }
    };

    return compatibilityMatrix[userCommunication]?.[mentorCommunication] || 0.7;
  }

  calculatePastCompatibility(previousScores, mentorId) {
    const pastScore = previousScores.find(score => score.mentorId === mentorId);
    
    if (!pastScore) {
      return 0.5; // Neutral for new mentors
    }

    if (pastScore.feedbackScore) {
      // Adjust based on past feedback
      return (pastScore.feedbackScore - 3) * 0.2 + 0.5; // Convert 1-5 to 0-1 scale
    }

    return pastScore.score * 0.3 + 0.5; // Weight past score moderately
  }

  calculateInteractionAdjustment(pastInteractions) {
    if (!pastInteractions || pastInteractions.length === 0) {
      return 0;
    }

    const completedSessions = pastInteractions.filter(i => i.status === 'COMPLETED');
    const positiveInteractions = completedSessions.filter(i => {
      // This would use actual feedback in a real implementation
      return true; // Placeholder
    });

    const interactionRate = positiveInteractions.length / Math.max(pastInteractions.length, 1);
    
    return (interactionRate - 0.5) * 0.2; // Small adjustment based on interaction quality
  }

  // Cache management
  clearCacheForUser(userId) {
    const keys = mentorCache.keys().filter(key => key.includes(userId));
    keys.forEach(key => mentorCache.del(key));
  }

  clearAllCache() {
    mentorCache.flushAll();
  }

  getCacheStats() {
    return mentorCache.getStats();
  }

  // Background processing
  startScoringProcessor() {
    setInterval(async () => {
      if (this.isProcessing || this.scoringQueue.length === 0) {
        return;
      }

      this.isProcessing = true;
      
      try {
        const { userId, options, resolve, reject } = this.scoringQueue.shift();
        
        try {
          const result = await this.generateMentorRecommendations(userId, options);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      } catch (error) {
        logger.error('Error in scoring processor:', error);
      } finally {
        this.isProcessing = false;
      }
    }, 1000); // Process every second
  }

  // Queue scoring for background processing
  queueScoring(userId, options) {
    return new Promise((resolve, reject) => {
      this.scoringQueue.push({
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
      const queueLength = this.scoringQueue.length;
      
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

module.exports = new MentorRecommendationService();
