# TRUST & SAFETY ENGINE - API Design

## Overview

This document defines the comprehensive RESTful API endpoints for the Trust & Safety Engine. The API is designed for production-grade scalability, security, and integration with existing systems.

---

## API ARCHITECTURE

### Base URL
```
https://api.platform.com/v1/trust-safety
```

### Authentication
- JWT-based authentication
- Role-based access control (RBAC)
- API key support for service-to-service communication
- Rate limiting per endpoint and user role

### Response Format
```json
{
  "success": true,
  "data": {},
  "message": "Operation completed successfully",
  "timestamp": "2026-02-12T10:50:00.000Z",
  "requestId": "req_123456789",
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "hasMore": true
  }
}
```

### Error Format
```json
{
  "success": false,
  "error": {
    "code": "TSE_001",
    "message": "Trust score calculation failed",
    "details": "User data not found",
    "timestamp": "2026-02-12T10:50:00.000Z",
    "requestId": "req_123456789"
  }
}
```

---

## TRUST ENGINE ENDPOINTS

### User Trust Score Management

#### Get User Trust Score
```http
GET /trust-safety/trust/users/{userId}/score
```

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": 12345,
    "overallScore": 75,
    "trustLevel": "TRUSTED",
    "scores": {
      "contentQuality": 80,
      "communityEngagement": 70,
      "reliability": 75
    },
    "factors": {
      "contentQualityWeight": 0.4,
      "communityEngagementWeight": 0.3,
      "reliabilityWeight": 0.3
    },
    "calculatedAt": "2026-02-12T10:50:00.000Z",
    "nextRecalculationAt": "2026-02-13T10:50:00.000Z"
  }
}
```

#### Update User Trust Score
```http
PUT /trust-safety/trust/users/{userId}/score
```

**Request Body:**
```json
{
  "contentQualityScore": 85,
  "communityEngagementScore": 72,
  "reliabilityScore": 78,
  "reason": "Manual adjustment after appeal review",
  "issuedBy": 67890
}
```

#### Get Trust Score History
```http
GET /trust-safety/trust/users/{userId}/score/history?days=30
```

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": 12345,
    "period": "30 days",
    "trend": "increasing",
    "change": +5,
    "volatility": 0.15,
    "dataPoints": [
      {
        "date": "2026-02-01",
        "score": 70,
        "level": "ESTABLISHED"
      },
      {
        "date": "2026-02-12",
        "score": 75,
        "level": "TRUSTED"
      }
    ]
  }
}
```

#### Batch Calculate Trust Scores
```http
POST /trust-safety/trust/scores/batch
```

**Request Body:**
```json
{
  "userIds": [12345, 67890, 11111],
  "forceRecalculation": false
}
```

### User Reputation Management

