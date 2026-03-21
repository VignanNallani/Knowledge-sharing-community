import BaseController from '../base/BaseController.js';
import { ErrorFactory } from '../errors/index.js';
import eventBus from '../core/events/eventBus.js';

class InternalController extends BaseController {
  // Get event system statistics (admin only)
  static getEventStats = BaseController.asyncHandler(async (req, res) => {
    const user = this.getUser(req);
    
    // Verify admin role
    if (user.role !== 'ADMIN') {
      return this.forbidden(res, 'Admin access required');
    }

    try {
      const stats = eventBus.getStats();
      
      this.logRequest(req, { 
        action: 'get_event_stats',
        userId: user.id,
        role: user.role
      });
      
      return this.success(res, stats, 'Event system statistics retrieved successfully');
    } catch (error) {
      return this.internalServerError(res, 'Failed to retrieve event statistics');
    }
  });

  // Get event emission statistics (admin only)
  static getEventEmissionStats = BaseController.asyncHandler(async (req, res) => {
    const user = this.getUser(req);
    
    // Verify admin role
    if (user.role !== 'ADMIN') {
      return this.forbidden(res, 'Admin access required');
    }

    try {
      const eventStats = eventBus.getEventStats();
      
      this.logRequest(req, { 
        action: 'get_event_emission_stats',
        userId: user.id,
        role: user.role
      });
      
      return this.success(res, eventStats, 'Event emission statistics retrieved successfully');
    } catch (error) {
      return this.internalServerError(res, 'Failed to retrieve event emission statistics');
    }
  });

  // Get listener statistics (admin only)
  static getListenerStats = BaseController.asyncHandler(async (req, res) => {
    const user = this.getUser(req);
    
    // Verify admin role
    if (user.role !== 'ADMIN') {
      return this.forbidden(res, 'Admin access required');
    }

    try {
      const listenerStats = eventBus.getListenerStats();
      
      this.logRequest(req, { 
        action: 'get_listener_stats',
        userId: user.id,
        role: user.role
      });
      
      return this.success(res, listenerStats, 'Listener statistics retrieved successfully');
    } catch (error) {
      return this.internalServerError(res, 'Failed to retrieve listener statistics');
    }
  });

  // Get error statistics (admin only)
  static getErrorStats = BaseController.asyncHandler(async (req, res) => {
    const user = this.getUser(req);
    
    // Verify admin role
    if (user.role !== 'ADMIN') {
      return this.forbidden(res, 'Admin access required');
    }

    try {
      const errorStats = eventBus.getErrorStats();
      
      this.logRequest(req, { 
        action: 'get_error_stats',
        userId: user.id,
        role: user.role
      });
      
      return this.success(res, errorStats, 'Error statistics retrieved successfully');
    } catch (error) {
      return this.internalServerError(res, 'Failed to retrieve error statistics');
    }
  });

  // Reset event statistics (admin only)
  static resetEventStats = BaseController.asyncHandler(async (req, res) => {
    const user = this.getUser(req);
    
    // Verify admin role
    if (user.role !== 'ADMIN') {
      return this.forbidden(res, 'Admin access required');
    }

    try {
      eventBus.resetStats();
      
      this.logRequest(req, { 
        action: 'reset_event_stats',
        userId: user.id,
        role: user.role
      });
      
      return this.success(res, { message: 'Event statistics reset successfully' }, 'Event statistics reset');
    } catch (error) {
      return this.internalServerError(res, 'Failed to reset event statistics');
    }
  });
}

export default InternalController;
