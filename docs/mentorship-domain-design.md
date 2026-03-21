# Mentorship System Domain Design

## Overview
Production-grade mentorship domain designed for experience transfer, trust building, and scalable matching.

## Core Entities

### 1. MentorProfile
**Purpose**: Extended profile for users with mentor capabilities
**Key Attributes**:
- userId (FK to User)
- professionalTitle
- yearsOfExperience
- company
- industry
- bio (mentor-specific)
- hourlyRate (for paid sessions)
- availabilityPreferences
- mentorshipTypes (career, technical, leadership)
- maxMentees
- responseRate
- averageResponseTime
- verificationStatus
- verificationDocuments
- featuredMentor
- languagesSpoken
- timezone

**Relationships**:
- User (1:1)
- MentorSkills (1:N)
- MentorshipRequests (1:N as mentor)
- MentorshipRelationships (1:N as mentor)
- Sessions (1:N as mentor)
- Availability (1:N)
- Reviews (1:N as mentor)

### 2. MenteeProfile
**Purpose**: Extended profile for users seeking mentorship
**Key Attributes**:
- userId (FK to User)
- careerLevel
- goals (array)
- preferredTopics
- budgetRange
- availability
- learningStyle
- background
- expectations

**Relationships**:
- User (1:1)
- MentorshipRequests (1:N as mentee)
- MentorshipRelationships (1:N as mentee)
- Sessions (1:N as mentee)

### 3. SkillTag
**Purpose**: Standardized skill taxonomy
**Key Attributes**:
- name
- category
- description
- level (beginner, intermediate, advanced, expert)
- demandScore
- isActive

**Relationships**:
- MentorSkills (1:N)
- RequestSkills (1:N)
- SessionTopics (1:N)

### 4. MentorSkill
**Purpose**: Mentor's claimed and verified skills
**Key Attributes**:
- mentorId (FK)
- skillId (FK)
- proficiencyLevel
- yearsOfExperience
- verified
- verificationMethod
- endorsementsCount

**Relationships**:
- MentorProfile (N:1)
- SkillTag (N:1)

### 5. MentorshipRequest
**Purpose**: Initial request for mentorship
**Key Attributes**:
- mentorId (FK)
- menteeId (FK)
- status (pending, accepted, rejected, expired, withdrawn)
- requestType (one_time, ongoing)
- topicDescription
- goals
- expectedDuration
- proposedSchedule
- budget
- urgency
- message
- requestedAt
- respondedAt
- expiresAt
- rejectionReason

**Relationships**:
- MentorProfile (N:1)
- MenteeProfile (N:1)
- RequestSkills (1:N)

### 6. MentorshipRelationship
**Purpose**: Active mentorship engagement
**Key Attributes**:
- mentorId (FK)
- menteeId (FK)
- status (active, paused, completed, terminated)
- startDate
- endDate
- type (career, technical, leadership, mixed)
- frequency
- duration
- goals
- progressNotes
- nextSessionDate
- terminationReason
- satisfactionScore

**Relationships**:
- MentorProfile (N:1)
- MenteeProfile (N:1)
- Sessions (1:N)
- Feedback (1:N)

### 7. Session
**Purpose**: Individual mentorship meetings
**Key Attributes**:
- relationshipId (FK)
- mentorId (FK)
- menteeId (FK)
- scheduledStart
- scheduledEnd
- actualStart
- actualEnd
- status (scheduled, in_progress, completed, cancelled, no_show)
- type (video, call, in_person, chat)
- topic
- agenda
- notes
- recordingUrl
- paymentStatus
- cancellationReason
- cancelledBy
- cancelledAt

**Relationships**:
- MentorshipRelationship (N:1)
- MentorProfile (N:1)
- MenteeProfile (N:1)
- SessionTopics (1:N)
- Feedback (1:N)

### 8. Feedback
**Purpose**: Performance and quality feedback
**Key Attributes**:
- fromUserId (FK)
- toUserId (FK)
- relationshipId (FK)
- sessionId (FK, nullable)
- type (session_feedback, relationship_feedback, mentor_review, mentee_review)
- rating (1-5)
- categories (communication, expertise, helpfulness, professionalism)
- comments
- isPublic
- isVerified
- submittedAt
- helpfulVotes