#### Get User Reputation
```http
GET /trust-safety/trust/users/{userId}/reputation
```

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": 12345,
    "contentReputation": {
      "postQuality": 8.5,
      "commentQuality": 7.8,
      "originalityScore": 0.85,
      "engagementQuality": 8.2,
      "consistencyScore": 7.9
    },
    "communityReputation": {
      "helpfulReports": 12,
      "positiveInteractions": 45,
      "mentorshipScore": 6.5,
      "collaborationScore": 7.2,
      "peerRecognition": 8
    },
    "behavioralReputation": {
      "complianceScore": 9.1,
      "policyAdherence": 8.8,
      "responseTimeliness": 7.5,
      "constructiveFeedback": 8.0
    },
    "reputationTrend": "increasing",
    "volatilityScore": 0.12,
    "badges": ["helpful_member", "quality_contributor"],
    "achievements": ["first_100_posts", "mentor_badge"]
  }
}
```

#### Get Trust Level Benefits
```http
GET /trust-safety/trust/levels/{level}/benefits
```

**Response:**
```json
{
  "success": true,
  "data": {
    "level": "TRUSTED",
    "privileges": [
      "enhanced_posting_limits",
      "access_to_beta_features",
      "reduced_moderation_scrutiny"
    ],
    "restrictions": [],
    "requirements": {
      "minimumScore": 75,
      "minimumAge": "90 days",
      "minimumActivity": "50 posts"
    }
  }
}
```

---

## MODERATION ENGINE ENDPOINTS

### Report Management

#### Create Report
```http
POST /trust-safety/moderation/reports
```

**Request Body:**
```json
{
  "reportedUserId": 67890,
  "reportedPostId": 11111,
  "severity": "HIGH",
  "flagType": "HARASSMENT",
  "reason": "User is harassing others in comments",
  "description": "Detailed description of the harassment",
  "evidenceUrls": ["https://example.com/evidence1.jpg"],
  "reporterId": 12345
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "reportId": "report_123456789",
    "status": "SUBMITTED",
    "priority": "HIGH",
    "estimatedReviewTime": "2 hours",
    "submittedAt": "2026-02-12T10:50:00.000Z"
  }
}
```

#### Get Report
```http
GET /trust-safety/moderation/reports/{reportId}
```

#### Get Reports (Filtered)
```http
GET /trust-safety/moderation/reports?status=PENDING&severity=HIGH&page=1&limit=20
```

#### Update Report Status
```http
PUT /trust-safety/moderation/reports/{reportId}/status
```

**Request Body:**
```json
{
  "status": "RESOLVED",
  "resolution": "VALID",
  "resolutionNotes": "Harassment confirmed, warning issued",
  "resolvedBy": 67890
}
```

### Case Management

#### Create Moderation Case
```http
POST /trust-safety/moderation/cases
```

**Request Body:**
```json
{
  "title": "Harassment case against user 67890",
  "description": "Multiple reports of harassment behavior",
  "priority": "HIGH",
  "reportIds": ["report_123", "report_124"],
  "assignedModeratorId": 67890
}
```

#### Get Case
```http
GET /trust-safety/moderation/cases/{caseId}
```

#### Update Case Assignment
```http
PUT /trust-safety/moderation/cases/{caseId}/assignment
```

**Request Body:**
```json
{
  "assignedModeratorId": 67890,
  "reason": "Specialist in harassment cases"
}
```

#### Resolve Case
```http
PUT /trust-safety/moderation/cases/{caseId}/resolution
```

**Request Body:**
```json
{
  "outcome": "RESOLVED",
  "summary": "User warned and educated on community guidelines",
  "actions": ["warning_issued", "trust_deduction"],
  "lessonsLearned": "Need better harassment detection tools"
}
```

### AI Moderation

#### Get AI Analysis
```http
GET /trust-safety/moderation/ai/analysis/{contentId}?type=post
```

**Response:**
```json
{
  "success": true,
  "data": {
    "contentId": 11111,
    "contentType": "post",
    "analysis": {
      "confidence": 0.85,
      "riskLevel": "medium",
      "categoryScores": {
        "harassment": 0.7,
        "spam": 0.1,
        "inappropriate": 0.3
      },
      "recommendations": ["human_review"],
      "processingTime": 150
    },
    "analyzedAt": "2026-02-12T10:50:00.000Z",
    "modelVersion": "1.2.0"
  }
}
```

#### Train AI Model
```http
POST /trust-safety/moderation/ai/train
```

**Request Body:**
```json
{
  "trainingData": {
    "startDate": "2026-01-01",
    "endDate": "2026-01-31",
    "categories": ["harassment", "spam", "inappropriate"]
  },
  "modelType": "content_classification",
  "hyperparameters": {
    "learningRate": 0.001,
    "epochs": 100
  }
}
```

---

## ENFORCEMENT ENGINE ENDPOINTS

### Enforcement Actions

#### Execute Enforcement Action
```http
POST /trust-safety/enforcement/actions
```

**Request Body:**
```json
{
  "type": "USER_SUSPENSION",
  "targetUserId": 67890,
  "reason": "Repeated policy violations",
  "details": "User has received 3 warnings for harassment",
  "duration": 7,
  "issuedBy": 12345,
  "appealable": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "actionId": "action_123456789",
    "type": "USER_SUSPENSION",
    "status": "ACTIVE",
    "startDate": "2026-02-12T10:50:00.000Z",
    "endDate": "2026-02-19T10:50:00.000Z",
    "restrictions": ["posting", "commenting", "messaging"],
    "appealDeadline": "2026-02-19T10:50:00.000Z"
  }
}
```

#### Get User Enforcement Status
```http
GET /trust-safety/enforcement/users/{userId}/status
```

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": 67890,
    "activeEnforcements": [
      {
        "actionId": "action_123",
        "type": "USER_SUSPENSION",
        "status": "ACTIVE",
        "endDate": "2026-02-19T10:50:00.000Z",
        "restrictions": ["posting", "commenting"]
      }
    ],
    "totalActions": 5,
    "currentRestrictions": ["posting", "commenting", "messaging"],
    "trustScoreImpact": {
      "totalDeductions": 3,
      "totalPointsLost": 25,
      "lastDeduction": "2026-02-10T15:30:00.000Z"
    },
    "appealEligibility": {
      "canAppeal": true,
      "appealableActions": ["action_123"],
      "maxAppeals": 3
    }
  }
}
```

