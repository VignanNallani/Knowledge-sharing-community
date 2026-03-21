const { PrismaClient } = require('@prisma/client');
const NodeCache = require('node-cache');
const logger = require('../utils/logger.util');

const prisma = new PrismaClient();
const searchCache = new NodeCache({ stdTTL: 300 }); // 5 minutes cache

class SearchService {
  async searchPosts(query, filters = {}, pagination = {}) {
    try {
      const {
        skills,
        authorId,
        dateRange,
        sortBy = 'relevance'
      } = filters;
      
      const {
        page = 1,
        limit = 20,
        offset = (page - 1) * limit
      } = pagination;

      // Create cache key
      const cacheKey = `posts:${JSON.stringify({ query, filters, pagination })}`;
      
      // Check cache first
      const cached = searchCache.get(cacheKey);
      if (cached) {
        return cached;
      }

      // Build search conditions
      let whereClause = {
        deletedAt: null,
        isActive: true
      };

      // Full-text search
      if (query && query.trim()) {
        const searchQuery = query.trim();
        whereClause.search_vector = {
          search: searchQuery,
          language: 'english'
        };
      }

      // Apply filters
      if (authorId) {
        whereClause.authorId = parseInt(authorId);
      }

      if (dateRange) {
        const { start, end } = dateRange;
        if (start) whereClause.createdAt = { ...whereClause.createdAt, gte: new Date(start) };
        if (end) whereClause.createdAt = { ...whereClause.createdAt, lte: new Date(end) };
      }

      // Skills filtering through post tags
      if (skills && skills.length > 0) {
        whereClause.tags = {
          some: {
            tag: {
              name: {
                in: skills
              }
            }
          }
        };
      }

      // Build order by clause
      let orderBy = {};
      switch (sortBy) {
        case 'newest':
          orderBy = { createdAt: 'desc' };
          break;
        case 'oldest':
          orderBy = { createdAt: 'asc' };
          break;
        case 'most_liked':
          orderBy = { likes: { _count: 'desc' } };
          break;
        case 'most_commented':
          orderBy = { comments: { _count: 'desc' } };
          break;
        case 'relevance':
        default:
          if (query && query.trim()) {
            orderBy = {
              _relevance: {
                fields: ['search_vector'],
                search: query.trim(),
                sort: 'desc'
              }
            };
          } else {
            orderBy = { createdAt: 'desc' };
          }
      }

      // Execute search with pagination
      const [posts, total] = await Promise.all([
        prisma.post.findMany({
          where: whereClause,
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
                profileImage: true,
                skills: true
              }
            },
            tags: {
              include: {
                tag: true
              }
            },
            _count: {
              select: {
                likes: true,
                comments: true
              }
            }
          },
          orderBy,
          skip: offset,
          take: limit
        }),
        prisma.post.count({ where: whereClause })
      ]);

      // Format results
      const formattedPosts = posts.map(post => ({
        ...post,
        relevanceScore: query ? this.calculateRelevanceScore(post, query) : null,
        tags: post.tags.map(pt => pt.tag)
      }));

      const result = {
        posts: formattedPosts,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          hasNext: offset + limit < total,
          hasPrev: page > 1
        },
        filters: {
          query,
          skills,
          authorId,
          dateRange,
          sortBy
        }
      };

      // Cache the result
      searchCache.set(cacheKey, result);

      // Log search analytics
      await this.logSearchAnalytics(query, 'posts', filters, total);

      return result;
    } catch (error) {
      logger.error('Error searching posts:', error);
      throw new Error(`Failed to search posts: ${error.message}`);
    }
  }

  async searchUsers(query, filters = {}, pagination = {}) {
    try {
      const {
        skills,
        role,
        availability
      } = filters;
      
      const {
        page = 1,
        limit = 20,
        offset = (page - 1) * limit
      } = pagination;

      // Create cache key
      const cacheKey = `users:${JSON.stringify({ query, filters, pagination })}`;
      
      // Check cache first
      const cached = searchCache.get(cacheKey);
      if (cached) {
        return cached;
      }

      // Build search conditions
      let whereClause = {
        isActive: true
      };

      // Full-text search
      if (query && query.trim()) {
        const searchQuery = query.trim();
        whereClause.search_vector = {
          search: searchQuery,
          language: 'english'
        };
      }

      // Apply filters
      if (role) {
        whereClause.role = role;
      }

      if (skills && skills.length > 0) {
        whereClause.skills = {
          contains: skills.join(' ')
        };
      }

      // Availability filter for mentors
      if (availability === 'available' && role === 'MENTOR') {
        whereClause.mentorAvailability = {
          some: {
            isActive: true
          }
        };
      }

      // Execute search with pagination
      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where: whereClause,
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            bio: true,
            skills: true,
            profileImage: true,
            createdAt: true,
            _count: {
              select: {
                posts: true,
                followers: true,
                mentorshipsAsMentor: true,
                mentorshipsAsMentee: true
              }
            }
          },
          orderBy: query ? {
            _relevance: {
              fields: ['search_vector'],
              search: query.trim(),
              sort: 'desc'
            }
          } : { createdAt: 'desc' },
          skip: offset,
          take: limit
        }),
        prisma.user.count({ where: whereClause })
      ]);

      // Format results
      const formattedUsers = users.map(user => ({
        ...user,
        relevanceScore: query ? this.calculateRelevanceScore(user, query) : null
      }));

      const result = {
        users: formattedUsers,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          hasNext: offset + limit < total,
          hasPrev: page > 1
        },
        filters: {
          query,
          skills,
          role,
          availability
        }
      };

      // Cache the result
      searchCache.set(cacheKey, result);

      // Log search analytics
      await this.logSearchAnalytics(query, 'users', filters, total);

      return result;
    } catch (error) {
      logger.error('Error searching users:', error);
      throw new Error(`Failed to search users: ${error.message}`);
    }
  }

  async searchMentors(query, filters = {}, pagination = {}) {
    try {
      const {
        skills,
        availability,
        minRating,
        maxRating
      } = filters;
      
      const {
        page = 1,
        limit = 20,
        offset = (page - 1) * limit
      } = pagination;

      // Create cache key
      const cacheKey = `mentors:${JSON.stringify({ query, filters, pagination })}`;
      
      // Check cache first
      const cached = searchCache.get(cacheKey);
      if (cached) {
        return cached;
      }

      // Build search conditions
      let whereClause = {
        role: 'MENTOR',
        isActive: true
      };

      // Full-text search
      if (query && query.trim()) {
        const searchQuery = query.trim();
        whereClause.search_vector = {
          search: searchQuery,
          language: 'english'
        };
      }

      // Apply filters
      if (skills && skills.length > 0) {
        whereClause.skills = {
          contains: skills.join(' ')
        };
      }

      // Availability filter
      if (availability === 'available') {
        whereClause.mentorAvailability = {
          some: {
            isActive: true
          }
        };
      }

      // Rating filter
      if (minRating || maxRating) {
        whereClause.mentorFeedback = {
          some: {
            rating: {
              gte: minRating || 1,
              lte: maxRating || 5
            }
          }
        };
      }

      // Execute search with pagination
      const [mentors, total] = await Promise.all([
        prisma.user.findMany({
          where: whereClause,
          select: {
            id: true,
            name: true,
            email: true,
            bio: true,
            skills: true,
            profileImage: true,
            createdAt: true,
            mentorAvailability: {
              where: { isActive: true },
              select: {
                dayOfWeek: true,
                startTime: true,
                endTime: true,
                timezone: true
              }
            },
            mentorFeedback: {
              select: {
                rating: true
              }
            },
            _count: {
              select: {
                mentorshipsAsMentor: true,
                followers: true
              }
            }
          },
          orderBy: query ? {
            _relevance: {
              fields: ['search_vector'],
              search: query.trim(),
              sort: 'desc'
            }
          } : { createdAt: 'desc' },
          skip: offset,
          take: limit
        }),
        prisma.user.count({ where: whereClause })
      ]);

      // Format results with rating calculations
      const formattedMentors = mentors.map(mentor => {
        const ratings = mentor.mentorFeedback.map(f => f.rating);
        const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
        
        return {
          ...mentor,
          relevanceScore: query ? this.calculateRelevanceScore(mentor, query) : null,
          averageRating: parseFloat(avgRating.toFixed(2)),
          totalSessions: mentor._count.mentorshipsAsMentor,
          totalFollowers: mentor._count.followers,
          availabilitySlots: mentor.mentorAvailability.length
        };
      });

      const result = {
        mentors: formattedMentors,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          hasNext: offset + limit < total,
          hasPrev: page > 1
        },
        filters: {
          query,
          skills,
          availability,
          minRating,
          maxRating
        }
      };

      // Cache the result
      searchCache.set(cacheKey, result);

      // Log search analytics
      await this.logSearchAnalytics(query, 'mentors', filters, total);

      return result;
    } catch (error) {
      logger.error('Error searching mentors:', error);
      throw new Error(`Failed to search mentors: ${error.message}`);
    }
  }

  async getAutocompleteSuggestions(query, searchType, limit = 5) {
    try {
      if (!query || query.trim().length < 2) {
        return [];
      }

      const cacheKey = `autocomplete:${searchType}:${query}:${limit}`;
      const cached = searchCache.get(cacheKey);
      if (cached) {
        return cached;
      }

      let suggestions = [];

      switch (searchType) {
        case 'posts':
          suggestions = await this.getPostSuggestions(query, limit);
          break;
        case 'users':
          suggestions = await this.getUserSuggestions(query, limit);
          break;
        case 'mentors':
          suggestions = await this.getMentorSuggestions(query, limit);
          break;
        default:
          suggestions = await this.getGeneralSuggestions(query, limit);
      }

      searchCache.set(cacheKey, suggestions);
      return suggestions;
    } catch (error) {
      logger.error('Error getting autocomplete suggestions:', error);
      return [];
    }
  }

  async getPostSuggestions(query, limit) {
    const posts = await prisma.post.findMany({
      where: {
        deletedAt: null,
        OR: [
          {
            title: {
              contains: query,
              mode: 'insensitive'
            }
          },
          {
            content: {
              contains: query,
              mode: 'insensitive'
            }
          }
        ]
      },
      select: {
        id: true,
        title: true,
        content: true
      },
      take: limit * 2, // Get more to filter
      orderBy: {
        createdAt: 'desc'
      }
    });

    return posts.map(post => ({
      type: 'post',
      id: post.id,
      text: post.title,
      description: post.content.substring(0, 100) + '...',
      highlight: this.highlightText(post.title, query)
    })).slice(0, limit);
  }

  async getUserSuggestions(query, limit) {
    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        OR: [
          {
            name: {
              contains: query,
              mode: 'insensitive'
            }
          },
          {
            skills: {
              contains: query,
              mode: 'insensitive'
            }
          }
        ]
      },
      select: {
        id: true,
        name: true,
        skills: true,
        role: true
      },
      take: limit,
      orderBy: {
        name: 'asc'
      }
    });

    return users.map(user => ({
      type: 'user',
      id: user.id,
      text: user.name,
      description: user.skills || user.role,
      highlight: this.highlightText(user.name, query)
    }));
  }

  async getMentorSuggestions(query, limit) {
    const mentors = await prisma.user.findMany({
      where: {
        role: 'MENTOR',
        isActive: true,
        OR: [
          {
            name: {
              contains: query,
              mode: 'insensitive'
            }
          },
          {
            skills: {
              contains: query,
              mode: 'insensitive'
            }
          },
          {
            bio: {
              contains: query,
              mode: 'insensitive'
            }
          }
        ]
      },
      select: {
        id: true,
        name: true,
        skills: true,
        bio: true
      },
      take: limit,
      orderBy: {
        name: 'asc'
      }
    });

    return mentors.map(mentor => ({
      type: 'mentor',
      id: mentor.id,
      text: mentor.name,
      description: mentor.skills || mentor.bio,
      highlight: this.highlightText(mentor.name, query)
    }));
  }

  async getGeneralSuggestions(query, limit) {
    const [posts, users] = await Promise.all([
      this.getPostSuggestions(query, Math.ceil(limit / 2)),
      this.getUserSuggestions(query, Math.ceil(limit / 2))
    ]);

    return [...posts, ...users].slice(0, limit);
  }

  async getTrendingPosts(limit = 10) {
    try {
      const cacheKey = `trending:posts:${limit}`;
      const cached = searchCache.get(cacheKey);
      if (cached) {
        return cached;
      }

      // Calculate trending posts based on recent activity
      const posts = await prisma.post.findMany({
        where: {
          deletedAt: null,
          isActive: true,
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
          }
        },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              profileImage: true
            }
          },
          tags: {
            include: {
              tag: true
            }
          },
          _count: {
            select: {
              likes: true,
              comments: true
            }
          }
        },
        orderBy: [
          { likes: { _count: 'desc' } },
          { comments: { _count: 'desc' } },
          { createdAt: 'desc' }
        ],
        take: limit
      });

      // Calculate trending scores
      const trendingPosts = posts.map(post => {
        const hoursSinceCreation = (Date.now() - post.createdAt.getTime()) / (1000 * 60 * 60);
        const score = this.calculateTrendingScore(
          post._count.likes,
          post._count.comments,
          hoursSinceCreation
        );

        return {
          ...post,
          trendingScore: score,
          tags: post.tags.map(pt => pt.tag)
        };
      }).sort((a, b) => b.trendingScore - a.trendingScore);

      searchCache.set(cacheKey, trendingPosts);
      return trendingPosts;
    } catch (error) {
      logger.error('Error getting trending posts:', error);
      throw new Error(`Failed to get trending posts: ${error.message}`);
    }
  }

  async getRecommendedMentors(userId, limit = 10) {
    try {
      const cacheKey = `recommended:mentors:${userId}:${limit}`;
      const cached = searchCache.get(cacheKey);
      if (cached) {
        return cached;
      }

      // Get user's skills and interests
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          skills: true,
          role: true
        }
      });

      if (!user) {
        return [];
      }

      // Find mentors with similar skills or complementary skills
      const mentors = await prisma.user.findMany({
        where: {
          role: 'MENTOR',
          isActive: true,
          id: { not: userId },
          OR: [
            {
              skills: {
                contains: user.skills
              }
            }
          ]
        },
        include: {
          mentorFeedback: {
            select: {
              rating: true
            }
          },
          _count: {
            select: {
              mentorshipsAsMentor: true,
              followers: true
            }
          }
        },
        take: limit * 2, // Get more to rank
        orderBy: {
          mentorshipsAsMentor: {
            _count: 'desc'
          }
        }
      });

      // Calculate recommendation scores
      const recommendedMentors = mentors.map(mentor => {
        const ratings = mentor.mentorFeedback.map(f => f.rating);
        const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
        
        // Calculate skill match score
        const skillMatch = this.calculateSkillMatch(user.skills, mentor.skills);
        
        // Calculate overall recommendation score
        const recommendationScore = (
          skillMatch * 0.4 +
          (avgRating / 5) * 0.3 +
          Math.min(mentor._count.mentorshipsAsMentor / 50, 1) * 0.3
        );

        return {
          ...mentor,
          averageRating: parseFloat(avgRating.toFixed(2)),
          skillMatch: parseFloat(skillMatch.toFixed(2)),
          recommendationScore: parseFloat(recommendationScore.toFixed(2))
        };
      }).sort((a, b) => b.recommendationScore - a.recommendationScore).slice(0, limit);

      searchCache.set(cacheKey, recommendedMentors);
      return recommendedMentors;
    } catch (error) {
      logger.error('Error getting recommended mentors:', error);
      throw new Error(`Failed to get recommended mentors: ${error.message}`);
    }
  }

  calculateRelevanceScore(item, query) {
    if (!query || !query.trim()) return 0;

    const searchText = query.trim().toLowerCase();
    let score = 0;

    // Check title/name match
    if (item.title) {
      const title = item.title.toLowerCase();
      if (title === searchText) score += 100;
      else if (title.includes(searchText)) score += 50;
    }

    if (item.name) {
      const name = item.name.toLowerCase();
      if (name === searchText) score += 100;
      else if (name.includes(searchText)) score += 50;
    }

    // Check content/bio match
    if (item.content) {
      const content = item.content.toLowerCase();
      if (content.includes(searchText)) score += 25;
    }

    if (item.bio) {
      const bio = item.bio.toLowerCase();
      if (bio.includes(searchText)) score += 25;
    }

    // Check skills match
    if (item.skills) {
      const skills = item.skills.toLowerCase();
      if (skills.includes(searchText)) score += 30;
    }

    return score;
  }

  calculateTrendingScore(likes, comments, hoursSinceCreation) {
    const baseScore = (likes * 2) + (comments * 3);
    
    // Time decay: newer posts get higher scores
    let timeDecay;
    if (hoursSinceCreation < 1) {
      timeDecay = 1.0;
    } else if (hoursSinceCreation < 24) {
      timeDecay = 0.8;
    } else if (hoursSinceCreation < 168) { // 1 week
      timeDecay = 0.6;
    } else {
      timeDecay = 0.4;
    }

    return baseScore * timeDecay;
  }

  calculateSkillMatch(userSkills, mentorSkills) {
    if (!userSkills || !mentorSkills) return 0;

    const userSkillArray = userSkills.split(',').map(s => s.trim().toLowerCase());
    const mentorSkillArray = mentorSkills.split(',').map(s => s.trim().toLowerCase());

    const commonSkills = userSkillArray.filter(skill => 
      mentorSkillArray.includes(skill)
    );

    return commonSkills.length / Math.max(userSkillArray.length, 1);
  }

  highlightText(text, query) {
    if (!text || !query) return text;

    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }

  async logSearchAnalytics(query, searchType, filters, resultsCount) {
    try {
      await prisma.searchAnalytics.create({
        data: {
          query: query || '',
          searchType,
          resultsCount,
          filters: filters || {}
        }
      });
    } catch (error) {
      // Don't throw error for analytics logging
      logger.error('Error logging search analytics:', error);
    }
  }

  clearCache(pattern = null) {
    if (pattern) {
      const keys = searchCache.keys().filter(key => key.includes(pattern));
      keys.forEach(key => searchCache.del(key));
    } else {
      searchCache.flushAll();
    }
  }

  getCacheStats() {
    return {
      keys: searchCache.keys().length,
      stats: searchCache.getStats()
    };
  }
}

module.exports = new SearchService();
