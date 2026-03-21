// Test comment creation directly
import commentService from './src/services/comment.service.js';

try {
  const result = await commentService.createComment({
    content: 'Direct test of comment creation',
    postId: '1',
    authorId: 1,
    parentCommentId: null
  });
  console.log('✅ Comment created:', result);
} catch (error) {
  console.log('❌ Comment creation failed:', error.message);
  console.log('Stack:', error.stack);
}
