# Mentorship System Integration Guide

## Overview

This guide provides comprehensive integration contracts and UI hooks for the Mentorship System. It includes API endpoints, data transfer objects, webhook events, and integration patterns for seamless integration with frontend applications and external systems.

## Table of Contents

1. [API Integration](#api-integration)
2. [Data Transfer Objects](#data-transfer-objects)
3. [Webhook Integration](#webhook-integration)
4. [Frontend Integration](#frontend-integration)
5. [Third-Party Integrations](#third-party-integrations)
6. [Error Handling](#error-handling)
7. [Rate Limiting](#rate-limiting)
8. [Authentication](#authentication)

---

## API Integration

### Base URL
```
https://api.example.com/api/v1/mentorship
```

### Authentication
All protected endpoints require JWT authentication:
```http
Authorization: Bearer <jwt_token>
```

### Public Endpoints

#### Discover Mentors
```http
GET /api/v1/mentorship/mentors
```

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Results per page (default: 20, max: 50)
- `industry` (string): Filter by industry
- `skills` (string): Comma-separated skill names
- `minExperience` (number): Minimum years of experience
- `maxRate` (number): Maximum hourly rate
- `featured` (boolean): Filter featured mentors only
- `search` (string): Search in name, title, bio

**Response:**
```json
{
  "success": true,
  "message": "Mentors discovered successfully",
  "data": {
    "mentors": [
      {
        "id": 123,
        "name": "John Doe",
        "professionalTitle": "Senior Software Engineer",
        "yearsOfExperience": 8,
        "company": "Tech Corp",
        "industry": "Technology",
        "bio": "Experienced software engineer...",
        "hourlyRate": 100,
        "mentorshipTypes": ["technical", "career"],
        "languagesSpoken": ["English"],
        "timezone": "UTC",
        "verificationStatus": "VERIFIED",
        "featuredMentor": true,
        "trustScore": {
          "overallScore": 92,
          "reviewCount": 25,
          "responseRate": 95
        },
        "skills": [
          {
            "id": 1,
            "name": "JavaScript",
            "category": "Programming",
            "proficiencyLevel": "EXPERT",
            "verified": true
          }
        ],
        "stats": {
          "activeRelationships": 3,
          "totalSessions": 45,
          "averageRating": 4.8
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8
    }
  }
}
```

#### Get Mentor Profile
```http
GET /api/v1/mentorship/mentors/{mentorId}
```

**Response:**
```json
{
  "success": true,
  "message": "Mentor profile fetched successfully",
  "data": {
    "id": 123,
    "name": "John Doe",
    "professionalTitle": "Senior Software Engineer",
    "yearsOfExperience": 8,
    "company": "Tech Corp",
    "industry": "Technology",
    "bio": "Experienced software engineer passionate about mentoring...",
    "hourlyRate": 100,
    "mentorshipTypes": ["technical", "career"],
    "languagesSpoken": ["English"],
    "timezone": "UTC",
    "verificationStatus": "VERIFIED",
    "featuredMentor": true,
    "trustScore": {
      "overallScore": 92,
      "reviewCount": 25,
      "responseRate": 95
    },
    "skills": [
      {
        "id": 1,
        "name": "JavaScript",
        "category": "Programming",
        "proficiencyLevel": "EXPERT",
        "verified": true
      }
    ],
    "packages": [
      {
        "id": 1,
        "name": "Career Guidance Package",
        "type": "package",
        "duration": "3 months",
        "sessionCount": 6,
        "price": 500,
        "currency": "USD"
      }
    ],
    "availability": [
      {
        "dayOfWeek": 1,
        "startTime": "09:00",
        "endTime": "17:00",
        "timezone": "UTC"
      }
    ],
    "publicReviews": [
      {
        "id": 1,
        "rating": 5,
        "comments": "Excellent mentor!",
        "submittedAt": "2024-01-15T10:00:00Z",
        "helpfulVotes": 12
      }
    ]
  }
}
```

#### Get Skills Taxonomy
```http
GET /api/v1/mentorship/skills
```

**Query Parameters:**
- `category` (string): Filter by category
- `level` (string): Filter by skill level

**Response:**
```json
{
  "success": true,
  "message": "Skills taxonomy fetched successfully",
  "data": {
    "skills": [
      {
        "id": 1,
        "name": "JavaScript",
        "category": "Programming",
        "level": "INTERMEDIATE",
        "demandScore": 85
      }
    ]
  }
}
```

### Protected Endpoints

#### Profile Management

##### Get My Mentor Profile
```http
GET /api/v1/mentorship/profile/mentor
Authorization: Bearer <token>
```

##### Update Mentor Profile
```http
PUT /api/v1/mentorship/profile/mentor
Authorization: Bearer <token>
Content-Type: application/json

{
  "professionalTitle": "Senior Software Engineer",
  "yearsOfExperience": 8,
  "company": "Tech Corp",
  "industry": "Technology",
  "bio": "Experienced software engineer...",
  "hourlyRate": 100,
  "mentorshipTypes": ["technical", "career"],
  "maxMentees": 5,
  "languagesSpoken": ["English"],
  "timezone": "UTC"
}
```

##### Get My Mentee Profile
```http
GET /api/v1/mentorship/profile/mentee
Authorization: Bearer <token>
```

##### Update Mentee Profile
```http
PUT /api/v1/mentorship/profile/mentee
Authorization: Bearer <token>
Content-Type: application/json

{
  "careerLevel": "Junior",
  "goals": ["Learn React", "Career guidance"],
  "preferredTopics": ["JavaScript", "React"],
  "budgetRange": "$50-100",
  "learningStyle": "Hands-on",
  "background": "CS graduate, 1 year experience",
  "expectations": "Looking for regular guidance"
}
```

#### Mentorship Requests

##### Create Request
```http
POST /api/v1/mentorship/requests
Authorization: Bearer <token>
Content-Type: application/json

{
  "mentorId": 123,
  "requestType": "ongoing",
  "topicDescription": "Looking for guidance on advanced JavaScript concepts",
  "goals": ["Master JavaScript", "Career advice"],
  "expectedDuration": "3 months",
  "budget": 100,
  "urgency": "normal",
  "message": "Hi! I would love to learn from your experience",
  "skills": [
    {
      "skillId": 1,
      "priority": 1
    }
  ]
}
```

##### Get My Requests
```http
GET /api/v1/mentorship/requests
Authorization: Bearer <token>
```

**Query Parameters:**
- `status` (string): Filter by status (pending, accepted, rejected, expired, withdrawn)
- `type` (string): Filter by type (sent, received)

##### Respond to Request
```http
PUT /api/v1/mentorship/requests/{requestId}/respond
Authorization: Bearer <token>
Content-Type: application/json

{
  "action": "accept",
  "message": "I would be happy to mentor you!"
}
```

#### Relationships & Sessions

##### Get My Relationships
```http
GET /api/v1/mentorship/relationships
Authorization: Bearer <token>
```

**Query Parameters:**
- `status` (string): Filter by status (active, paused, completed, terminated)
- `type` (string): Filter by type (mentor, mentee)

##### Schedule Session
```http
POST /api/v1/mentorship/relationships/{relationshipId}/sessions
Authorization: Bearer <token>
Content-Type: application/json

{
  "scheduledStart": "2024-02-01T10:00:00Z",
  "scheduledEnd": "2024-02-01T11:00:00Z",
  "type": "video",
  "topic": "Introduction to JavaScript",
  "agenda": "Basic JavaScript concepts and best practices"
}
```

##### Submit Feedback
```http
POST /api/v1/mentorship/sessions/{sessionId}/feedback
Authorization: Bearer <token>
Content-Type: application/json

{
  "rating": 5,
  "communicationRating": 5,
  "expertiseRating": 5,
  "helpfulnessRating": 5,
  "professionalismRating": 5,
  "comments": "Excellent mentor! Very knowledgeable and patient.",
  "isPublic": true
}
```

---

## Data Transfer Objects

### Mentor Profile DTO

#### Public View
```typescript
interface MentorProfilePublic {
  id: number;
  name: string;
  professionalTitle: string;
  yearsOfExperience: number;
  company?: string;
  industry?: string;
  bio?: string;
  hourlyRate: number;
  mentorshipTypes: string[];
  languagesSpoken: string[];
  timezone: string;
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  featuredMentor: boolean;
  trustScore?: {
    overallScore: number;
    reviewCount: number;
    responseRate: number;
  };
  skills: MentorSkill[];
  stats: {
    activeRelationships: number;
    totalSessions: number;
    averageRating: number;
  };
}
```

#### Private View
```typescript
interface MentorProfilePrivate extends MentorProfilePublic {
  maxMentees: number;
  responseRate?: number;
  averageResponseTime?: number;
  verificationDocuments?: string[];
  availabilityPreferences?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}
```

### Mentorship Request DTO

#### Create View
```typescript
interface MentorshipRequestCreate {
  id: number;
  mentorId: number;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'WITHDRAWN';
  requestType: 'one_time' | 'ongoing';
  topicDescription: string;
  goals: string[];
  expectedDuration?: string;
  budget?: number;
  urgency: 'low' | 'normal' | 'high';
  message: string;
  requestedAt: string;
  expiresAt: string;
  mentor?: MentorProfilePublic;
  skills: RequestSkill[];
}
```

### Session DTO

#### Detail View
```typescript
interface SessionDetail {
  id: number;
  relationshipId: number;
  mentorId: number;
  menteeId: number;
  scheduledStart: string;
  scheduledEnd: string;
  actualStart?: string;
  actualEnd?: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  type: 'video' | 'call' | 'in_person' | 'chat';
  topic?: string;
  agenda?: string;
  notes?: string;
  recordingUrl?: string;
  paymentStatus?: string;
  cancellationReason?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
  mentor?: MentorProfilePublic;
  mentee?: MenteeProfilePublic;
  topics: SessionTopic[];
}
```

### Trust Score DTO

#### Public View
```typescript
interface TrustScorePublic {
  overallScore: number;
  reviewCount: number;
  responseRate: number;
  completionRate: number;
  onTimeRate: number;
  trendDirection: 'up' | 'down' | 'stable';
}
```

---

## Webhook Integration

### Event Types

#### Mentorship Request Events
- `mentorship_request.created` - New mentorship request created
- `mentorship_request.responded` - Request accepted/rejected
- `mentorship_request.expired` - Request expired (48 hours)
- `mentorship_request.withdrawn` - Request withdrawn by mentee

#### Relationship Events
- `mentorship_relationship.started` - New relationship began
- `mentorship_relationship.paused` - Relationship paused
- `mentorship_relationship.completed` - Relationship completed
- `mentorship_relationship.terminated` - Relationship terminated

#### Session Events
- `mentorship_session.scheduled` - Session scheduled
- `mentorship_session.started` - Session started
- `mentorship_session.completed` - Session completed
- `mentorship_session.cancelled` - Session cancelled
- `mentorship_session.no_show` - No-show for session

#### Feedback Events
- `mentorship_feedback.submitted` - New feedback submitted
- `mentorship_feedback.updated` - Feedback updated

#### Trust Score Events
- `mentorship_trust_score.updated` - Trust score recalculated
- `mentorship_trust_score.adjusted` - Manual adjustment by admin

### Webhook Payload Structure

```json
{
  "id": "evt_1640995200000_abc123def",
  "type": "mentorship_request.created",
  "timestamp": "2024-01-15T10:00:00Z",
  "source": "mentorship-system",
  "version": "1.0",
  "data": {
    "id": 123,
    "mentorId": 456,
    "status": "PENDING",
    "requestType": "ongoing",
    "topicDescription": "Looking for guidance on React",
    "goals": ["Learn React", "Career guidance"],
    "message": "Hi! I would love to learn from your experience",
    "requestedAt": "2024-01-15T10:00:00Z",
    "expiresAt": "2024-01-17T10:00:00Z",
    "mentor": {
      "id": 456,
      "name": "John Doe",
      "professionalTitle": "Senior Developer"
    }
  }
}
```

### Webhook Signature Verification

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
    
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}
```

### Webhook Subscription

```javascript
// Subscribe to mentorship events
const subscription = await fetch('/api/v1/mentorship/webhooks/subscribe', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer <token>',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    eventType: 'mentorship_request.created',
    webhookUrl: 'https://your-app.com/webhooks/mentorship',
    secret: 'your-webhook-secret',
    retries: 3,
    timeout: 10000
  })
});
```

---

## Frontend Integration

### React Components

#### Mentor Discovery Component
```typescript
import React, { useState, useEffect } from 'react';
import { mentorshipApi } from '../services/api';

interface Mentor {
  id: number;
  name: string;
  professionalTitle: string;
  yearsOfExperience: number;
  hourlyRate: number;
  trustScore: {
    overallScore: number;
    reviewCount: number;
  };
  skills: MentorSkill[];
}

const MentorDiscovery: React.FC = () => {
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    industry: '',
    skills: '',
    minExperience: 0,
    maxRate: 0
  });

  useEffect(() => {
    fetchMentors();
  }, [filters]);

  const fetchMentors = async () => {
    try {
      setLoading(true);
      const response = await mentorshipApi.discoverMentors(filters);
      setMentors(response.data.mentors);
    } catch (error) {
      console.error('Failed to fetch mentors:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mentor-discovery">
      {/* Filter UI */}
      <div className="filters">
        <input
          type="text"
          placeholder="Industry"
          value={filters.industry}
          onChange={(e) => setFilters({...filters, industry: e.target.value})}
        />
        <input
          type="text"
          placeholder="Skills"
          value={filters.skills}
          onChange={(e) => setFilters({...filters, skills: e.target.value})}
        />
        <input
          type="number"
          placeholder="Min Experience"
          value={filters.minExperience}
          onChange={(e) => setFilters({...filters, minExperience: parseInt(e.target.value)})}
        />
        <input
          type="number"
          placeholder="Max Rate"
          value={filters.maxRate}
          onChange={(e) => setFilters({...filters, maxRate: parseInt(e.target.value)})}
        />
      </div>

      {/* Mentor List */}
      <div className="mentor-list">
        {loading ? (
          <div>Loading...</div>
        ) : (
          mentors.map(mentor => (
            <MentorCard key={mentor.id} mentor={mentor} />
          ))
        )}
      </div>
    </div>
  );
};
```

#### Mentor Card Component
```typescript
interface MentorCardProps {
  mentor: Mentor;
}

const MentorCard: React.FC<MentorCardProps> = ({ mentor }) => {
  const handleRequestMentorship = async () => {
    try {
      await mentorshipApi.createRequest({
        mentorId: mentor.id,
        requestType: 'ongoing',
        topicDescription: 'Interested in mentorship',
        goals: ['Career growth'],
        message: 'Hi! I would love to learn from your experience'
      });
      alert('Request sent successfully!');
    } catch (error) {
      alert('Failed to send request: ' + error.message);
    }
  };

  return (
    <div className="mentor-card">
      <div className="mentor-header">
        <h3>{mentor.name}</h3>
        <p>{mentor.professionalTitle}</p>
        <div className="trust-score">
          ⭐ {mentor.trustScore.overallScore}/100
          <span>({mentor.trustScore.reviewCount} reviews)</span>
        </div>
      </div>
      
      <div className="mentor-details">
        <p><strong>Experience:</strong> {mentor.yearsOfExperience} years</p>
        <p><strong>Rate:</strong> ${mentor.hourlyRate}/hour</p>
        <div className="skills">
          {mentor.skills.map(skill => (
            <span key={skill.id} className="skill-tag">
              {skill.name}
            </span>
          ))}
        </div>
      </div>
      
      <div className="mentor-actions">
        <button onClick={handleRequestMentorship}>
          Request Mentorship
        </button>
        <button onClick={() => window.location.href = `/mentors/${mentor.id}`}>
          View Profile
        </button>
      </div>
    </div>
  );
};
```

#### API Service
```typescript
// services/api.ts
import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const mentorshipApi = {
  discoverMentors: (filters: any) => 
    apiClient.get('/mentorship/mentors', { params: filters }),
    
  getMentorProfile: (mentorId: number) =>
    apiClient.get(`/mentorship/mentors/${mentorId}`),
    
  createRequest: (data: any) =>
    apiClient.post('/mentorship/requests', data),
    
  getMyRequests: () =>
    apiClient.get('/mentorship/requests'),
    
  getMyRelationships: () =>
    apiClient.get('/mentorship/relationships'),
    
  scheduleSession: (relationshipId: number, data: any) =>
    apiClient.post(`/mentorship/relationships/${relationshipId}/sessions`, data),
    
  submitFeedback: (sessionId: number, data: any) =>
    apiClient.post(`/mentorship/sessions/${sessionId}/feedback`, data),
    
  getMyTrustScore: () =>
    apiClient.get('/mentorship/trust-score')
};
```

### State Management (Redux/Context)

#### Redux Slice
```typescript
// store/mentorshipSlice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { mentorshipApi } from '../services/api';

interface MentorshipState {
  mentors: Mentor[];
  requests: MentorshipRequest[];
  relationships: MentorshipRelationship[];
  loading: boolean;
  error: string | null;
}

const initialState: MentorshipState = {
  mentors: [],
  requests: [],
  relationships: [],
  loading: false,
  error: null
};

export const fetchMentors = createAsyncThunk(
  'mentorship/fetchMentors',
  async (filters: any) => {
    const response = await mentorshipApi.discoverMentors(filters);
    return response.data.mentors;
  }
);

export const createRequest = createAsyncThunk(
  'mentorship/createRequest',
  async (requestData: any) => {
    const response = await mentorshipApi.createRequest(requestData);
    return response.data;
  }
);

const mentorshipSlice = createSlice({
  name: 'mentorship',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMentors.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMentors.fulfilled, (state, action) => {
        state.loading = false;
        state.mentors = action.payload;
      })
      .addCase(fetchMentors.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch mentors';
      });
  }
});

export const { clearError } = mentorshipSlice.actions;
export default mentorshipSlice.reducer;
```

---

## Third-Party Integrations

### Calendar Integration

#### Google Calendar
```typescript
import { google } from 'googleapis';

class CalendarIntegration {
  async createSessionEvent(session: Session) {
    const auth = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/calendar']
    });

    const calendar = google.calendar({ version: 'v3', auth });

    const event = {
      summary: `Mentorship Session: ${session.topic}`,
      description: session.agenda,
      start: {
        dateTime: session.scheduledStart,
        timeZone: 'UTC'
      },
      end: {
        dateTime: session.scheduledEnd,
        timeZone: 'UTC'
      },
      attendees: [
        { email: session.mentor.email },
        { email: session.mentee.email }
      ]
    };

    return calendar.events.insert({
      calendarId: 'primary',
      resource: event
    });
  }
}
```

### Payment Integration

#### Stripe Integration
```typescript
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

