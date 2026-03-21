/**
 * Moderation System Policies & Security
 * Week-3 Ownership Feature Build
 * Role-based access control and security guards
 */

import { MODERATOR_ROLES, ACTION_TYPE, TRUST_LEVEL } from './constants.js';

export class ModerationPolicy {
  /**
   * Check if user has moderator privileges
   */
  static isModerator(user) {
    return user?.role === MODERATOR_ROLES.MODERATOR ||
           user?.role === MODERATOR_ROLES.ADMIN ||
           user?.role === MODERATOR_ROLES.SUPER_ADMIN;
  }

  /**
   * Check if user has admin privileges
   */
  static isAdmin(user) {
    return user?.role === MODERATOR_ROLES.ADMIN ||
           user?.role === MODERATOR_ROLES.SUPER_ADMIN;
  }

  /**
   * Check if user has super admin privileges
   */
  static isSuperAdmin(user) {
    return user?.role === MODERATOR_ROLES.SUPER_ADMIN;
  }

  /**
   * Check if user can access specific moderation case
   */
  static canAccessCase(user, case_) {
    if (!user || !case_) return false;
    
    // Super admins can access all cases
    if (this.isSuperAdmin(user)) return true;
    
    // Admins can access all cases in their scope
    if (this.isAdmin(user)) return true;
    
    // Moderators can only access assigned cases or unassigned cases
    if (this.isModerator(user)) {
      return !case_.assignedModeratorId || case_.assignedModeratorId === user.id;
    }
    
    return false;
  }

  /**
   * Check if user can assign cases
   */
  static canAssignCases(user) {
    return this.isAdmin(user) || this.isSuperAdmin(user);
  }

  /**
   * Check if user can take specific action
   */
  static canTakeAction(user, actionType, targetUser = null) {
    if (!this.isModerator(user)) return false;

    // Check action permissions based on role
    switch (actionType) {
      case ACTION_TYPE.WARNING:
      case ACTION_TYPE.NOTES_ONLY:
        return this.isModerator(user);
      
      case ACTION_TYPE.CONTENT_REMOVAL:
      case ACTION_TYPE.TRUST_DEDUCTION:
        return this.isModerator(user);
      
      case ACTION_TYPE.USER_SUSPENSION:
        // Only admins and super admins can suspend users
        return this.isAdmin(user) || this.isSuperAdmin(user);
      
      case ACTION_TYPE.USER_BAN:
        // Only super admins can ban users
        return this.isSuperAdmin(user);
      
      case ACTION_TYPE.ESCALATE:
        return this.isModerator(user);
      
      default:
        return false;
    }
  }

  /**
   * Check if user can resolve a case
   */
  static canResolveCase(user, case_) {
    if (!this.canAccessCase(user, case_)) return false;
    
    // Only assigned moderator or admin can resolve
    return case_.assignedModeratorId === user.id || this.isAdmin(user);
  }

  /**
   * Check if user can file an appeal
   */
  static canFileAppeal(user, moderationCase) {
    if (!user || !moderationCase) return false;
    
    // User can appeal if they are the target of the case
    // Implementation depends on case structure
    return true; // Simplified for now
  }

  /**
   * Check if user can review appeals
   */
  static canReviewAppeals(user) {
    return this.isModerator(user);
  }

  /**
   * Check if user can access trust scores
   */
  static canAccessTrustScores(user) {
    return this.isModerator(user);
  }

  /**
   * Check if user can modify trust scores
   */
  static canModifyTrustScores(user) {
    return this.isAdmin(user) || this.isSuperAdmin(user);
  }

  /**
   * Check if user can access moderation logs
   */
  static canAccessLogs(user) {
    return this.isModerator(user);
  }

  /**
   * Check if user can access dashboard
   */
  static canAccessDashboard(user) {
    return this.isModerator(user);
  }

  /**
   * Check if user is rate limited for reporting
   */
  static isRateLimitedForReports(user, recentReports = []) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentCount = recentReports.filter(report => 
      report.createdAt > oneHourAgo && report.reporterId === user.id
    ).length;
    
    return recentCount >= 5; // 5 reports per hour limit
  }

  /**
   * Check if user is rate limited for appeals
   */
  static isRateLimitedForAppeals(user, recentAppeals = []) {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentCount = recentAppeals.filter(appeal => 
      appeal.createdAt > oneWeekAgo && appeal.appellantUserId === user.id
    ).length;
    
    return recentCount >= 3; // 3 appeals per week limit
  }

  /**
   * Check if action requires additional approval
   */
  static requiresApproval(actionType, targetUserTrustLevel = TRUST_LEVEL.NEW) {
    switch (actionType) {
      case ACTION_TYPE.USER_SUSPENSION:
        return targetUserTrustLevel === TRUST_LEVEL.TRUSTED || 
               targetUserTrustLevel === TRUST_LEVEL.VIP;
      
      case ACTION_TYPE.USER_BAN:
        return true; // All bans require approval
      
      case ACTION_TYPE.TRUST_DEDUCTION:
        return Math.abs(targetUserTrustLevel) > 20; // Large deductions need approval
      
      default:
        return false;
    }
  }

  /**
   * Filter sensitive data based on user role
   */
  static filterSensitiveData(data, user) {
    if (!data || !user) return data;

    const filteredData = { ...data };

    // Remove sensitive fields for non-admins
    if (!this.isAdmin(user)) {
      delete filteredData.systemReason;
      delete filteredData.internalNotes;
      delete filteredData.ipAddress;
      delete filteredData.userAgent;
    }

    // Remove even more fields for regular moderators
    if (!this.isSuperAdmin(user)) {
      delete filteredData.adminNotes;
      delete filteredData.escalationHistory;
    }

    return filteredData;
  }

  /**
   * Validate action constraints
   */
  static validateActionConstraints(actionType, actionData) {
    const errors = [];

    switch (actionType) {
      case ACTION_TYPE.USER_SUSPENSION:
        if (!actionData.durationDays || actionData.durationDays < 1) {
          errors.push('Suspension requires valid duration');
        }
        if (actionData.durationDays > 365) {
          errors.push('Suspension duration cannot exceed 365 days');
        }
        break;

      case ACTION_TYPE.TRUST_DEDUCTION:
        if (!actionData.trustScoreChange || actionData.trustScoreChange >= 0) {
          errors.push('Trust deduction must be negative');
        }
        if (actionData.trustScoreChange < -50) {
          errors.push('Trust deduction cannot exceed -50 points');
        }
        break;

      case ACTION_TYPE.CONTENT_REMOVAL:
        if (!actionData.targetContentType || !actionData.targetContentId) {
          errors.push('Content removal requires target content');
        }
        break;
    }

    return errors;
  }

  /**
   * Check if user can be targeted by action
   */
  static canTargetUser(actor, target, actionType) {
    // Users cannot target themselves
    if (actor.id === target.id) {
      return false;
    }

    // Regular moderators cannot target admins or super admins
    if (actor.role === MODERATOR_ROLES.MODERATOR) {
      if (target.role === MODERATOR_ROLES.ADMIN || 
          target.role === MODERATOR_ROLES.SUPER_ADMIN) {
        return false;
      }
    }

    // Admins cannot target super admins
    if (actor.role === MODERATOR_ROLES.ADMIN && 
        target.role === MODERATOR_ROLES.SUPER_ADMIN) {
      return false;
    }

    return true;
  }
}

export default ModerationPolicy;