**Relationships**:
- User (N:1 as from)
- User (N:1 as to)
- MentorshipRelationship (N:1)
- Session (N:1)

### 9. TrustScore
**Purpose**: Reputation and trust metrics
**Key Attributes**:
- userId (FK)
- overallScore
- components (reliability, expertise, communication, professionalism)
- reviewCount
- responseRate
- completionRate
- onTimeRate
- disputeCount
- lastCalculatedAt
- trendDirection

**Relationships**:
- User (1:1)

### 10. Availability
**Purpose**: Mentor availability management
**Key Attributes**:
- mentorId (FK)
- dayOfWeek
- startTime
- endTime
- timezone
- recurring
- specificDate
- status (available, busy, unavailable)
- bookingBuffer
- maxSessionsPerDay

**Relationships**:
- MentorProfile (N:1)

### 11. MentorshipPackage
**Purpose**: Pre-defined mentorship offerings
**Key Attributes**:
- mentorId (FK)
- name
- description
- type (one_time, package, subscription)
- duration
- sessionCount
- price
- currency
- features
- requirements
- isActive
- purchaseCount

**Relationships**:
- MentorProfile (N:1)

## Business Rules & Constraints

### Request Flow
1. Mentee submits request with goals and expectations
2. Mentor receives notification and has 48 hours to respond
3. Request expires if no response
4. Accepted requests become relationships
5. Rejected requests require reason (private to mentee)

### Relationship Management
- Max 5 active mentees per mentor (configurable)
- Minimum 24 hours between sessions
- 7-day cooling period after termination
- Automatic pause after 3 no-shows

### Trust Scoring
- Initial score: 70/100 for verified mentors
- Factors: completion rate, response time, ratings, disputes
- Decay: 2 points per month of inactivity
- Boost: 5 points for successful relationships

### Session Rules
- Cancellation: 24+ hours = full refund, <24 hours = 50% refund
- No-show: No refund, affects trust score
- Rescheduling: Mutual agreement required
- Recording: Opt-in for both parties

### Feedback System
- Session feedback: Required within 7 days
- Relationship feedback: Required upon completion
- Public reviews: Only after 3+ sessions
- Anonymous options available

## Permission Model

### Mentor Permissions
- Create availability slots
- Respond to requests
- Manage relationships
- View mentee profiles (accepted only)
- Set rates and packages
- Moderate comments

### Mentee Permissions
- Browse mentors (public info only)
- Send requests (rate limited)
- Manage relationships
- Provide feedback
- Report issues

### Admin Permissions
- Verify mentors
- Moderate all content
- Override decisions
- Access analytics
- Handle disputes
- Adjust trust scores

## State Transitions

### Request States
```
pending → accepted → relationship_created
pending → rejected → closed
pending → expired → closed
pending → withdrawn → closed
```

### Relationship States
```
active → paused → active
active → completed → closed
active → terminated → closed
paused → completed → closed
paused → terminated → closed
```

### Session States
```
scheduled → in_progress → completed
scheduled → cancelled → closed
scheduled → no_show → closed
in_progress → completed → closed
```

## Integration Points

### User System
- Extends User model with profiles
- Leverages existing authentication
- Uses role-based permissions

### Notification System
- Request notifications
- Session reminders
- Feedback prompts
- Status updates

### Payment System
- Session payments
- Package purchases
- Refunds
- Commission tracking

### Analytics System
- Mentor performance metrics
- Platform usage statistics
- Matching algorithm data
- Trust score analytics

## Security Considerations

### Data Privacy
- Mentor contact info hidden until acceptance
- Session recordings encrypted
- Feedback anonymity options
- GDPR compliance for personal data

### Fraud Prevention
- Rate limiting on requests
- Duplicate detection
- Suspicious activity monitoring
- Dispute escalation

### Access Control
- Profile visibility tiers
- Session access controls
- Feedback moderation
- Admin audit trails
