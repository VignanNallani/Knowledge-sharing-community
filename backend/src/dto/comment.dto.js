const commentDto = {
  create: (comment, postAuthorId, postTitle) => ({
    id: comment.id,
    content: comment.content,
    createdAt: comment.createdAt,
    postId: comment.postId,
    parentCommentId: comment.parentCommentId,
    author: comment.author,
    postAuthorId,
    postTitle
  }),

  detail: (comment, userId = null) => ({
    id: comment.id,
    content: comment.content,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
    postId: comment.postId,
    parentCommentId: comment.parentCommentId,
    author: comment.author,
    likeCount: comment.commentLikes?.length || 0,
    isLiked: userId ? comment.commentLikes?.some(l => l.userId === userId) : false,
    replies: comment.replies?.map(reply => ({
      id: reply.id,
      content: reply.content,
      createdAt: reply.createdAt,
      postId: reply.postId,
      parentCommentId: reply.parentCommentId,
      author: reply.author,
      likeCount: reply.commentLikes?.length || 0,
      isLiked: userId ? reply.commentLikes?.some(l => l.userId === userId) : false,
    })) || [],
  }),

  minimal: (comment) => ({
    id: comment.id,
    content: comment.content?.substring(0, 100) + (comment.content?.length > 100 ? '...' : ''),
    createdAt: comment.createdAt,
    author: comment.author,
    likeCount: comment.commentLikes?.length || 0,
  }),

  admin: (comment) => ({
    id: comment.id,
    content: comment.content,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
    postId: comment.postId,
    parentCommentId: comment.parentCommentId,
    author: comment.author,
    likeCount: comment.commentLikes?.length || 0,
    status: comment.status,
  }),

  reply: (reply, userId = null) => ({
    id: reply.id,
    content: reply.content,
    createdAt: reply.createdAt,
    updatedAt: reply.updatedAt,
    postId: reply.postId,
    parentCommentId: reply.parentCommentId,
    author: reply.author,
    likeCount: reply.commentLikes?.length || 0,
    isLiked: userId ? reply.commentLikes?.some(l => l.userId === userId) : false,
  }),
};

export default commentDto;
