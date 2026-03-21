import express from 'express';
import { authenticate } from '../middleware/index.js';
import OptimizedPostController from '../controllers/optimizedPostController.js';
import PostController from '../controllers/postController.js';
import { upload, handleUploadError } from '../middleware/upload.js';

const router = express.Router();
const optimizedController = new OptimizedPostController();

// Public routes - specific routes first
router.get('/', optimizedController.getPostsOptimized);
router.get('/compare-performance', optimizedController.comparePerformance);
router.get('/search', PostController.searchPosts);
router.get('/cursor', PostController.getPostsWithCursor);
router.get('/author/:authorId', PostController.getPostsByAuthor);
// Parameterized routes last
router.get('/:id', PostController.getById);
router.get('/:id/comments', PostController.getComments); // Public GET comments

// Protected routes (require authentication)
router.use(authenticate);

// CRUD operations (protected)
router.post('/', upload.single('image'), handleUploadError, PostController.create);
router.put('/:id', PostController.updatePost);
router.delete('/:id', PostController.deletePost);

// Like operations (protected)
router.post('/:id/like', PostController.likePost);

// Comment operations (protected)
router.post('/:id/comments', PostController.addComment);
router.post('/:id/comment', PostController.addComment); // Keep for backward compatibility

export default router;
