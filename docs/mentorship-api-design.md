# Mentorship System API Design

## Overview
Production-grade REST API for mentorship system with proper authentication, authorization, validation, and error handling.

## Base URL
`/api/v1/mentorship`

## Authentication
- **Public endpoints**: No authentication required
- **Protected endpoints**: JWT token required in Authorization header
- **Admin endpoints**: JWT token + ADMIN role required

## Rate Limiting
- **Public**: 100 requests per 15 minutes
- **Protected**: 200 requests per 15 minutes  
- **Admin**: 500 requests per 15 minutes
- **Sensitive operations**: Additional limits apply

---

## PUBLIC ENDPOINTS

### Discover Mentors
```http
GET /api/v1/mentorship/mentors
```

**Description**: Public directory of verified mentors

**Query Parameters**:
- `page` (number, default: 1)
- `limit` (number, default: 20, max: 50)
- `industry` (string, optional)
- `skills` (string[], optional)
- `minExperience` (number, optional)
- `maxRate` (number, optional)
- `featured` (boolean, optional)
- `search` (string, optional)

**Response**:
```json
{
  "success": true,
  "message": "Mentors fetched",
  "data": {
    "mentors": [
      {
        "id": 1,
        "name": "Sarah Chen",
        "professionalTitle": "Senior Software Engineer",
        "yearsOfExperience": 8,
        "company": "TechCorp",
        "industry": "Technology",
        "bio": "I help engineers level up...",
        "hourlyRate": 150,
        "languagesSpoken": ["English", "Mandarin"],
        "trustScore": {
          "overallScore": 85.0,
          "reviewCount": 12,
          "responseRate": 90.0
        },
        "skills": [
          {
            "name": "JavaScript",
            "proficiencyLevel": "EXPERT",
            "verified": true
          }
        ],
        "activeRelationshipsCount": 3,
        "featuredMentor": true
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "totalPages": 3
    }
  }
}
```

### Get Mentor Profile
```http
GET /api/v1/mentorship/mentors/{mentorId}
```

**Description**: Public mentor profile (limited information)

**Response**:
```json
{
  "success": true,
  "message": "Mentor profile fetched",
  "data": {
    "id": 1,
    "name": "Sarah Chen",
    "professionalTitle": "Senior Software Engineer",
    "yearsOfExperience": 8,
    "company": "TechCorp",
    "industry": "Technology",
    "bio": "I help engineers level up...",
    "hourlyRate": 150,
    "mentorshipTypes": ["technical", "career"],
    "languagesSpoken": ["English", "Mandarin"],
    "timezone": "America/New_York",
    "verificationStatus": "VERIFIED",
    "trustScore": {
      "overallScore": 85.0,
      "reliabilityScore": 90.0,
      "expertiseScore": 88.0,
      "communicationScore": 87.0,
      "professionalismScore": 89.0,
      "reviewCount": 12,
      "responseRate": 90.0,
      "completionRate": 95.0,
      "onTimeRate": 98.0
    },
    "skills": [
      {
        "name": "JavaScript",
        "proficiencyLevel": "EXPERT",
        "yearsOfExperience": 8,
        "verified": true
      }
    ],
    "packages": [
      {
        "id": 1,
        "name": "Frontend Mastery Package",
        "type": "PACKAGE",
        "duration": "3 months",
        "sessionCount": 12,
        "price": 1500,
        "currency": "USD"
      }
    ],
    "availability": [
      {
        "dayOfWeek": 1,
        "startTime": "18:00",
        "endTime": "20:00",
        "timezone": "America/New_York"
      }
    ],
    "publicReviews": [
      {
        "id": 1,
        "rating": 5,
        "comments": "Excellent mentor!",
        "submittedAt": "2024-01-15T10:30:00Z",
        "helpfulVotes": 8
      }
    ]
  }
}
```

### Get Skills Taxonomy
```http
GET /api/v1/mentorship/skills
```

**Description**: Get all available skill tags

**Query Parameters**:
- `category` (string, optional)
- `level` (string, optional)

**Response**:
```json
{
  "success": true,
  "message": "Skills fetched",
  "data": {
    "skills": [
      {
        "id": 1,
        "name": "JavaScript",
        "category": "Programming",
        "level": "INTERMEDIATE",
        "demandScore": 8.5,
        "isActive": true
      }
    ]
  }
}
```

---

## PROTECTED ENDPOINTS

## Profile Management

### Get My Mentor Profile
```http
GET /api/v1/mentorship/profile/mentor
```

**Description**: Get current user's mentor profile (if exists)

**Authorization**: Required + MENTOR role