class PaymentIntegration {
  async createSessionPayment(session: Session) {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: session.mentor.hourlyRate * 100, // Convert to cents
      currency: 'usd',
      metadata: {
        sessionId: session.id.toString(),
        mentorId: session.mentorId.toString(),
        menteeId: session.menteeId.toString()
      }
    });

    return paymentIntent;
  }

  async handleWebhook(event: Stripe.Event) {
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await this.confirmSessionPayment(paymentIntent);
        break;
      case 'payment_intent.payment_failed':
        await this.handlePaymentFailure(event.data.object as Stripe.PaymentIntent);
        break;
    }
  }

  private async confirmSessionPayment(paymentIntent: Stripe.PaymentIntent) {
    const sessionId = parseInt(paymentIntent.metadata.sessionId);
    // Update session payment status
    await prisma.mentorshipSession.update({
      where: { id: sessionId },
      data: { paymentStatus: 'PAID' }
    });
  }
}
```

### Email Integration

#### SendGrid Integration
```typescript
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

class EmailIntegration {
  async sendRequestNotification(request: MentorshipRequest) {
    const msg = {
      to: request.mentor.user.email,
      from: 'noreply@mentorship.com',
      subject: 'New Mentorship Request',
      templateId: 'd-1234567890abcdef1234567890abcdef',
      dynamicTemplateData: {
        mentorName: request.mentor.user.name,
        menteeName: request.mentee.user.name,
        topic: request.topicDescription,
        message: request.message,
        requestLink: `${process.env.FRONTEND_URL}/requests/${request.id}`
      }
    };

    await sgMail.send(msg);
  }

