import { lazy } from 'react';

// Lazy loaded components for code splitting
export const LazyDashboard = lazy(() => import('../pages/Dashboard'));
export const LazyProfile = lazy(() => import('../pages/ProfilePage'));
export const LazySearch = lazy(() => import('../pages/SearchPage'));
export const LazyMentorship = lazy(() => import('../pages/MentorshipPage'));
export const LazyEvents = lazy(() => import('../pages/EventsPage'));
export const LazyPosts = lazy(() => import('../pages/PostsPage'));
export const LazySettings = lazy(() => import('../pages/SettingsPage'));

// Lazy loaded modals
export const LazyBookingModal = lazy(() => import('../components/BookingModal'));
export const LazyCommentModal = lazy(() => import('../components/CommentModal'));
export const LazyShareModal = lazy(() => import('../components/ShareModal'));

// Lazy loaded admin components
export const LazyAdminDashboard = lazy(() => import('../pages/admin/AdminDashboard'));
export const LazyUserManagement = lazy(() => import('../pages/admin/UserManagement'));
export const LazyAnalytics = lazy(() => import('../pages/admin/Analytics'));

// Lazy loaded heavy components
export const LazyChatInterface = lazy(() => import('../components/ChatInterface'));
export const LazyRichTextEditor = lazy(() => import('../components/RichTextEditor'));
export const LazyFileUploader = lazy(() => import('../components/FileUploader'));
