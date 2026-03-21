import { z } from 'zod';

// Common validation patterns
const positiveNumber = z.number().int().positive();
const nonNegativeNumber = z.number().int().min(0);
const rating = z.number().int().min(1).max(5);
const email = z.string().email();
const uuid = z.string().uuid();
const timestamp = z.string().datetime();

// Mentor Profile Validation
export const mentorProfileSchema = z.object({
  body: z.object({
    professionalTitle: z.string().min(1).max(150),
    yearsOfExperience: nonNegativeNumber.max(50),
    company: z.string().max(200).optional(),
    industry: z.string().max(100).optional(),
    bio: z.string().max(2000).optional(),
    hourlyRate: nonNegativeNumber.max(1000),
    availabilityPreferences: z.record(z.any()).optional(),
    mentorshipTypes: z.array(z.string()).min(1).max(5),
    maxMentees: positiveNumber.max(20),
    languagesSpoken: z.array(z.string()).max(10),
    timezone: z.string().max(50)
  })
});

// Mentee Profile Validation
export const menteeProfileSchema = z.object({
  body: z.object({
    careerLevel: z.string().max(50).optional(),
    goals: z.array(z.string()).max(10),
    preferredTopics: z.array(z.string()).max(10),
    budgetRange: z.string().max(50).optional(),
    availability: z.record(z.any()).optional(),
    learningStyle: z.string().max(100).optional(),
    background: z.string().max(1000).optional(),
    expectations: z.string().max(1000).optional()
  })
});

// Mentor Skill Validation
export const mentorSkillSchema = z.object({
  body: z.object({
    skillId: positiveNumber,
    proficiencyLevel: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']),
    yearsOfExperience: nonNegativeNumber.max(50)
  })
});

// Mentorship Request Validation
export const mentorshipRequestSchema = z.object({
  body: z.object({
    mentorId: positiveNumber,
    requestType: z.enum(['one_time', 'ongoing']),
    topicDescription: z.string().min(10).max(1000),
    goals: z.array(z.string()).min(1).max(10),
    expectedDuration: z.string().max(50).optional(),
    proposedSchedule: z.record(z.any()).optional(),
    budget: nonNegativeNumber.max(10000).optional(),
    urgency: z.enum(['low', 'normal', 'high']).default('normal'),
    message: z.string().min(10).max(2000),
    skills: z.array(z.object({
      skillId: positiveNumber,
      priority: z.number().int().min(1).max(5).default(1)
    })).min(1).max(10)
  })
});

// Request Response Validation
export const requestResponseSchema = z.object({
  body: z.object({
    action: z.enum(['accept', 'reject']),
    message: z.string().min(1).max(1000).optional(),
    reason: z.string().max(500).optional()
  }).refine(
    (data) => {
      if (data.action === 'reject' && !data.reason) {
        return false;
      }
      return true;
    },
    {
      message: "Rejection reason is required when rejecting a request",
      path: ["reason"]
    }
  )
});

// Mentorship Relationship Validation
export const mentorshipRelationshipSchema = z.object({
  body: z.object({
    type: z.enum(['career', 'technical', 'leadership', 'mixed']),
    frequency: z.string().max(50).optional(),
    duration: z.string().max(50).optional(),
    goals: z.array(z.string()).max(10),
    progressNotes: z.string().max(2000).optional()
  })
});

// Relationship Status Update
export const relationshipStatusSchema = z.object({
  body: z.object({
    status: z.enum(['active', 'paused', 'completed', 'terminated']),
    reason: z.string().max(500).optional()
  }).refine(
    (data) => {
      if (['paused', 'terminated'].includes(data.status) && !data.reason) {
        return false;
      }
      return true;
    },
    {
      message: "Reason is required for pause/terminate actions",
      path: ["reason"]
    }
  )
});

// End Relationship Validation
export const endRelationshipSchema = z.object({
  body: z.object({
    reason: z.string().min(10).max(1000),
    satisfactionScore: rating
  })
});

// Session Validation
export const sessionSchema = z.object({
  body: z.object({
    scheduledStart: timestamp,
    scheduledEnd: timestamp,
    type: z.enum(['video', 'call', 'in_person', 'chat']),
    topic: z.string().max(200).optional(),
    agenda: z.string().max(2000).optional(),
    topics: z.array(z.object({
      skillId: positiveNumber
    })).max(5).optional()
  }).refine(
    (data) => new Date(data.scheduledEnd) > new Date(data.scheduledStart),
    {
      message: "End time must be after start time",
      path: ["scheduledEnd"]
    }
  ).refine(
    (data) => {
      const duration = new Date(data.scheduledEnd) - new Date(data.scheduledStart);
      const hours = duration / (1000 * 60 * 60);
      return hours >= 0.5 && hours <= 8; // 30 min to 8 hours
    },
    {
      message: "Session duration must be between 30 minutes and 8 hours",
      path: ["scheduledEnd"]
    }
  )
});

// Session Update Validation
export const sessionUpdateSchema = z.object({
  body: z.object({
    scheduledStart: timestamp.optional(),
    scheduledEnd: timestamp.optional(),
    type: z.enum(['video', 'call', 'in_person', 'chat']).optional(),
    topic: z.string().max(200).optional(),
    agenda: z.string().max(2000).optional(),
    topics: z.array(z.object({
      skillId: positiveNumber
    })).max(5).optional()
  }).partial()
});

// Session End Validation
export const sessionEndSchema = z.object({
  body: z.object({
    notes: z.string().max(2000).optional(),
    recordingUrl: z.string().url().optional()
  })
});

