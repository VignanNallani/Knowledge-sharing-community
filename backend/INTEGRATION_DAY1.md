# Day 1 Integration Instructions - Backend Mentorship Enhancements

## 1. Database Schema Updates

### Add to existing schema.prisma
Add these models to your existing `backend/prisma/schema.prisma` file:

```prisma
model MentorshipSession {
  id          String           @id @default(uuid())
  mentorshipId Int
  mentorId    Int
  menteeId    Int
  title       String
  description String?
  scheduledAt DateTime
  duration    Int              // Duration in minutes
  status      SessionStatus    @default(SCHEDULED)
  meetUrl     String?
  notes       String?
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt
  
  mentorship  Mentorship       @relation(fields: [mentorshipId], references: [id], onDelete: Cascade)
  mentor      User             @relation("MentorSessions", fields: [mentorId], references: [id], onDelete: Cascade)
  mentee      User             @relation("MenteeSessions", fields: [menteeId], references: [id], onDelete: Cascade)
  feedback    SessionFeedback?
  
  @@index([mentorshipId])
  @@index([mentorId])
  @@index([menteeId])
  @@index([status])
  @@index([scheduledAt])
  @@map("mentorship_sessions")
}

model SessionFeedback {
  id          String     @id @default(uuid())
  sessionId   String     @unique
  mentorId    Int
  menteeId    Int
  rating      Int        // 1-5 stars
  comment     String?
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
  
  session     MentorshipSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  mentor      User         @relation("MentorFeedback", fields: [mentorId], references: [id], onDelete: Cascade)
  mentee      User         @relation("MenteeFeedback", fields: [menteeId], references: [id], onDelete: Cascade)
  
  @@index([sessionId])
  @@index([mentorId])
  @@index([menteeId])
  @@index([rating])
  @@map("session_feedback")
}

model MentorAvailability {
  id          String           @id @default(uuid())
  mentorId    Int
  dayOfWeek   Int              // 0-6 (Sunday-Saturday)
  startTime   String           // HH:MM format
  endTime     String           // HH:MM format
  timezone    String           // IANA timezone identifier
  isActive    Boolean          @default(true)
  recurring   Boolean          @default(true)
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt
  
  mentor      User             @relation(fields: [mentorId], references: [id], onDelete: Cascade)
  
  @@index([mentorId])
  @@index([dayOfWeek])
  @@index([isActive])
  @@map("mentor_availability")
}

model SessionReminder {
  id          String           @id @default(uuid())
  sessionId   String
  mentorId    Int
  menteeId    Int
  reminderType ReminderType    @default(SESSION_START)
  scheduledAt DateTime
  sentAt      DateTime?
  status      ReminderStatus   @default(PENDING)
  createdAt   DateTime         @default(now())
  
  @@index([sessionId])
  @@index([mentorId])
  @@index([menteeId])
  @@index([scheduledAt])
  @@index([status])
  @@map("session_reminders")
}

// Add these enums to existing enums section
enum SessionStatus {
  SCHEDULED
  IN_PROGRESS
  COMPLETED
  CANCELLED
  NO_SHOW
}

enum ReminderType {
  SESSION_START
  SESSION_END
  FEEDBACK_REQUEST
}

enum ReminderStatus {
  PENDING
  SENT
  FAILED
}
```

### Update User model relations
Add these relations to your existing User model:

```prisma
model User {
  // ... existing fields ...
  mentorshipSessions     MentorshipSession[] @relation("MentorSessions")
  menteeSessions        MentorshipSession[] @relation("MenteeSessions")
  mentorFeedback        SessionFeedback[]    @relation("MentorFeedback")
  menteeFeedback        SessionFeedback[]    @relation("MenteeFeedback")
  mentorAvailability    MentorAvailability[]
  // ... existing relations ...
}
```

## 2. Run Database Migration

```bash
cd backend
npx prisma migrate dev --name add_mentorship_enhancements
npx prisma generate
```

## 3. Install Dependencies

```bash
cd backend
npm install node-cron
npm install --save-dev jest supertest
```

## 4. Add Routes to Main App

Update `backend/src/app.js` or `backend/src/server.js`:

