import { describe, it, expect, vi } from 'vitest';
import { postAPI } from '../services/postAPI';
import { mockPost, setupTest, cleanupTest } from './test-utils';

describe('Post API', () => {
  beforeEach(() => {
    setupTest();
  });

  afterEach(() => {
    cleanupTest();
  });

  describe('getPosts', () => {
    it('should fetch posts successfully', async () => {
      const mockResponse = {
        data: {
          data: [mockPost],
          pagination: {
            hasMore: false,
            nextCursor: null,
            limit: 10,
          },
        },
        success: true,
      };

      vi.mocked(postAPI.getPosts).mockResolvedValue(mockResponse);

      const result = await postAPI.getPosts();

      expect(result.data.data).toHaveLength(1);
      expect(result.data.data[0]).toEqual(mockPost);
      expect(result.success).toBe(true);
    });

    it('should handle pagination parameters', async () => {
      const mockResponse = {
        data: {
          data: [],
          pagination: {
            hasMore: false,
            nextCursor: null,
            limit: 5,
          },
        },
        success: true,
      };

      vi.mocked(postAPI.getPosts).mockResolvedValue(mockResponse);

      const params = { limit: 5 };
      const result = await postAPI.getPosts(params);

      expect(result.data.pagination.limit).toBe(5);
      expect(result.success).toBe(true);
    });
  });

  describe('createPost', () => {
    it('should create post successfully', async () => {
      const newPostData = {
        title: 'New Post',
        content: 'This is a new post',
      };

      const mockResponse = {
        data: { ...mockPost, ...newPostData },
        success: true,
      };

      vi.mocked(postAPI.createPost).mockResolvedValue(mockResponse);

      const result = await postAPI.createPost(newPostData);

      expect(result.data.title).toBe('New Post');
      expect(result.data.content).toBe('This is a new post');
      expect(result.success).toBe(true);
    });
  });

  describe('updatePost', () => {
    it('should update post successfully', async () => {
      const updateData = {
        title: 'Updated Post',
      };

      const mockResponse = {
        data: { ...mockPost, ...updateData },
        success: true,
      };

      vi.mocked(postAPI.updatePost).mockResolvedValue(mockResponse);

      const result = await postAPI.updatePost('1', updateData);

      expect(result.data.title).toBe('Updated Post');
      expect(result.success).toBe(true);
    });
  });

  describe('deletePost', () => {
    it('should delete post successfully', async () => {
      const mockResponse = {
        data: null,
        success: true,
      };

      vi.mocked(postAPI.deletePost).mockResolvedValue(mockResponse);

      const result = await postAPI.deletePost('1');

      expect(result.success).toBe(true);
    });
  });

  describe('likePost', () => {
    it('should like post successfully', async () => {
      const mockResponse = {
        data: null,
        success: true,
      };

      vi.mocked(postAPI.likePost).mockResolvedValue(mockResponse);

      const result = await postAPI.likePost('1');

      expect(result.success).toBe(true);
    });
  });
});