**Response**:
```json
{
  "success": true,
  "message": "Mentor profile fetched",
  "data": {
    "id": 1,
    "userId": 123,
    "professionalTitle": "Senior Software Engineer",
    "yearsOfExperience": 8,
    "company": "TechCorp",
    "industry": "Technology",
    "bio": "I help engineers level up...",
    "hourlyRate": 150,
    "availabilityPreferences": {},
    "mentorshipTypes": ["technical", "career"],
    "maxMentees": 4,
    "responseRate": 95.0,
    "averageResponseTime": 120,
    "verificationStatus": "VERIFIED",
    "verificationDocuments": [],
    "featuredMentor": true,
    "languagesSpoken": ["English", "Mandarin"],
    "timezone": "America/New_York",
    "stats": {
      "activeRelationships": 3,
      "totalSessions": 48,
      "pendingRequests": 2,
      "averageRating": 4.8
    }
  }
}
```

### Create/Update Mentor Profile
```http
PUT /api/v1/mentorship/profile/mentor
```

**Authorization**: Required + MENTOR role

**Request Body**:
```json
{
  "professionalTitle": "Senior Software Engineer",
  "yearsOfExperience": 8,
  "company": "TechCorp",
  "industry": "Technology",
  "bio": "I help engineers level up...",
  "hourlyRate": 150,
  "availabilityPreferences": {},
  "mentorshipTypes": ["technical", "career"],
  "maxMentees": 4,
  "languagesSpoken": ["English", "Mandarin"],
  "timezone": "America/New_York"
}
```

### Get My Mentee Profile
```http
GET /api/v1/mentorship/profile/mentee
```

**Authorization**: Required

**Response**:
```json
{
  "success": true,
  "message": "Mentee profile fetched",
  "data": {
    "id": 1,
    "userId": 456,
    "careerLevel": "Junior",
    "goals": ["Improve technical skills", "Career guidance"],
    "preferredTopics": ["JavaScript", "React"],
    "budgetRange": "$50-100",
    "availability": {},
    "learningStyle": "Hands-on",
    "background": "CS graduate, 1 year experience",
    "expectations": "Looking for regular guidance...",
    "stats": {
      "activeRelationships": 1,
      "totalSessions": 4,
      "pendingRequests": 1,
      "averageRating": 4.5
    }
  }
}
```

### Create/Update Mentee Profile
```http
PUT /api/v1/mentorship/profile/mentee
```

**Authorization**: Required

**Request Body**:
```json
{
  "careerLevel": "Junior",
  "goals": ["Improve technical skills", "Career guidance"],
  "preferredTopics": ["JavaScript", "React"],
  "budgetRange": "$50-100",
  "availability": {},
  "learningStyle": "Hands-on",
  "background": "CS graduate, 1 year experience",
  "expectations": "Looking for regular guidance..."
}
```

## Skills Management

### Add Mentor Skill
```http
POST /api/v1/mentorship/skills
```

**Authorization**: Required + MENTOR role

**Request Body**:
```json
{
  "skillId": 1,
  "proficiencyLevel": "EXPERT",
  "yearsOfExperience": 8
}
```

### Update Mentor Skill
```http
PUT /api/v1/mentorship/skills/{skillId}
```

**Authorization**: Required + MENTOR role

### Remove Mentor Skill
```http
DELETE /api/v1/mentorship/skills/{skillId}
```

**Authorization**: Required + MENTOR role

## Mentorship Requests

### Create Mentorship Request
```http
POST /api/v1/mentorship/requests
```

**Authorization**: Required

**Request Body**:
```json
{
  "mentorId": 1,
  "requestType": "ongoing",
  "topicDescription": "Looking for guidance on advanced React patterns and career growth",
  "goals": ["Master React", "Career advice"],
  "expectedDuration": "3 months",
  "proposedSchedule": {
    "frequency": "weekly",
    "preferredDays": ["Monday", "Wednesday"],
    "timeRange": "18:00-20:00"
  },
  "budget": 150,
  "urgency": "normal",
  "message": "Hi Sarah, I've been following your work and would love your guidance...",
  "skills": [
    { "skillId": 1, "priority": 1 },
    { "skillId": 2, "priority": 2 }
  ]
}
```

**Response**:
```json
{
  "success": true,
  "message": "Mentorship request created",
  "data": {
    "id": 123,
    "mentorId": 1,
    "status": "pending",
    "expiresAt": "2024-01-17T10:30:00Z",
    "requestedAt": "2024-01-15T10:30:00Z"
  }
}
```

### Get My Requests
```http
GET /api/v1/mentorship/requests
```

**Authorization**: Required