#### Get Enforcement History
```http
GET /trust-safety/enforcement/users/{userId}/history?page=1&limit=20
```

### Appeals Management

#### Submit Appeal
```http
POST /trust-safety/enforcement/appeals
```

**Request Body:**
```json
{
  "actionId": "action_123456789",
  "userId": 67890,
  "appealReason": "Suspension was unjustified",
  "appealDescription": "I believe the suspension was applied in error...",
  "evidenceUrls": ["https://example.com/evidence1.jpg"]
}
```

#### Get Appeal
```http
GET /trust-safety/enforcement/appeals/{appealId}
```

#### Update Appeal Status
```http
PUT /trust-safety/enforcement/appeals/{appealId}/status
```

**Request Body:**
```json
{
  "status": "APPROVED",
  "reviewNotes": "Appeal approved, suspension lifted",
  "finalDecision": "reverse",
  "reviewedBy": 12345
}
```

### Shadow Ban Management

#### Apply Shadow Ban
```http
POST /trust-safety/enforcement/shadow-ban
```

**Request Body:**
```json
{
  "userId": 67890,
  "types": ["CONTENT", "ENGAGEMENT"],
  "severity": "medium",
  "duration": 30,
  "reason": "Coordinated inauthentic behavior",
  "stealthLevel": "medium",
  "issuedBy": 12345
}
```

---

## AUDIT ENGINE ENDPOINTS

### Audit Logs

#### Create Audit Log
```http
POST /trust-safety/audit/logs
```

**Request Body:**
```json
{
  "logType": "MODERATOR_ACTION",
  "actionType": "case_resolved",
  "target": "case",
  "targetId": "case_123",
  "userId": 12345,
  "details": {
    "caseOutcome": "resolved",
    "actionsTaken": ["warning_issued"]
  },
  "riskLevel": "medium"
}
```

#### Query Audit Logs
```http
GET /trust-safety/audit/logs?userId=12345&logType=MODERATOR_ACTION&startDate=2026-02-01&endDate=2026-02-12
```