  async sendSessionReminder(session: Session) {
    const msg = {
      to: [session.mentor.user.email, session.mentee.user.email],
      from: 'noreply@mentorship.com',
      subject: 'Session Reminder',
      templateId: 'd-abcdef1234567890abcdef1234567890',
      dynamicTemplateData: {
        sessionTime: session.scheduledStart,
        topic: session.topic,
        joinLink: session.joinLink
      }
    };

    await sgMail.send(msg);
  }
}
```

---

## Error Handling

### Standard Error Response Format
```json
{
  "success": false,
  "message": "Error description",
  "data": null,
  "meta": {
    "code": "ERROR_CODE",
    "details": "Additional error details"
  }
}
```

### Common Error Codes
- `VALIDATION_ERROR` (400) - Invalid input data
- `UNAUTHORIZED` (401) - Authentication required
- `FORBIDDEN` (403) - Insufficient permissions
- `NOT_FOUND` (404) - Resource not found
- `CONFLICT` (409) - Resource conflict
- `RATE_LIMITED` (429) - Too many requests
- `INTERNAL_ERROR` (500) - Server error

### Frontend Error Handling
```typescript
// Error boundary component
class MentorshipErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Mentorship error:', error, errorInfo);
    // Log to error tracking service
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h2>Something went wrong with the mentorship system.</h2>
          <p>Please refresh the page and try again.</p>
          <button onClick={() => this.setState({ hasError: false, error: null })}>
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

