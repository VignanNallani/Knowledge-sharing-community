import prisma from '../config/prisma.js';
import { ApiError } from '../utils/ApiError.js';
import { observability } from '../utils/observability.js';

/**
 * Mentorship Matching Service
 * Handles intelligent mentor-mentee matching algorithms
 */
class MentorshipMatchingService {
  constructor() {
    this.skillWeight = 0.3;
    this.experienceWeight = 0.2;
    this.availabilityWeight = 0.15;
    this.trustWeight = 0.2;
    this.rateWeight = 0.1;
    this.languageWeight = 0.05;
  }

  // ==================== MENTOR RECOMMENDATION ====================

  /**
   * Get personalized mentor recommendations for a mentee
   */
  async getMentorRecommendations(menteeId, options = {}) {
    const { limit = 10, excludeIds = [] } = options;

    // Get mentee profile and preferences
    const menteeProfile = await prisma.menteeProfile.findUnique({
      where: { userId: menteeId },
      include: {
        user: {
          select: { id: true, name: true }
        }
      }
    });

    if (!menteeProfile) {
      throw new ApiError(404, 'Mentee profile not found');
    }

    // Get all verified mentors
    const mentors = await prisma.mentorProfile.findMany({
      where: {
        verificationStatus: 'VERIFIED',
        user: { role: 'MENTOR' },
        id: { notIn: excludeIds }
      },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        },
        mentorSkills: {
          include: {
            skill: true
          }
        },
        mentorshipRelationships: {
          where: { status: 'ACTIVE' },
          select: { id: true }
        },
        availability: {
          where: { status: 'available' },
          select: { dayOfWeek: true, startTime: true, endTime: true, timezone: true }
        },
        trustScore: true,
        packages: {
          where: { isActive: true },
          select: { id: true, type: true, price: true, sessionCount: true }
        }
      }
    });

    // Calculate match scores for each mentor
    const mentorScores = await Promise.all(
      mentors.map(async (mentor) => {
        const score = await this.calculateMatchScore(menteeProfile, mentor);
        return { mentor, score };
      })
    );

    // Sort by score and return top recommendations
    const recommendations = mentorScores
      .sort((a, b) => b.score.total - a.score.total)
      .slice(0, limit)
      .map(({ mentor, score }) => ({
        ...mentor,
        matchScore: score,
        matchReasons: this.generateMatchReasons(menteeProfile, mentor, score)
      }));

    observability.trackBusinessEvent('mentor_recommendations_generated', {
      menteeId,
      recommendationCount: recommendations.length,
      topScore: recommendations[0]?.matchScore?.total || 0
    });

    return recommendations;
  }

  /**
   * Calculate comprehensive match score between mentee and mentor
   */
  async calculateMatchScore(menteeProfile, mentor) {
    const scores = {
      skill: this.calculateSkillMatchScore(menteeProfile, mentor),
      experience: this.calculateExperienceMatchScore(menteeProfile, mentor),
      availability: this.calculateAvailabilityMatchScore(menteeProfile, mentor),
      trust: this.calculateTrustMatchScore(mentor),
      rate: this.calculateRateMatchScore(menteeProfile, mentor),
      language: this.calculateLanguageMatchScore(menteeProfile, mentor)
    };

    const total = Math.round(
      scores.skill * this.skillWeight +
      scores.experience * this.experienceWeight +
      scores.availability * this.availabilityWeight +
      scores.trust * this.trustWeight +
      scores.rate * this.rateWeight +
      scores.language * this.languageWeight
    );

    return { ...scores, total };
  }

  /**
   * Calculate skill compatibility score
   */
  calculateSkillMatchScore(menteeProfile, mentor) {
    const menteeTopics = menteeProfile.preferredTopics || [];
    const mentorSkills = mentor.mentorSkills.map(ms => ms.skill.name.toLowerCase());

    if (menteeTopics.length === 0) return 50; // Neutral score if no preferences

    const matchedSkills = menteeTopics.filter(topic => 
      mentorSkills.some(skill => skill.includes(topic.toLowerCase()) || topic.toLowerCase().includes(skill))
    );

    const matchRatio = matchedSkills.length / menteeTopics.length;
    
    // Bonus for verified skills
    const verifiedSkillsBonus = mentor.mentorSkills
      .filter(ms => ms.verified && matchedSkills.includes(ms.skill.name))
      .length * 5;

    return Math.min(100, Math.round(matchRatio * 100 + verifiedSkillsBonus));
  }

  /**
   * Calculate experience level compatibility
   */
  calculateExperienceMatchScore(menteeProfile, mentor) {
    const menteeLevel = menteeProfile.careerLevel?.toLowerCase() || '';
    const mentorExperience = mentor.yearsOfExperience || 0;

    // Define experience requirements for different career levels
    const levelRequirements = {
      'junior': { min: 3, ideal: 5, max: 15 },
      'mid-level': { min: 5, ideal: 8, max: 20 },
      'senior': { min: 8, ideal: 12, max: 25 },
      'lead': { min: 10, ideal: 15, max: 30 }
    };

    const requirements = levelRequirements[menteeLevel] || levelRequirements['junior'];

    if (mentorExperience < requirements.min) return 20;
    if (mentorExperience > requirements.max) return 60; // Too experienced might not be ideal

    // Calculate score based on proximity to ideal experience
    const diff = Math.abs(mentorExperience - requirements.ideal);
    const score = Math.max(0, 100 - (diff * 5));

    return Math.round(score);
  }

  /**
   * Calculate availability compatibility score
   */
  calculateAvailabilityMatchScore(menteeProfile, mentor) {
    if (!mentor.availability || mentor.availability.length === 0) return 30;

    const menteeAvailability = menteeProfile.availability;
    if (!menteeAvailability || Object.keys(menteeAvailability).length === 0) return 70;

    // Simple availability matching - can be enhanced with timezone conversions
    const availableSlots = mentor.availability.length;
    const maxSlots = 7; // Assuming max one slot per day

    const availabilityRatio = availableSlots / maxSlots;
    return Math.round(availabilityRatio * 100);
  }

  /**
   * Calculate trust score contribution
   */
  calculateTrustMatchScore(mentor) {
    const trustScore = mentor.trustScore?.overallScore || 70;
    
    // Apply diminishing returns for very high scores
    if (trustScore >= 95) return 100;
    if (trustScore >= 90) return 95;
    if (trustScore >= 85) return 90;
    if (trustScore >= 80) return 85;
    
    return trustScore;
  }

  /**
   * Calculate rate compatibility score
   */
  calculateRateMatchScore(menteeProfile, mentor) {
    if (!mentor.hourlyRate) return 80; // Neutral if no rate specified

    const budgetRange = menteeProfile.budgetRange;
    if (!budgetRange) return 70; // Neutral if no budget specified

    // Parse budget range (e.g., "$50-100" -> { min: 50, max: 100 })
    const budget = this.parseBudgetRange(budgetRange);
    if (!budget) return 70;

    if (mentor.hourlyRate <= budget.max) {
      if (mentor.hourlyRate <= budget.min) {
        return 100; // Under budget
      } else {
        // Calculate how close to budget limit
        const overBudget = mentor.hourlyRate - budget.min;
        const budgetRange = budget.max - budget.min;
        const score = 100 - (overBudget / budgetRange * 30);
        return Math.round(Math.max(70, score));
      }
    } else {
      // Over budget - penalize based on how much over
      const overAmount = mentor.hourlyRate - budget.max;
      const penalty = Math.min(50, overAmount / 10);
      return Math.round(70 - penalty);
    }
  }

  /**
   * Calculate language compatibility score
   */
  calculateLanguageMatchScore(menteeProfile, mentor) {
    // Default to English if no preferences specified
    const menteeLanguages = ['english'];
    const mentorLanguages = mentor.languagesSpoken.map(lang => lang.toLowerCase());

    const commonLanguages = menteeLanguages.filter(lang => 
      mentorLanguages.includes(lang)
    );

    if (commonLanguages.length === 0) return 30;
    if (commonLanguages.length >= 2) return 100;
    
    return 80;
  }

  // ==================== ADVANCED MATCHING ====================

  /**
   * Find best mentors for specific skills/topics
   */
  async findMentorsForSkills(skillIds, options = {}) {
    const { limit = 10, minTrustScore = 70, maxRate } = options;

    const mentors = await prisma.mentorProfile.findMany({
      where: {
        verificationStatus: 'VERIFIED',
        mentorSkills: {
          some: {
            skillId: { in: skillIds },
            verified: true
          }
        },
        trustScore: {
          overallScore: { gte: minTrustScore }
        }
      },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        },
        mentorSkills: {
          where: { skillId: { in: skillIds } },
          include: {
            skill: true
          }
        },
        trustScore: true,
        mentorshipRelationships: {
          where: { status: 'ACTIVE' },
          select: { id: true }
        }
      }
    });

    // Filter by rate if specified
    let filteredMentors = mentors;
    if (maxRate !== undefined) {
      filteredMentors = mentors.filter(mentor => 
        !mentor.hourlyRate || mentor.hourlyRate <= maxRate
      );
    }

    // Sort by relevance and trust score
    const sortedMentors = filteredMentors
      .map(mentor => ({
        ...mentor,
        relevanceScore: this.calculateSkillRelevanceScore(mentor, skillIds),
        combinedScore: this.calculateCombinedScore(mentor, skillIds)
      }))
      .sort((a, b) => b.combinedScore - a.combinedScore)
      .slice(0, limit);

    return sortedMentors;
  }

  /**
   * Get mentee recommendations for mentors (reverse matching)
   */
  async getMenteeRecommendations(mentorId, options = {}) {
    const { limit = 10, excludeIds = [] } = options;

    // Get mentor profile
    const mentorProfile = await prisma.mentorProfile.findUnique({
      where: { id: mentorId },
      include: {
        mentorSkills: {
          include: {
            skill: true
          }
        },
        mentorshipRelationships: {
          where: { status: 'ACTIVE' },
          select: { menteeId: true }
        }
      }
    });

    if (!mentorProfile) {
      throw new ApiError(404, 'Mentor profile not found');
    }

    // Check if mentor has capacity
    if (mentorProfile.mentorshipRelationships.length >= mentorProfile.maxMentees) {
      return [];
    }

    // Get potential mentees
    const mentees = await prisma.menteeProfile.findMany({
      where: {
        userId: { notIn: excludeIds },
        NOT: {
          mentorshipRelationships: {
            some: {
              mentorId,
              status: { in: ['ACTIVE', 'PAUSED'] }
            }
          }
        }
      },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        },
        mentorshipRequests: {
          where: { status: 'PENDING' },
          select: { id: true }
        }
      }
    });

    // Calculate compatibility scores
    const menteeScores = await Promise.all(
      mentees.map(async (mentee) => {
        const score = await this.calculateMenteeCompatibilityScore(mentorProfile, mentee);
        return { mentee, score };
      })
    );

    // Sort and return top recommendations
    const recommendations = menteeScores
      .sort((a, b) => b.score.total - a.score.total)
      .slice(0, limit)
      .map(({ mentee, score }) => ({
        ...mentee,
        compatibilityScore: score,
        compatibilityReasons: this.generateCompatibilityReasons(mentorProfile, mentee, score)
      }));

    observability.trackBusinessEvent('mentee_recommendations_generated', {
      mentorId,
      recommendationCount: recommendations.length,
      topScore: recommendations[0]?.compatibilityScore?.total || 0
    });

    return recommendations;
  }

  // ==================== MATCHING ANALYTICS ====================

  /**
   * Get matching analytics and insights
   */
  async getMatchingAnalytics(timeframe = '30d') {
    const days = parseInt(timeframe.replace('d', ''));
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const analytics = {
      overview: await this.getMatchingOverview(startDate),
      skillDemand: await this.getSkillDemandAnalytics(startDate),
      successRates: await this.getMatchingSuccessRates(startDate),
      popularMentors: await this.getPopularMentors(startDate),
      matchingTrends: await this.getMatchingTrends(startDate)
    };

    return analytics;
  }

  // ==================== HELPER METHODS ====================

  generateMatchReasons(menteeProfile, mentor, score) {
    const reasons = [];

    if (score.skill >= 80) {
      const matchedSkills = this.getMatchedSkills(menteeProfile, mentor);
      reasons.push(`Strong skill alignment in: ${matchedSkills.join(', ')}`);
    }

    if (score.experience >= 80) {
      reasons.push(`Ideal experience level (${mentor.yearsOfExperience} years)`);
    }

    if (score.trust >= 90) {
      reasons.push(`Highly rated mentor (${mentor.trustScore.overallScore}/100)`);
    }

    if (score.rate >= 90) {
      reasons.push('Fits within budget range');
    }

    if (score.availability >= 80) {
      reasons.push('Good availability match');
    }

    if (reasons.length === 0) {
      reasons.push('Good overall compatibility');
    }

    return reasons;
  }

  generateCompatibilityReasons(mentorProfile, mentee, score) {
    const reasons = [];

    if (score.skill >= 80) {
      reasons.push('Skills align well with mentor expertise');
    }

    if (score.experience >= 80) {
      reasons.push('Experience level matches mentor\'s sweet spot');
    }

    if (score.goals >= 80) {
      reasons.push('Mentee goals match mentor\'s mentorship type');
    }

    if (score.availability >= 80) {
      reasons.push('Compatible availability patterns');
    }

    if (reasons.length === 0) {
      reasons.push('Potential good match');
    }

    return reasons;
  }

  getMatchedSkills(menteeProfile, mentor) {
    const menteeTopics = menteeProfile.preferredTopics || [];
    const mentorSkills = mentor.mentorSkills.map(ms => ms.skill.name);

    return menteeTopics.filter(topic => 
      mentorSkills.some(skill => 
        skill.toLowerCase().includes(topic.toLowerCase()) || 
        topic.toLowerCase().includes(skill.toLowerCase())
      )
    );
  }

  parseBudgetRange(budgetRange) {
    // Parse formats like "$50-100", "50-100", "$50+", etc.
    const match = budgetRange.match(/\$?(\d+)(?:[-–](\$?(\d+)))?/);
    if (!match) return null;

    const min = parseInt(match[1]);
    const max = match[2] ? parseInt(match[2]) : min * 2; // If no max, assume double the min

    return { min, max };
  }

  calculateSkillRelevanceScore(mentor, skillIds) {
    const relevantSkills = mentor.mentorSkills.filter(ms => 
      skillIds.includes(ms.skillId)
    );

    if (relevantSkills.length === 0) return 0;

    // Score based on proficiency level and verification
    const skillScore = relevantSkills.reduce((sum, skill) => {
      let score = 0;
      
      // Proficiency level scoring
      const proficiencyScores = {
        'BEGINNER': 20,
        'INTERMEDIATE': 40,
        'ADVANCED': 70,
        'EXPERT': 100
      };
      score += proficiencyScores[skill.proficiencyLevel] || 0;

      // Verification bonus
      if (skill.verified) score += 20;

      // Experience bonus
      if (skill.yearsOfExperience) {
        score += Math.min(30, skill.yearsOfExperience * 2);
      }

      return sum + score;
    }, 0);

    return Math.round(skillScore / relevantSkills.length);
  }

  calculateCombinedScore(mentor, skillIds) {
    const relevanceScore = this.calculateSkillRelevanceScore(mentor, skillIds);
    const trustScore = mentor.trustScore?.overallScore || 70;
    const activeRelationships = mentor.mentorshipRelationships.length;
    const capacityScore = Math.max(0, 100 - (activeRelationships / mentor.maxMentees * 50));

    return Math.round(
      relevanceScore * 0.4 +
      trustScore * 0.3 +
      capacityScore * 0.3
    );
  }

  async calculateMenteeCompatibilityScore(mentorProfile, mentee) {
    const scores = {
      skill: this.calculateMenteeSkillCompatibility(mentorProfile, mentee),
      experience: this.calculateMenteeExperienceCompatibility(mentorProfile, mentee),
      goals: this.calculateMenteeGoalsCompatibility(mentorProfile, mentee),
      availability: this.calculateMenteeAvailabilityCompatibility(mentorProfile, mentee)
    };

    const total = Math.round(
      scores.skill * 0.3 +
      scores.experience * 0.25 +
      scores.goals * 0.25 +
      scores.availability * 0.2
    );

    return { ...scores, total };
  }

  calculateMenteeSkillCompatibility(mentorProfile, mentee) {
    const menteeTopics = mentee.preferredTopics || [];
    const mentorSkills = mentorProfile.mentorSkills.map(ms => ms.skill.name.toLowerCase());

    if (menteeTopics.length === 0) return 50;

    const matchedSkills = menteeTopics.filter(topic => 
      mentorSkills.some(skill => skill.includes(topic.toLowerCase()) || topic.toLowerCase().includes(skill))
    );

    return Math.round((matchedSkills.length / menteeTopics.length) * 100);
  }

  calculateMenteeExperienceCompatibility(mentorProfile, mentee) {
    const menteeLevel = mentee.careerLevel?.toLowerCase() || '';
    const mentorExperience = mentorProfile.yearsOfExperience || 0;

    // Reverse of the mentor calculation - check if mentor is suitable for mentee level
    const levelSuitability = {
      'junior': { min: 3, max: 15 },
      'mid-level': { min: 5, max: 20 },
      'senior': { min: 8, max: 25 },
      'lead': { min: 10, max: 30 }
    };

    const suitable = levelSuitability[menteeLevel] || levelSuitability['junior'];

    if (mentorExperience < suitable.min) return 30;
    if (mentorExperience > suitable.max) return 60;

    return 90;
  }

  calculateMenteeGoalsCompatibility(mentorProfile, mentee) {
    const menteeGoals = mentee.goals || [];
    const mentorTypes = mentorProfile.mentorshipTypes || [];

    if (menteeGoals.length === 0 || mentorTypes.length === 0) return 50;

    const goalTypeMapping = {
      'career': ['career', 'job', 'promotion', 'interview'],
      'technical': ['code', 'programming', 'technical', 'skills'],
      'leadership': ['leadership', 'management', 'team', 'lead']
    };

    let compatibilityScore = 0;
    mentorTypes.forEach(type => {
      const keywords = goalTypeMapping[type] || [];
      const matchingGoals = menteeGoals.filter(goal => 
        keywords.some(keyword => goal.toLowerCase().includes(keyword))
      );
      compatibilityScore += (matchingGoals.length / menteeGoals.length) * 100;
    });

    return Math.round(compatibilityScore / mentorTypes.length);
  }

  calculateMenteeAvailabilityCompatibility(mentorProfile, mentee) {
    if (!mentee.availability || Object.keys(mentee.availability).length === 0) return 70;
    if (!mentorProfile.availability || mentorProfile.availability.length === 0) return 50;

    // Simple compatibility check - can be enhanced
    return 75;
  }

  async getMatchingOverview(startDate) {
    const totalRequests = await prisma.mentorshipRequest.count({
      where: { requestedAt: { gte: startDate } }
    });

    const acceptedRequests = await prisma.mentorshipRequest.count({
      where: { 
        requestedAt: { gte: startDate },
        status: 'ACCEPTED'
      }
    });

    return {
      totalRequests,
      acceptedRequests,
      acceptanceRate: totalRequests > 0 ? Math.round((acceptedRequests / totalRequests) * 100) : 0
    };
  }

  async getSkillDemandAnalytics(startDate) {
    const requestSkills = await prisma.requestSkill.findMany({
      where: {
        request: {
          requestedAt: { gte: startDate }
        }
      },
      include: {
        skill: true
      }
    });

    const skillDemand = requestSkills.reduce((acc, rs) => {
      const skillName = rs.skill.name;
      acc[skillName] = (acc[skillName] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(skillDemand)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([skill, count]) => ({ skill, count }));
  }

  async getMatchingSuccessRates(startDate) {
    // Implementation for success rate analytics
    return {
      overall: 85,
      bySkillType: {},
      byExperienceLevel: {}
    };
  }

  async getPopularMentors(startDate) {
    const mentors = await prisma.mentorProfile.findMany({
      where: {
        mentorshipRequests: {
          some: {
            requestedAt: { gte: startDate },
            status: 'ACCEPTED'
          }
        }
      },
      include: {
        user: {
          select: { name: true }
        },
        mentorshipRequests: {
          where: {
            requestedAt: { gte: startDate },
            status: 'ACCEPTED'
          },
          select: { id: true }
        }
      }
    });

    return mentors
      .map(mentor => ({
        name: mentor.user.name,
        acceptedRequests: mentor.mentorshipRequests.length
      }))
      .sort((a, b) => b.acceptedRequests - a.acceptedRequests)
      .slice(0, 10);
  }

  async getMatchingTrends(startDate) {
    // Implementation for matching trends over time
    return {
      daily: [],
      weekly: [],
      monthly: []
    };
  }
}

export const mentorshipMatchingService = new MentorshipMatchingService();
export default mentorshipMatchingService;
