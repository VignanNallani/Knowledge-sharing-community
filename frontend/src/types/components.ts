// Component prop types for better type safety

export interface Post {
  id: string;
  title: string;
  content: string;
  author: {
    id: string;
    name: string;
    email: string;
    role: 'USER' | 'MENTOR' | 'ADMIN';
  };
  createdAt: string;
  updatedAt: string;
  tags?: string[];
  likesCount?: number;
  commentsCount?: number;
  isLiked?: boolean;
}

export interface Comment {
  id: string;
  content: string;
  author: {
    id: string;
    name: string;
    role?: 'USER' | 'MENTOR' | 'ADMIN';
  };
  createdAt: string;
  postId: string;
  likesCount?: number;
  likeCount?: number;
  isLiked?: boolean;
  optimistic?: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'USER' | 'MENTOR' | 'ADMIN';
  avatar?: string;
  bio?: string;
}

export interface Mentor {
  id: string;
  name: string;
  email: string;
  role: 'MENTOR';
  expertise: string[];
  availability: string;
  rating?: number;
  sessionPrice?: number;
}

export interface PostCardProps {
  post: Post;
  onLike?: (id: string) => void;
  onBookmark?: (id: string) => void;
  className?: string;
}

export interface CommentBoxProps {
  postId: string;
  onSuccess?: () => void;
  onOptimisticAdd?: (comment: Comment) => void;
}

export interface CommentItemProps {
  comment: Comment;
  depth?: number;
  onRefresh?: () => void;
}

export interface UserCardProps {
  user: User | Mentor;
  showRole?: boolean;
  showActions?: boolean;
  onFollow?: (userId: string) => void;
  onMessage?: (userId: string) => void;
}

export interface SearchFilters {
  query: string;
  tags: string[];
  sortBy: 'newest' | 'oldest' | 'popular';
  author?: string;
}

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}
