// Moderation System - Main Index File
// Exports all moderation components for easy importing

// Core Components
export { default as ModerationDashboard } from './ModerationDashboard';
export { default as ModerationCaseDetail } from './ModerationCaseDetail';
export { default as ModerationAnalytics } from './ModerationAnalytics';

// System Components
export { ReportForm, ReportsList } from './ReportSystem';
export { AppealForm, AppealStatusTracker, AppealsList } from './AppealSystem';
export { TrustScoreDisplay, TrustScoreAdmin, TrustScoreLeaderboard } from './TrustScoreSystem';

// Individual Components
export { default as ReportCard } from './ReportCard';

// Utility exports for easier usage
export const ModerationComponents = {
  // Dashboard and Management
  ModerationDashboard,
  ModerationCaseDetail,
  ModerationAnalytics,
  
  // Report System
  ReportForm,
  ReportsList,
  ReportCard,
  
  // Appeal System
  AppealForm,
  AppealStatusTracker,
  AppealsList,
  
  // Trust System
  TrustScoreDisplay,
  TrustScoreAdmin,
  TrustScoreLeaderboard
};

// Default export for convenience
export default ModerationComponents;