**Query Parameters**:
- `status` (string, optional)
- `type` (string, optional: "sent" | "received")

**Response**:
```json
{
  "success": true,
  "message": "Requests fetched",
  "data": {
    "requests": [
      {
        "id": 123,
        "mentor": {
          "id": 1,
          "name": "Sarah Chen",
          "professionalTitle": "Senior Software Engineer"
        },
        "mentee": {
          "id": 456,
          "name": "Alex Kumar"
        },
        "status": "pending",
        "requestType": "ongoing",
        "topicDescription": "Looking for guidance on advanced React...",
        "goals": ["Master React", "Career advice"],
        "budget": 150,
        "urgency": "normal",
        "message": "Hi Sarah, I've been following...",
        "requestedAt": "2024-01-15T10:30:00Z",
        "expiresAt": "2024-01-17T10:30:00Z",
        "skills": [
          {
            "skill": {
              "id": 1,
              "name": "React",
              "category": "Frontend"
            },
            "priority": 1
          }
        ]
      }
    ]
  }
}
```

### Respond to Request
```http
PUT /api/v1/mentorship/requests/{requestId}/respond
```

**Authorization**: Required + MENTOR role

**Request Body**:
```json
{
  "action": "accept",
  "message": "I'd be happy to mentor you! Let's start with a call..."
}
```

OR

```json
{
  "action": "reject",
  "reason": "Currently at capacity with mentees"
}
```

### Withdraw Request
```http
DELETE /api/v1/mentorship/requests/{requestId}
```

**Authorization**: Required (only by requester)

## Mentorship Relationships

### Get My Relationships
```http
GET /api/v1/mentorship/relationships
```

**Authorization**: Required

**Query Parameters**:
- `status` (string, optional)
- `type` (string, optional: "mentor" | "mentee")

**Response**:
```json
{
  "success": true,
  "message": "Relationships fetched",
  "data": {
    "relationships": [
      {
        "id": 1,
        "mentor": {
          "id": 1,
          "name": "Sarah Chen",
          "professionalTitle": "Senior Software Engineer"
        },
        "mentee": {
          "id": 456,
          "name": "Alex Kumar"
        },
        "status": "active",
        "type": "mixed",
        "frequency": "weekly",
        "duration": "3 months",
        "goals": ["Master React", "Career advice"],
        "startDate": "2024-01-15",
        "nextSessionDate": "2024-01-22",
        "stats": {
          "totalSessions": 4,
          "completedSessions": 3,
          "upcomingSessions": 1,
          "averageRating": 4.8
        }
      }
    ]
  }
}
```

### Get Relationship Details
```http
GET /api/v1/mentorship/relationships/{relationshipId}
```

**Authorization**: Required (participant only)

### Update Relationship
```http
PUT /api/v1/mentorship/relationships/{relationshipId}
```

**Authorization**: Required (participant only)

**Request Body**:
```json
{
  "goals": ["Updated goals"],
  "frequency": "bi-weekly",
  "progressNotes": "Making good progress on React patterns..."
}
```

### Pause/Resume Relationship
```http
PUT /api/v1/mentorship/relationships/{relationshipId}/status
```

**Authorization**: Required (participant only)

**Request Body**:
```json
{
  "status": "paused",
  "reason": "Busy with work project"
}
```

### End Relationship
```http
POST /api/v1/mentorship/relationships/{relationshipId}/end
```

**Authorization**: Required (participant only)

**Request Body**:
```json
{
  "reason": "Goals achieved, ready to conclude mentorship",
  "satisfactionScore": 5
}
```

## Sessions

### Get Relationship Sessions
```http
GET /api/v1/mentorship/relationships/{relationshipId}/sessions
```

**Authorization**: Required (participant only)

**Query Parameters**:
- `status` (string, optional)
- `fromDate` (date, optional)
- `toDate` (date, optional)

**Response**:
```json
{
  "success": true,
  "message": "Sessions fetched",
  "data": {
    "sessions": [
      {
        "id": 1,
        "scheduledStart": "2024-01-22T18:00:00Z",
        "scheduledEnd": "2024-01-22T19:00:00Z",
        "status": "completed",
        "type": "video",
        "topic": "React Hooks Deep Dive",
        "agenda": "Review custom hooks, discuss use cases...",
        "actualStart": "2024-01-22T18:05:00Z",
        "actualEnd": "2024-01-22T19:10:00Z",
        "notes": "Great discussion on useCallback...",
        "recordingUrl": "https://recording.url/session/123",
        "paymentStatus": "paid",
        "topics": [
          {
            "skill": {
              "id": 2,
              "name": "React"
            }
          }
        ]
      }
    ]
  }
}
```