**Response:**
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "audit_123456789",
        "timestamp": "2026-02-12T10:50:00.000Z",
        "logType": "MODERATOR_ACTION",
        "actionType": "case_resolved",
        "userId": 12345,
        "details": {
          "caseId": "case_123",
          "outcome": "resolved"
        }
      }
    ],
    "total": 150,
    "page": 1,
    "limit": 20,
    "hasMore": true
  }
}
```

#### Get Decision Trail
```http
GET /trust-safety/audit/decision-trails/{caseId}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "caseId": "case_123",
    "trail": [
      {
        "id": "trail_123",
        "timestamp": "2026-02-12T09:00:00.000Z",
        "decision": {
          "type": "initial_review",
          "outcome": "escalate",
          "reasoning": "High severity requires senior review"
        },
        "decisionMaker": {
          "userId": 12345,
          "role": "MODERATOR"
        }
      },
      {
        "id": "trail_124",
        "timestamp": "2026-02-12T10:30:00.000Z",
        "decision": {
          "type": "final_decision",
          "outcome": "suspend_user",
          "reasoning": "Clear violation of harassment policy"
        },
        "decisionMaker": {
          "userId": 67890,
          "role": "ADMIN"
        }
      }
    ]
  }
}
```

### Compliance Reporting

#### Generate Compliance Report
```http
POST /trust-safety/audit/compliance/reports
```

**Request Body:**
```json
{
  "category": "GDPR",
  "startDate": "2026-01-01",
  "endDate": "2026-01-31",
  "format": "json",
  "includeDetails": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "reportId": "report_123456789",
    "category": "GDPR",
    "period": {
      "start": "2026-01-01",
      "end": "2026-01-31"
    },
    "generatedAt": "2026-02-12T10:50:00.000Z",
    "downloadUrl": "/trust-safety/audit/reports/report_123456789/download",
    "expiresAt": "2026-02-19T10:50:00.000Z"
  }
}
```

#### Download Compliance Report
```http
GET /trust-safety/audit/reports/{reportId}/download
```

### Accountability Metrics

#### Get Moderator Performance
```http
GET /trust-safety/audit/accountability/moderators/{moderatorId}?period=30days
```

**Response:**
```json
{
  "success": true,
  "data": {
    "moderatorId": 12345,
    "period": "30 days",
    "performance": {
      "accuracy": 0.92,
      "consistency": 0.88,
      "timeliness": 0.95,
      "quality": 0.90
    },
    "bias": {
      "detected": false,
      "types": [],
      "severity": "low"
    },
    "appeals": {
      "total": 5,
      "successful": 1,
      "overturned": 1,
      "upheld": 3
    },
    "development": {
      "trainingCompleted": ["harassment_detection_v2"],
      "certifications": ["advanced_moderator"],
      "mentorshipHours": 8
    }
  }
}
```

---

## ADMINISTRATION ENDPOINTS

### System Health

#### Get System Health
```http
GET /trust-safety/admin/health
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2026-02-12T10:50:00.000Z",
    "uptime": 2592000,
    "engines": {
      "trust": {
        "status": "healthy",
        "metrics": {
          "calculationsPerSecond": 15.5,
          "averageResponseTime": 120
        }
      },
      "moderation": {
        "status": "healthy",
        "metrics": {
          "reportsProcessed": 1250,
          "averageProcessingTime": 300
        }
      },
      "enforcement": {
        "status": "healthy",
        "metrics": {
          "activeActions": 45,
          "appealsPending": 8
        }
      },
      "audit": {
        "status": "healthy",
        "metrics": {
          "logsPerSecond": 25.2,
          "storageUsed": "2.5GB"
        }
      }
    },
    "system": {
      "memory": {
        "used": "512MB",
        "total": "2GB"
      },
      "cpu": {
        "usage": "15%"
      }
    }
  }
}
```

### Configuration Management

#### Get System Configuration
```http
GET /trust-safety/admin/config
```

#### Update System Configuration
```http
PUT /trust-safety/admin/config
```

**Request Body:**
```json
{
  "trustEngine": {
    "recalculationInterval": 3600000,
    "decayRate": 0.01
  },
  "moderationEngine": {
    "autoActionThreshold": 0.9,
    "batchSize": 50
  },
  "enforcementEngine": {
    "appealWindow": 7,
    "maxAppeals": 3
  }
}
```

### Analytics Dashboard

#### Get Dashboard Metrics
```http
GET /trust-safety/admin/dashboard?period=7days
```

**Response:**
```json
{
  "success": true,
  "data": {
    "period": "7 days",
    "summary": {
      "totalReports": 1250,
      "resolvedReports": 1100,
      "pendingReports": 150,
      "averageResolutionTime": "4.5 hours"
    },
    "trends": {
      "reportsTrend": "increasing",
      "resolutionRateTrend": "stable",
      "appealSuccessRate": "decreasing"
    },
    "topIssues": [
      {
        "type": "HARASSMENT",
        "count": 450,
        "percentage": 36
      },
      {
        "type": "SPAM",
        "count": 320,
        "percentage": 25.6
      }
    ],
    "moderatorWorkload": [
      {
        "moderatorId": 12345,
        "activeCases": 15,
        "resolvedToday": 8
      }
    ]
  }
}
```

---

## WEBHOOK ENDPOINTS

### Webhook Configuration

#### Register Webhook
```http
POST /trust-safety/webhooks
```

**Request Body:**
```json
{
  "url": "https://your-platform.com/webhooks/trust-safety",
  "events": ["report_submitted", "action_executed", "appeal_submitted"],
  "secret": "webhook_secret_key",
  "active": true
}
```

#### Get Webhooks
```http
GET /trust-safety/webhooks
```

#### Update Webhook
```http
PUT /trust-safety/webhooks/{webhookId}
```

#### Delete Webhook
```http
DELETE /trust-safety/webhooks/{webhookId}
```

### Webhook Events

#### Webhook Payload Structure
```json
{
  "eventId": "event_123456789",
  "eventType": "report_submitted",
  "timestamp": "2026-02-12T10:50:00.000Z",
  "data": {
    "reportId": "report_123",
    "severity": "HIGH",
    "reporterId": 12345
  },
  "signature": "sha256=generated_signature"
}
```

---

## RATE LIMITING

### Rate Limit Rules

| Endpoint | User | Moderator | Admin | Service |
|----------|------|-----------|-------|---------|
| POST /reports | 5/hour | 20/hour | 100/hour | 1000/hour |
| GET /trust-scores | 100/hour | 500/hour | 2000/hour | 5000/hour |
| POST /actions | 0/hour | 50/hour | 200/hour | 1000/hour |
| GET /audit/logs | 50/hour | 200/hour | 1000/hour | 5000/hour |

### Rate Limit Headers
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1644678900
X-RateLimit-Retry-After: 60
```

