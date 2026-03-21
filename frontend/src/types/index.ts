// User and Authentication Types
export interface User {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  role: 'USER' | 'ADMIN' | 'MENTOR';
  avatar?: string;
  bio?: string;
  expertise?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  username: string;
  firstName: string;
  lastName: string;
}

// Post Types
export interface Post {
  id: string;
  title: string;
  content: string;
  authorId: string;
  author: User;
  createdAt: string;
  updatedAt: string;
  version: number;
  deletedAt?: string;
  likes: Like[];
  comments: Comment[];
  _count?: {
    likes: number;
    comments: number;
  };
}

export interface CreatePostRequest {
  title: string;
  content: string;
  idempotencyKey?: string;
}

export interface UpdatePostRequest {
  title?: string;
  content?: string;
  version: number;
}

// Comment Types
export interface Comment {
  id: string;
  content: string;
  authorId: string;
  author: User;
  postId: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  deletedAt?: string;
}

export interface CreateCommentRequest {
  content: string;
  postId: string;
  idempotencyKey?: string;
}

export interface UpdateCommentRequest {
  content: string;
  version: number;
}

// Like Types
export interface Like {
  id: string;
  userId: string;
  postId: string;
  createdAt: string;
}

// Mentorship Types
export interface Mentor {
  id: string;
  user: User;
  expertise: string[];
  experience: string;
  availability: 'AVAILABLE' | 'BUSY' | 'UNAVAILABLE';
  hourlyRate?: number;
  bio?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MentorshipRequest {
  id: string;
  mentorId: string;
  menteeId: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'COMPLETED';
  message?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMentorshipRequest {
  mentorId: string;
  message?: string;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  hasMore: boolean;
  nextCursor?: string;
  total?: number;
}

export interface PaginationParams {
  cursor?: string;
  limit?: number;
}

// API Response Types
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    hasMore: boolean;
    nextCursor?: string;
    limit: number;
  };
  message?: string;
  success: boolean;
}

export interface ApiError {
  message: string;
  code?: string;
  statusCode?: number;
  details?: Record<string, unknown>;
}

// Component Props Types
export interface ProtectedRouteProps {
  children?: React.ReactNode;
  role?: User['role'];
}

export interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

// Context Types
export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  sessionRestoring: boolean;
  login: (credentials: LoginCredentials) => Promise<ApiResponse<AuthResponse>>;
  logout: () => Promise<void>;
}

export interface SocketContextType {
  socket: unknown; // Socket.io client instance
  connected: boolean;
  onlineUsers: string[];
}

// Utility Types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