### Schedule Session
```http
POST /api/v1/mentorship/relationships/{relationshipId}/sessions
```

**Authorization**: Required (participant only)

**Request Body**:
```json
{
  "scheduledStart": "2024-01-29T18:00:00Z",
  "scheduledEnd": "2024-01-29T19:00:00Z",
  "type": "video",
  "topic": "State Management Patterns",
  "agenda": "Compare Redux, Zustand, Context API...",
  "topics": [
    { "skillId": 2 }
  ]
}
```

### Update Session
```http
PUT /api/v1/mentorship/sessions/{sessionId}
```

**Authorization**: Required (participant only)

### Start Session
```http
POST /api/v1/mentorship/sessions/{sessionId}/start
```

**Authorization**: Required (participant only)

### End Session
```http
POST /api/v1/mentorship/sessions/{sessionId}/end
```

**Authorization**: Required (participant only)

**Request Body**:
```json
{
  "notes": "Covered advanced state management patterns...",
  "recordingUrl": "https://recording.url/session/124"
}
```

### Cancel Session
```http
POST /api/v1/mentorship/sessions/{sessionId}/cancel
```

**Authorization**: Required (participant only)

**Request Body**:
```json
{
  "reason": "Scheduling conflict",
  "refundPolicy": "full" // or "partial" based on timing
}
```

## Availability Management

### Get My Availability
```http
GET /api/v1/mentorship/availability
```

**Authorization**: Required + MENTOR role

**Response**:
```json
{
  "success": true,
  "message": "Availability fetched",
  "data": {
    "availability": [
      {
        "id": 1,
        "dayOfWeek": 1,
        "startTime": "18:00",
        "endTime": "20:00",
        "timezone": "America/New_York",
        "recurring": true,
        "status": "available",
        "bookingBuffer": 60,
        "maxSessionsPerDay": 3
      }
    ]
  }
}
```

### Set Availability
```http
POST /api/v1/mentorship/availability
```

**Authorization**: Required + MENTOR role

**Request Body**:
```json
{
  "dayOfWeek": 1,
  "startTime": "18:00",
  "endTime": "20:00",
  "timezone": "America/New_York",
  "recurring": true,
  "bookingBuffer": 60,
  "maxSessionsPerDay": 3
}
```

### Update Availability
```http
PUT /api/v1/mentorship/availability/{availabilityId}
```

**Authorization**: Required + MENTOR role

### Delete Availability
```http
DELETE /api/v1/mentorship/availability/{availabilityId}
```

**Authorization**: Required + MENTOR role

## Packages

### Get My Packages
```http
GET /api/v1/mentorship/packages
```

**Authorization**: Required + MENTOR role

### Create Package
```http
POST /api/v1/mentorship/packages
```

**Authorization**: Required + MENTOR role

**Request Body**:
```json
{
  "name": "Frontend Mastery Package",
  "description": "Comprehensive frontend development mentorship...",
  "type": "PACKAGE",
  "duration": "3 months",
  "sessionCount": 12,
  "price": 1500,
  "currency": "USD",
  "features": {
    "weeklySessions": true,
    "codeReview": true,
    "portfolioReview": true,
    "interviewPrep": true,
    "prioritySupport": true
  },
  "requirements": "Basic JavaScript knowledge required"
}
```

### Update Package
```http
PUT /api/v1/mentorship/packages/{packageId}
```

**Authorization**: Required + MENTOR role

### Delete Package
```http
DELETE /api/v1/mentorship/packages/{packageId}
```

**Authorization**: Required + MENTOR role

## Feedback

### Submit Session Feedback
```http
POST /api/v1/mentorship/sessions/{sessionId}/feedback
```

**Authorization**: Required (participant only)

**Request Body**:
```json
{
  "rating": 5,
  "communicationRating": 5,
  "expertiseRating": 5,
  "helpfulnessRating": 5,
  "professionalismRating": 5,
  "comments": "Excellent session! Very insightful...",
  "isPublic": false
}
```

### Submit Relationship Feedback
```http
POST /api/v1/mentorship/relationships/{relationshipId}/feedback
```

**Authorization**: Required (participant only)

### Get Feedback Received
```http
GET /api/v1/mentorship/feedback/received
```

**Authorization**: Required

**Query Parameters**:
- `type` (string, optional: "session" | "relationship")
- `public` (boolean, optional)

### Get Feedback Given
```http
GET /api/v1/mentorship/feedback/given
```

**Authorization**: Required

### Update Feedback Helpfulness
```http
POST /api/v1/mentorship/feedback/{feedbackId}/helpful
```

**Authorization**: Required

## Trust Score