// Session Cancellation Validation
export const sessionCancelSchema = z.object({
  body: z.object({
    reason: z.string().min(5).max(500),
    refundPolicy: z.enum(['full', 'partial', 'none'])
  })
});

// Availability Validation
export const availabilitySchema = z.object({
  body: z.object({
    dayOfWeek: z.number().int().min(0).max(6),
    startTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
    endTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
    timezone: z.string().max(50),
    recurring: z.boolean().default(true),
    specificDate: z.string().date().optional(),
    bookingBuffer: nonNegativeNumber.max(240).default(60), // max 4 hours
    maxSessionsPerDay: positiveNumber.max(10).default(3)
  }).refine(
    (data) => {
      if (data.recurring && data.specificDate) {
        return false;
      }
      if (!data.recurring && !data.specificDate) {
        return false;
      }
      return true;
    },
    {
      message: "Either recurring with no specific date, or specific date with recurring=false",
      path: ["specificDate"]
    }
  ).refine(
    (data) => {
      const start = data.startTime.split(':');
      const end = data.endTime.split(':');
      const startMinutes = parseInt(start[0]) * 60 + parseInt(start[1]);
      const endMinutes = parseInt(end[0]) * 60 + parseInt(end[1]);
      return endMinutes > startMinutes;
    },
    {
      message: "End time must be after start time",
      path: ["endTime"]
    }
  )
});

// Availability Update Validation
export const availabilityUpdateSchema = z.object({
  body: z.object({
    dayOfWeek: z.number().int().min(0).max(6).optional(),
    startTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
    endTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
    timezone: z.string().max(50).optional(),
    recurring: z.boolean().optional(),
    specificDate: z.string().date().optional(),
    bookingBuffer: nonNegativeNumber.max(240).optional(),
    maxSessionsPerDay: positiveNumber.max(10).optional(),
    status: z.enum(['available', 'busy', 'unavailable']).optional()
  }).partial()
});

// Package Validation
export const packageSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(200),
    description: z.string().max(2000).optional(),
    type: z.enum(['one_time', 'package', 'subscription']),
    duration: z.string().max(50).optional(),
    sessionCount: positiveNumber.max(100),
    price: nonNegativeNumber.max(50000),
    currency: z.string().length(3).default('USD'),
    features: z.record(z.any()).optional(),
    requirements: z.string().max(1000).optional()
  })
});

// Feedback Validation
export const feedbackSchema = z.object({
  body: z.object({
    rating: rating,
    communicationRating: rating.optional(),
    expertiseRating: rating.optional(),
    helpfulnessRating: rating.optional(),
    professionalismRating: rating.optional(),
    comments: z.string().max(2000).optional(),
    isPublic: z.boolean().default(false)
  })
});

// Trust Score Adjustment (Admin)
export const trustScoreAdjustmentSchema = z.object({
  body: z.object({
    adjustment: z.number().min(-100).max(100),
    reason: z.string().min(5).max(500),
    temporary: z.boolean().default(false),
    expiresAt: timestamp.optional()
  }).refine(
    (data) => {
      if (data.temporary && !data.expiresAt) {
        return false;
      }
      return true;
    },
    {
      message: "Expiration date is required for temporary adjustments",
      path: ["expiresAt"]
    }
  )
});

// Mentor Verification (Admin)
export const mentorVerificationSchema = z.object({
  body: z.object({
    action: z.enum(['verify', 'reject', 'revoke']),
    reason: z.string().max(500)
  })
});

// Query Parameter Schemas
export const mentorSearchSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
    industry: z.string().optional(),
    skills: z.string().optional(), // comma-separated
    minExperience: z.coerce.number().int().min(0).optional(),
    maxRate: z.coerce.number().min(0).optional(),
    featured: z.coerce.boolean().optional(),
    search: z.string().max(100).optional()
  })
});

export const relationshipQuerySchema = z.object({
  query: z.object({
    status: z.enum(['active', 'paused', 'completed', 'terminated']).optional(),
    type: z.enum(['mentor', 'mentee']).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20)
  })
});

export const sessionQuerySchema = z.object({
  query: z.object({
    status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled', 'no_show']).optional(),
    fromDate: z.string().date().optional(),
    toDate: z.string().date().optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20)
  })
});

export const feedbackQuerySchema = z.object({
  query: z.object({
    type: z.enum(['session', 'relationship']).optional(),
    public: z.coerce.boolean().optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20)
  })
});

// Legacy schemas (for backward compatibility)
export const createSlotSchema = z.object({
  body: z.object({
    startAt: z.string(),
    endAt: z.string(),
  }),
});

export const bookSlotSchema = z.object({
  body: z.object({
    slotId: z.number().int().positive(),
  }),
});

export default {
  mentorProfileSchema,
  menteeProfileSchema,
  mentorSkillSchema,
  mentorshipRequestSchema,
  requestResponseSchema,
  mentorshipRelationshipSchema,
  relationshipStatusSchema,
  endRelationshipSchema,
  sessionSchema,
  sessionUpdateSchema,
  sessionEndSchema,
  sessionCancelSchema,
  availabilitySchema,
  availabilityUpdateSchema,
  packageSchema,
  feedbackSchema,
  trustScoreAdjustmentSchema,
  mentorVerificationSchema,
  mentorSearchSchema,
  relationshipQuerySchema,
  sessionQuerySchema,
  feedbackQuerySchema,
  createSlotSchema,
  bookSlotSchema
};
