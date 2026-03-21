const postDto = {
  create: (post) => ({
    id: post.id,
    title: post.title,
    content: post.content,
    status: post.status,
    createdAt: post.createdAt,
    author: post.author,
    tags: post.tags?.map(t => t.tag.name) || [],
  }),

  list: (post, userId = null) => ({
    id: post.id,
    title: post.title,
    content: post.content,
    createdAt: post.createdAt,
    image: post.image,
    author: post.author,
    tags: post.tags?.map(t => t.tag.name) || [],
    likeCount: post.likes?.length || 0,
    commentCount: post.comments?.length || 0,
    isLiked: userId ? post.likes?.some(l => l.userId === userId) : false,
  }),

  detail: (post, userId = null) => ({
    id: post.id,
    title: post.title,
    content: post.content,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    image: post.image,
    status: post.status,
    author: post.author,
    tags: post.tags?.map(t => t.tag.name) || [],
    likeCount: post.likes?.length || 0,
    commentCount: post.comments?.length || 0,
    isLiked: userId ? post.likes?.some(l => l.userId === userId) : false,
  }),

  admin: (post) => ({
    id: post.id,
    title: post.title,
    content: post.content,
    status: post.status,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    author: post.author,
    tags: post.tags?.map(t => t.tag.name) || [],
    likeCount: post.likes?.length || 0,
    commentCount: post.comments?.length || 0,
  }),

  search: (post) => ({
    id: post.id,
    title: post.title,
    content: post.content?.substring(0, 200) + (post.content?.length > 200 ? '...' : ''),
    createdAt: post.createdAt,
    author: post.author,
    tags: post.tags?.map(t => t.tag.name) || [],
    likeCount: post.likes?.length || 0,
  }),
};

export default postDto;
