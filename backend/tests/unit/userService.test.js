const { PrismaClient } = require('@prisma/client');
const userService = require('../../src/services/userService');

// Mock Prisma Client
jest.mock('@prisma/client');
jest.mock('../../src/utils/logger.util');

describe('UserService', () => {
  let mockPrisma;
  let mockGlobalIO;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockPrisma = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn()
      },
      follow: {
        findUnique: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn()
      },
      bookmark: {
        findUnique: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn()
      },
      userActivity: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn()
      },
      post: {
        findUnique: jest.fn(),
        count: jest.fn()
      },
      mentorshipSession: {
        findUnique: jest.fn(),
        count: jest.fn()
      },
      like: {
        count: jest.fn()
      },
      comment: {
        count: jest.fn()
      }
    };

    mockGlobalIO = {
      emit: jest.fn(),
      to: jest.fn(() => mockGlobalIO)
    };

    global.io = mockGlobalIO;
    PrismaClient.mockImplementation(() => mockPrisma);
  });

  describe('getUserProfile', () => {
    it('should return user profile with stats', async () => {
      const userId = 1;
      const viewerId = 2;
      
      const mockUser = {
        id: userId,
        name: 'John Doe',
        email: 'john@example.com',
        bio: 'Software Developer',
        profileImage: 'https://example.com/avatar.jpg',
        skills: ['JavaScript', 'React'],
        socialLinks: { github: 'https://github.com/johndoe' },
        role: 'USER',
        isActive: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-15'),
        _count: {
          followers: 10,
          following: 5,
          posts: 20,
          mentorshipsAsMentor: 15,
          mentorshipsAsMentee: 3,
          bookmarks: 8
        },
        mentorshipsAsMentor: [],
        posts: [],
        achievements: []
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.follow.findUnique.mockResolvedValue(null);

      const result = await userService.getUserProfile(userId, viewerId);

      expect(result).toEqual({
        id: userId,
        name: 'John Doe',
        email: null, // Should not show email to non-owner
        bio: 'Software Developer',
        profileImage: 'https://example.com/avatar.jpg',
        skills: ['JavaScript', 'React'],
        socialLinks: { github: 'https://github.com/johndoe' },
        role: 'USER',
        isActive: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-15'),
        stats: {
          followers: 10,
          following: 5,
          posts: 20,
          mentorshipsAsMentor: 15,
          mentorshipsAsMentee: 3,
          bookmarks: 8
        },
        recentSessions: [],
        recentPosts: [],
        achievements: [],
        isFollowing: false,
        isOwnProfile: false
      });
    });

    it('should show email to profile owner', async () => {
      const userId = 1;
      const viewerId = 1;
      
      const mockUser = {
        id: userId,
        name: 'John Doe',
        email: 'john@example.com',
        _count: { followers: 0, following: 0, posts: 0, mentorshipsAsMentor: 0, mentorshipsAsMentee: 0, bookmarks: 0 },
        mentorshipsAsMentor: [],
        posts: [],
        achievements: []
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.follow.findUnique.mockResolvedValue(null);

      const result = await userService.getUserProfile(userId, viewerId);

      expect(result.email).toBe('john@example.com');
      expect(result.isOwnProfile).toBe(true);
    });

    it('should throw error if user not found', async () => {
      const userId = 999;
      
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(userService.getUserProfile(userId))
        .rejects.toThrow('User not found');
    });

    it('should check follow status correctly', async () => {
      const userId = 1;
      const viewerId = 2;
      
      const mockUser = {
        id: userId,
        name: 'John Doe',
        _count: { followers: 0, following: 0, posts: 0, mentorshipsAsMentor: 0, mentorshipsAsMentee: 0, bookmarks: 0 },
        mentorshipsAsMentor: [],
        posts: [],
        achievements: []
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.follow.findUnique.mockResolvedValue({ id: 1 });

      const result = await userService.getUserProfile(userId, viewerId);

      expect(result.isFollowing).toBe(true);
    });
  });

  describe('updateUserProfile', () => {
    it('should update user profile successfully', async () => {
      const userId = 1;
      const profileData = {
        name: 'Jane Doe',
        bio: 'Updated bio',
        skills: ['JavaScript', 'Node.js']
      };

      const updatedUser = {
        id: userId,
        name: 'Jane Doe',
        bio: 'Updated bio',
        skills: ['JavaScript', 'Node.js'],
        role: 'USER',
        isActive: true,
        updatedAt: new Date()
      };

      mockPrisma.user.update.mockResolvedValue(updatedUser);

      const result = await userService.updateUserProfile(userId, profileData);

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: {
          name: 'Jane Doe',
          bio: 'Updated bio',
          skills: ['JavaScript', 'Node.js']
        },
        select: {
          id: true,
          name: true,
          bio: true,
          profileImage: true,
          skills: true,
          socialLinks: true,
          role: true,
          isActive: true,
          updatedAt: true
        }
      });

      expect(result).toEqual(updatedUser);
      expect(mockGlobalIO.emit).toHaveBeenCalledWith('profile_updated', {
        userId,
        profile: updatedUser,
        timestamp: expect.any(Date)
      });
    });
  });

  describe('followUser', () => {
    it('should follow user successfully', async () => {
      const followerId = 1;
      const followingId = 2;
      
      const mockFollower = { id: followerId, name: 'John Doe' };
      const mockFollowing = { id: followingId, name: 'Jane Smith' };
      const mockFollow = {
        id: 1,
        followerId,
        followingId,
        follower: mockFollower,
        following: mockFollowing,
        createdAt: new Date()
      };

      mockPrisma.user.findUnique
        .mockResolvedValueOnce(mockFollower)
        .mockResolvedValueOnce(mockFollowing);
      mockPrisma.follow.findUnique.mockResolvedValue(null);
      mockPrisma.follow.create.mockResolvedValue(mockFollow);
      mockPrisma.userActivity.create.mockResolvedValue({ id: 1 });

      const result = await userService.followUser(followerId, followingId);

      expect(mockPrisma.follow.create).toHaveBeenCalledWith({
        data: {
          followerId,
          followingId
        },
        include: {
          follower: {
            select: {
              id: true,
              name: true,
              profileImage: true
            }
          },
          following: {
            select: {
              id: true,
              name: true,
              profileImage: true
            }
          }
        }
      });

      expect(result).toEqual(mockFollow);
      expect(mockGlobalIO.emit).toHaveBeenCalledWith('new_follower', {
        follower: mockFollower,
        following: mockFollowing,
        timestamp: expect.any(Date)
      });
    });

    it('should throw error if following self', async () => {
      const userId = 1;
      
      const mockUser = { id: userId, name: 'John Doe' };
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockUser);

      await expect(userService.followUser(userId, userId))
        .rejects.toThrow('Cannot follow yourself');
    });

    it('should throw error if already following', async () => {
      const followerId = 1;
      const followingId = 2;
      
      const mockFollower = { id: followerId, name: 'John Doe' };
      const mockFollowing = { id: followingId, name: 'Jane Smith' };
      const existingFollow = { id: 1 };

      mockPrisma.user.findUnique
        .mockResolvedValueOnce(mockFollower)
        .mockResolvedValueOnce(mockFollowing);
      mockPrisma.follow.findUnique.mockResolvedValue(existingFollow);

      await expect(userService.followUser(followerId, followingId))
        .rejects.toThrow('Already following this user');
    });
  });

  describe('unfollowUser', () => {
    it('should unfollow user successfully', async () => {
      const followerId = 1;
      const followingId = 2;
      
      const existingFollow = { id: 1 };

      mockPrisma.follow.findUnique.mockResolvedValue(existingFollow);
      mockPrisma.follow.delete.mockResolvedValue({ count: 1 });

      const result = await userService.unfollowUser(followerId, followingId);

      expect(mockPrisma.follow.delete).toHaveBeenCalledWith({
        where: {
          followerId_followingId: {
            followerId,
            followingId
          }
        }
      });

      expect(result).toEqual({ message: 'Successfully unfollowed user' });
      expect(mockGlobalIO.emit).toHaveBeenCalledWith('follow_update', {
        type: 'unfollow',
        data: {
          followerId,
          followingId
        },
        timestamp: expect.any(Date)
      });
    });

    it('should throw error if not following', async () => {
      const followerId = 1;
      const followingId = 2;
      
      mockPrisma.follow.findUnique.mockResolvedValue(null);

      await expect(userService.unfollowUser(followerId, followingId))
        .rejects.toThrow('Not following this user');
    });
  });

  describe('addBookmark', () => {
    it('should add bookmark successfully', async () => {
      const userId = 1;
      const entityType = 'post';
      const entityId = 123;
      const title = 'Test Post';
      const description = 'Test Description';
      
      const mockBookmark = {
        id: 1,
        userId,
        entityType,
        entityId,
        title,
        description,
        createdAt: new Date()
      };

      mockPrisma.bookmark.findUnique.mockResolvedValue(null);
      mockPrisma.bookmark.create.mockResolvedValue(mockBookmark);
      mockPrisma.userActivity.create.mockResolvedValue({ id: 1 });

      const result = await userService.addBookmark(userId, entityType, entityId, title, description);

      expect(mockPrisma.bookmark.create).toHaveBeenCalledWith({
        data: {
          userId,
          entityType,
          entityId,
          title,
          description
        },
        include: {
          entity: true
        }
      });

      expect(result).toEqual(mockBookmark);
      expect(mockGlobalIO.emit).toHaveBeenCalledWith('bookmark_added', {
        bookmark: mockBookmark,
        timestamp: expect.any(Date)
      });
    });

    it('should throw error if already bookmarked', async () => {
      const userId = 1;
      const entityType = 'post';
      const entityId = 123;
      
      const existingBookmark = { id: 1 };
      mockPrisma.bookmark.findUnique.mockResolvedValue(existingBookmark);

      await expect(userService.addBookmark(userId, entityType, entityId))
        .rejects.toThrow('Already bookmarked');
    });
  });

  describe('removeBookmark', () => {
    it('should remove bookmark successfully', async () => {
      const userId = 1;
      const entityType = 'post';
      const entityId = 123;
      
      const existingBookmark = { id: 1 };

      mockPrisma.bookmark.findUnique.mockResolvedValue(existingBookmark);
      mockPrisma.bookmark.delete.mockResolvedValue({ count: 1 });

      const result = await userService.removeBookmark(userId, entityType, entityId);

      expect(mockPrisma.bookmark.delete).toHaveBeenCalledWith({
        where: {
          userId_entityType_entityId: {
            userId,
            entityType,
            entityId
          }
        }
      });

      expect(result).toEqual({ message: 'Bookmark removed successfully' });
      expect(mockGlobalIO.emit).toHaveBeenCalledWith('bookmark_removed', {
        bookmarkId: existingBookmark.id,
        entityType,
        entityId,
        timestamp: expect.any(Date)
      });
    });

    it('should throw error if bookmark not found', async () => {
      const userId = 1;
      const entityType = 'post';
      const entityId = 123;
      
      mockPrisma.bookmark.findUnique.mockResolvedValue(null);

      await expect(userService.removeBookmark(userId, entityType, entityId))
        .rejects.toThrow('Bookmark not found');
    });
  });

  describe('isFollowingUser', () => {
    it('should return true if following', async () => {
      const followerId = 1;
      const followingId = 2;
      
      const follow = { id: 1 };
      mockPrisma.follow.findUnique.mockResolvedValue(follow);

      const result = await userService.isFollowingUser(followerId, followingId);

      expect(result).toBe(true);
    });

    it('should return false if not following', async () => {
      const followerId = 1;
      const followingId = 2;
      
      mockPrisma.follow.findUnique.mockResolvedValue(null);

      const result = await userService.isFollowingUser(followerId, followingId);

      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      const followerId = 1;
      const followingId = 2;
      
      mockPrisma.follow.findUnique.mockRejectedValue(new Error('Database error'));

      const result = await userService.isFollowingUser(followerId, followingId);

      expect(result).toBe(false);
    });
  });

  describe('isBookmarked', () => {
    it('should return true if bookmarked', async () => {
      const userId = 1;
      const entityType = 'post';
      const entityId = 123;
      
      const bookmark = { id: 1 };
      mockPrisma.bookmark.findUnique.mockResolvedValue(bookmark);

      const result = await userService.isBookmarked(userId, entityType, entityId);

      expect(result).toBe(true);
    });

    it('should return false if not bookmarked', async () => {
      const userId = 1;
      const entityType = 'post';
      const entityId = 123;
      
      mockPrisma.bookmark.findUnique.mockResolvedValue(null);

      const result = await userService.isBookmarked(userId, entityType, entityId);

      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      const userId = 1;
      const entityType = 'post';
      const entityId = 123;
      
      mockPrisma.bookmark.findUnique.mockRejectedValue(new Error('Database error'));

      const result = await userService.isBookmarked(userId, entityType, entityId);

      expect(result).toBe(false);
    });
  });

  describe('getUserStats', () => {
    it('should return user statistics', async () => {
      const userId = 1;
      
      mockPrisma.post.count.mockResolvedValue(10);
      mockPrisma.like.count.mockResolvedValue(50);
      mockPrisma.comment.count.mockResolvedValue(25);
      mockPrisma.mentorshipSession.count.mockResolvedValue(5);
      mockPrisma.follow.count
        .mockResolvedValueOnce(20) // followers
        .mockResolvedValueOnce(15); // following
      mockPrisma.bookmark.count.mockResolvedValue(8);

      const result = await userService.getUserStats(userId);

      expect(result).toEqual({
        posts: 10,
        likes: 50,
        comments: 25,
        sessions: 5,
        followers: 20,
        following: 15,
        bookmarks: 8
      });
    });

    it('should handle errors gracefully', async () => {
      const userId = 1;
      
      mockPrisma.post.count.mockRejectedValue(new Error('Database error'));

      await expect(userService.getUserStats(userId))
        .rejects.toThrow('Database error');
    });
  });

  describe('searchUsers', () => {
    it('should search users successfully', async () => {
      const query = 'john';
      const skills = ['JavaScript'];
      const role = 'MENTOR';
      
      const mockUsers = [
        {
          id: 1,
          name: 'John Doe',
          bio: 'Software Developer',
          profileImage: 'https://example.com/avatar.jpg',
          skills: ['JavaScript', 'React'],
          role: 'MENTOR',
          _count: { followers: 10, posts: 5 }
        }
      ];

      mockPrisma.user.findMany.mockResolvedValue(mockUsers);
      mockPrisma.user.count.mockResolvedValue(1);

      const result = await userService.searchUsers({
        query,
        skills,
        role,
        page: 1,
        limit: 20
      });

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { bio: { contains: query, mode: 'insensitive' } }
          ],
          skills: {
            hasSome: skills
          },
          role: role
        },
        select: {
          id: true,
          name: true,
          bio: true,
          profileImage: true,
          skills: true,
          role: true,
          _count: {
            select: {
              followers: true,
              posts: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20
      });

      expect(result).toEqual({
        users: mockUsers,
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          pages: 1
        }
      });
    });

    it('should search without filters', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      const result = await userService.searchUsers({
        page: 1,
        limit: 20
      });

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true
        },
        select: {
          id: true,
          name: true,
          bio: true,
          profileImage: true,
          skills: true,
          role: true,
          _count: {
            select: {
              followers: true,
              posts: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20
      });

      expect(result.users).toEqual([]);
    });
  });

  describe('getEntityDetails', () => {
    it('should get post entity details', async () => {
      const entityType = 'post';
      const entityId = 123;
      
      const mockPost = {
        id: entityId,
        title: 'Test Post',
        content: 'Test content',
        image: 'https://example.com/image.jpg'
      };

      mockPrisma.post.findUnique.mockResolvedValue(mockPost);

      const result = await userService.getEntityDetails(entityType, entityId);

      expect(result).toEqual({
        title: 'Test Post',
        description: 'Test content'
      });
    });

    it('should get mentor entity details', async () => {
      const entityType = 'mentor';
      const entityId = 123;
      
      const mockUser = {
        id: entityId,
        name: 'John Doe',
        bio: 'Software Developer',
        profileImage: 'https://example.com/avatar.jpg'
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await userService.getEntityDetails(entityType, entityId);

      expect(result).toEqual({
        title: 'John Doe',
        description: 'Software Developer'
      });
    });

    it('should throw error for invalid entity type', async () => {
      const entityType = 'invalid';
      const entityId = 123;

      await expect(userService.getEntityDetails(entityType, entityId))
        .rejects.toThrow('Invalid entity type');
    });

    it('should throw error if entity not found', async () => {
      const entityType = 'post';
      const entityId = 999;

      mockPrisma.post.findUnique.mockResolvedValue(null);

      await expect(userService.getEntityDetails(entityType, entityId))
        .rejects.toThrow('Entity not found');
    });
  });

  describe('clearUserCache', () => {
    it('should clear user cache entries', () => {
      const userId = 1;
      
      // Mock cache with some keys
      const mockCache = {
        keys: jest.fn(() => [
          'user_profile_1_public',
          'user_profile_1_2',
          'user_profile_3_public'
        ]),
        del: jest.fn()
      };

      // Replace cache instance
      userService.userCache = mockCache;

      userService.clearUserCache(userId);

      expect(mockCache.keys).toHaveBeenCalled();
      expect(mockCache.del).toHaveBeenCalledWith('user_profile_1_public');
      expect(mockCache.del).toHaveBeenCalledWith('user_profile_1_2');
      expect(mockCache.del).not.toHaveBeenCalledWith('user_profile_3_public');
    });
  });
});