### Get My Trust Score
```http
GET /api/v1/mentorship/trust-score
```

**Authorization**: Required

**Response**:
```json
{
  "success": true,
  "message": "Trust score fetched",
  "data": {
    "overallScore": 85.0,
    "reliabilityScore": 90.0,
    "expertiseScore": 88.0,
    "communicationScore": 87.0,
    "professionalismScore": 89.0,
    "reviewCount": 12,
    "responseRate": 90.0,
    "completionRate": 95.0,
    "onTimeRate": 98.0,
    "disputeCount": 0,
    "lastCalculatedAt": "2024-01-15T10:30:00Z",
    "trendDirection": "up",
    "breakdown": {
      "factors": [
        {
          "name": "Session Completion",
          "weight": 0.3,
          "score": 95.0,
          "impact": "+2.5"
        },
        {
          "name": "Response Time",
          "weight": 0.2,
          "score": 88.0,
          "impact": "+1.8"
        }
      ]
    }
  }
}
```

---

## ADMIN ENDPOINTS

### Get All Mentorship Requests
```http
GET /api/v1/mentorship/admin/requests
```

**Authorization**: Required + ADMIN role

**Query Parameters**:
- `status` (string, optional)
- `mentorId` (number, optional)
- `menteeId` (number, optional)
- `fromDate` (date, optional)
- `toDate` (date, optional)

### Get All Relationships
```http
GET /api/v1/mentorship/admin/relationships
```

**Authorization**: Required + ADMIN role

### Get System Statistics
```http
GET /api/v1/mentorship/admin/stats
```

**Authorization**: Required + ADMIN role

**Response**:
```json
{
  "success": true,
  "message": "System statistics fetched",
  "data": {
    "overview": {
      "totalMentors": 145,
      "totalMentees": 892,
      "activeRelationships": 234,
      "totalSessions": 1847,
      "averageRating": 4.6
    },
    "monthlyStats": [
      {
        "month": "2024-01",
        "newRequests": 89,
        "newRelationships": 34,
        "completedSessions": 156,
        "revenue": 12450.00
      }
    ],
    "topMentors": [
      {
        "mentorId": 1,
        "name": "Sarah Chen",
        "activeRelationships": 8,
        "averageRating": 4.9,
        "revenue": 2400.00
      }
    ],
    "popularSkills": [
      {
        "skillName": "React",
        "requestCount": 45,
        "growth": 12.5
      }
    ]
  }
}
```

### Verify Mentor
```http
POST /api/v1/mentorship/admin/mentors/{mentorId}/verify
```

**Authorization**: Required + ADMIN role

**Request Body**:
```json
{
  "action": "verify",
  "reason": "Professional experience verified via LinkedIn"
}
```

### Handle Disputes
```http
POST /api/v1/mentorship/admin/disputes/{disputeId}/resolve
```

**Authorization**: Required + ADMIN role

### Adjust Trust Score
```http
POST /api/v1/mentorship/admin/trust-scores/{userId}/adjust
```

**Authorization**: Required + ADMIN role

**Request Body**:
```json
{
  "adjustment": -5.0,
  "reason": "Multiple session cancellations",
  "temporary": true,
  "expiresAt": "2024-03-01T00:00:00Z"
}
```

---

## ERROR RESPONSES

All endpoints return consistent error format:

```json
{
  "success": false,
  "message": "Error description",
  "data": null,
  "meta": {
    "code": "VALIDATION_ERROR",
    "details": {
      "field": "hourlyRate",
      "message": "Hourly rate must be positive"
    }
  }
}
```

### Common Error Codes
- `VALIDATION_ERROR` (400): Invalid input data
- `UNAUTHORIZED` (401): Authentication required
- `FORBIDDEN` (403): Insufficient permissions
- `NOT_FOUND` (404): Resource not found
- `CONFLICT` (409): Resource conflict (e.g., duplicate request)
- `RATE_LIMITED` (429): Too many requests
- `INTERNAL_ERROR` (500): Server error

---

## WEBHOOKS

### Session Events
- `session.scheduled`
- `session.started`
- `session.completed`
- `session.cancelled`

### Relationship Events
- `relationship.started`
- `relationship.paused`
- `relationship.completed`
- `relationship.ended`

### Feedback Events
- `feedback.submitted`
- `feedback.updated`

Webhook payload format:
```json
{
  "event": "session.completed",
  "data": {
    "sessionId": 123,
    "relationshipId": 45,
    "mentorId": 1,
    "menteeId": 2,
    "completedAt": "2024-01-22T19:10:00Z"
  },
  "timestamp": "2024-01-22T19:10:00Z"
}
```