---

## Rate Limiting

### Rate Limits by Endpoint
- **Public endpoints**: 100 requests/15 minutes
- **Profile management**: 50 requests/15 minutes
- **Requests**: 5 requests/15 minutes
- **Sessions**: 20 requests/15 minutes
- **Feedback**: 10 requests/15 minutes

### Rate Limit Headers
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

### Handling Rate Limits
```typescript
const handleRateLimit = (error: any) => {
  if (error.response?.status === 429) {
    const resetTime = error.response.headers['x-ratelimit-reset'];
    const waitTime = resetTime ? resetTime * 1000 - Date.now() : 60000;
    
    return new Promise(resolve => {
      setTimeout(() => {
        // Retry the request
        resolve();
      }, waitTime);
    });
  }
  throw error;
};
```

---

## Authentication

### JWT Token Structure
```json
{
  "id": 123,
  "email": "user@example.com",
  "role": "USER" | "MENTOR" | "ADMIN",
  "iat": 1640995200,
  "exp": 1641600000
}
```

### Token Refresh
```typescript
const refreshToken = async () => {
  try {
    const response = await fetch('/api/v1/auth/refresh', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('refreshToken')}`
      }
    });
    
    if (response.ok) {
      const { token } = await response.json();
      localStorage.setItem('authToken', token);
      return token;
    } else {
      // Redirect to login
      window.location.href = '/login';
    }
  } catch (error) {
    console.error('Token refresh failed:', error);
    window.location.href = '/login';
  }
};
```

### Role-Based Access Control
```typescript
const hasPermission = (userRole: string, permission: string): boolean => {
  const permissions = {
    USER: ['view_public_mentors', 'create_mentee_profile', 'create_mentorship_request'],
    MENTOR: ['view_public_mentors', 'create_mentor_profile', 'respond_to_requests'],
    ADMIN: ['view_all_mentors', 'verify_mentors', 'adjust_trust_scores']
  };

  return permissions[userRole]?.includes(permission) || false;
};
```

---

## Conclusion

This integration guide provides comprehensive contracts for integrating with the Mentorship System. The system is designed with:

- **Clean APIs**: RESTful endpoints with consistent response formats
- **Type Safety**: TypeScript interfaces for all data structures
- **Event-Driven**: Webhook system for real-time integrations
- **Security**: JWT authentication and role-based access control
- **Scalability**: Rate limiting and efficient data transfer
- **Developer Experience**: Comprehensive error handling and documentation

The integration contracts ensure seamless integration with frontend applications, third-party services, and external systems while maintaining security, performance, and reliability standards.