---

## API VERSIONING

### Version Strategy
- URL-based versioning: `/v1/`, `/v2/`
- Backward compatibility for at least 2 versions
- Deprecation warnings in response headers
- Migration guides for breaking changes

### Version Headers
```http
API-Version: v1
Supported-Versions: v1,v2
Deprecated-Versions: v0
```

---

## SECURITY CONSIDERATIONS

### Authentication
- JWT tokens with 15-minute expiration
- Refresh tokens with 7-day expiration
- MFA required for admin actions
- API key rotation for service accounts

### Authorization
- Role-based access control (RBAC)
- Resource-level permissions
- Attribute-based access control (ABAC) for complex scenarios
- Just-in-time access for emergency situations

### Data Protection
- PII encryption at rest and in transit
- Data masking in API responses
- Audit logging for all data access
- GDPR right to be forgotten implementation

### Input Validation
- JSON schema validation for all request bodies
- SQL injection prevention
- XSS protection
- File upload validation and scanning

---

## PERFORMANCE OPTIMIZATION

### Caching Strategy
- Redis caching for frequently accessed data
- CDN caching for static responses
- Application-level caching for computed metrics
- Database query result caching

### Pagination
- Cursor-based pagination for large datasets
- Page size limits (max 100 items per page)
- Total count estimation for fast queries
- Pagination metadata in responses

### Compression
- GZIP compression for all API responses
- Binary response formats for large datasets
- Delta compression for incremental updates

---

*Document version: 1.0*  
*Last updated: February 12, 2026*  
*Author: Trust & Safety Engine Team*