```javascript
// Add these route imports
const mentorshipSessionRoutes = require('./routes/mentorshipSession.routes');
const feedbackRoutes = require('./routes/feedback.routes');
const mentorAvailabilityRoutes = require('./routes/mentorAvailability.routes');
const reminderRoutes = require('./routes/reminder.routes');

// Add these routes before existing routes
app.use('/api/v1/mentorship', mentorshipSessionRoutes);
app.use('/api/v1', feedbackRoutes);
app.use('/api/v1', mentorAvailabilityRoutes);
app.use('/api/v1', reminderRoutes);
```

## 5. Start Reminder Cron Job

Update your main server file to start the cron job:

```javascript
const reminderCronJob = require('./jobs/reminder.cron');

// Start the reminder cron job
reminderCronJob.start();

// Graceful shutdown
process.on('SIGTERM', () => {
  reminderCronJob.stop();
  process.exit(0);
});
```

## 6. Update Environment Variables

Add to your `.env` file:

```env
# Cron job settings
ENABLE_REMINDER_CRON=true
REMINDER_CRON_SCHEDULE=*/5 * * * *

# Meeting settings
MEETING_SERVICE_URL=https://meet.jit.si
MEETING_SERVICE_API_KEY=your_api_key_here
```

## 7. Run Tests

```bash
cd backend
npm test -- tests/unit/mentorshipSession.service.test.js
npm test -- tests/unit/feedback.service.test.js
npm test -- tests/unit/mentorAvailability.service.test.js
```

## 8. API Endpoints Available

### Mentorship Sessions
- `POST /api/v1/mentorship/sessions` - Create session (mentor/admin)
- `PUT /api/v1/mentorship/sessions/:sessionId` - Update session
- `POST /api/v1/mentorship/sessions/:sessionId/cancel` - Cancel session
- `POST /api/v1/mentorship/sessions/:sessionId/complete` - Complete session (mentor)
- `GET /api/v1/mentorship/sessions` - Get user sessions
- `GET /api/v1/mentorship/sessions/:sessionId` - Get session details
- `GET /api/v1/mentorship/sessions/stats` - Get session statistics

### Feedback
- `POST /api/v1/feedback` - Create feedback (mentee)
- `GET /api/v1/feedback/session/:sessionId` - Get session feedback
- `GET /api/v1/feedback/mentor/:mentorId` - Get mentor feedback
- `GET /api/v1/feedback/mentor/:mentorId/stats` - Get mentor statistics
- `PUT /api/v1/feedback/:feedbackId` - Update feedback (mentee, 24hr window)
- `DELETE /api/v1/feedback/:feedbackId` - Delete feedback (mentee, 24hr window)

### Mentor Availability
- `POST /api/v1/availability` - Create availability (mentor/admin)
- `PUT /api/v1/availability/:availabilityId` - Update availability
- `DELETE /api/v1/availability/:availabilityId` - Delete availability
- `GET /api/v1/availability` - Get mentor availability
- `GET /api/v1/availability/:mentorId/slots` - Get available time slots
- `POST /api/v1/availability/bulk` - Bulk create availability
- `GET /api/v1/availability/summary` - Get availability summary

### Reminders
- `POST /api/v1/reminders/process` - Process pending reminders (admin)
- `GET /api/v1/reminders` - Get user reminders
- `POST /api/v1/reminders/:reminderId/send` - Send specific reminder (admin)
- `POST /api/v1/reminders/session/:sessionId/cancel` - Cancel session reminders
- `PUT /api/v1/reminders/:reminderId/reschedule` - Reschedule reminder (admin)

## 9. Testing the Integration

### Test Session Creation
```bash
curl -X POST http://localhost:4000/api/v1/mentorship/sessions \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "mentorshipId": 1,
    "title": "Test Session",
    "description": "Test Description",
    "scheduledAt": "2024-01-15T10:00:00Z",
    "duration": 60
  }'
```

### Test Availability Creation
```bash
curl -X POST http://localhost:4000/api/v1/availability \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "dayOfWeek": 1,
    "startTime": "09:00",
    "endTime": "17:00",
    "timezone": "America/New_York"
  }'
```

## 10. Next Steps

- Day 2: Frontend Mentorship Components
- Day 3: Backend Search Implementation
- Day 4: Frontend Search & Discovery
- Day 5: Email Notifications (will complete email.util.js)
- Day 6: Push Notifications & Real-time Updates
- Day 7: Advanced User Features

All backend mentorship enhancements are now ready for integration with the frontend components in Day 2.
