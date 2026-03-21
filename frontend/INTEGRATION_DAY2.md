# Day 2 Integration Instructions - Frontend Mentorship Components

## 1. File Structure

Create the following directory structure in your frontend:

```
frontend/src/components/mentorship/
├── MentorDashboard.jsx
├── SessionDetail.jsx
├── BookingCalendar.jsx
├── FeedbackForm.jsx
├── MentorAvailabilityManager.jsx
├── mentorshipAPI.js
├── socket.js
└── __tests__/
    ├── MentorDashboard.test.jsx
    └── FeedbackForm.test.jsx
```

## 2. Install Dependencies

```bash
cd frontend
npm install date-fns lucide-react
npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

## 3. Environment Variables

Add to your `.env` file:

```env
REACT_APP_BACKEND_URL=http://localhost:4000
```

## 4. Update Router Configuration

Add these routes to your main router file (App.jsx or Router.jsx):

```jsx
import MentorDashboard from './components/mentorship/MentorDashboard';
import SessionDetail from './components/mentorship/SessionDetail';
import BookingCalendar from './components/mentorship/BookingCalendar';
import MentorAvailabilityManager from './components/mentorship/MentorAvailabilityManager';

// Add these routes
<Route path="/mentor-dashboard" element={<MentorDashboard />} />
<Route path="/session/:id" element={<SessionDetail />} />
<Route path="/booking/:mentorId?" element={<BookingCalendar />} />
<Route path="/availability" element={<MentorAvailabilityManager />} />
```

## 5. Socket.io Backend Setup

Add this to your backend server file to handle socket events:

```javascript
const { Server } = require("socket.io");

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Socket event handlers
io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("join_mentor_room", (mentorId) => {
    socket.join(`mentor_${mentorId}`);
  });

  socket.on("leave_mentor_room", (mentorId) => {
    socket.leave(`mentor_${mentorId}`);
  });

  socket.on("join_session_room", (sessionId) => {
    socket.join(`session_${sessionId}`);
  });

  socket.on("leave_session_room", (sessionId) => {
    socket.leave(`session_${sessionId}`);
  });
});

// Emit session updates from your services
// Example in mentorshipSession.service.js:
const emitSessionUpdate = (session) => {
  io.to(`mentor_${session.mentorId}`).emit("session_updated", session);
  io.to(`session_${session.id}`).emit("session_updated", session);
};
```

## 6. Component Usage Examples

### MentorDashboard
- **Purpose**: Main dashboard for mentors to view and manage sessions
- **Features**: Real-time updates, session statistics, filtering, actions
- **Route**: `/mentor-dashboard`

### SessionDetail
- **Purpose**: Detailed view of a specific mentorship session
- **Features**: Session info, participants, feedback, meeting links, editing
- **Route**: `/session/:id`

### BookingCalendar
- **Purpose**: Calendar for mentees to book available time slots
- **Features**: Week/month view, slot selection, booking confirmation
- **Route**: `/booking/:mentorId?`

### FeedbackForm
- **Purpose**: Submit and edit feedback for completed sessions
- **Features**: Star rating, comments, edit/delete functionality
- **Used in**: SessionDetail component

### MentorAvailabilityManager
- **Purpose**: Manage mentor availability time slots
- **Features**: Create/edit/delete availability, bulk operations, summary stats
- **Route**: `/availability`

## 7. Real-time Features

The components include real-time updates using Socket.io:

### Session Updates
- When a session is created, updated, or cancelled
- Mentors see real-time updates in their dashboard
- Session detail pages update automatically

### Feedback Notifications
- When feedback is submitted for a session
- Real-time display of new feedback

### Availability Changes
- When availability is added/removed
- Calendar updates in real-time for mentees

## 8. Testing

Run the component tests:

```bash
cd frontend
npm test -- --watchAll=false src/components/mentorship/__tests__/MentorDashboard.test.jsx
npm test -- --watchAll=false src/components/mentorship/__tests__/FeedbackForm.test.jsx
```

## 9. Responsive Design

All components are built with responsive design:

- **Mobile**: Stacked layouts, simplified navigation
- **Tablet**: Optimized spacing and touch targets
- **Desktop**: Full-featured layouts with sidebars

## 10. Error Handling

Components include comprehensive error handling:

- **Network errors**: User-friendly messages with retry options
- **Validation errors**: Inline feedback and guidance
- **Permission errors**: Graceful fallbacks and appropriate messaging

## 11. Accessibility

Components follow accessibility best practices:

- **Semantic HTML**: Proper heading hierarchy and landmarks
- **ARIA labels**: Screen reader support for interactive elements
- **Keyboard navigation**: Full keyboard accessibility
- **Color contrast**: WCAG compliant color schemes

## 12. Performance Optimizations

- **Lazy loading**: Components load data only when needed
- **Debounced inputs**: Search and filter inputs are debounced
- **Memoization**: Expensive calculations are memoized
- **Optimistic updates**: UI updates immediately with rollback on error

## 13. Integration Checklist

- [ ] Backend Day 1 mentorship APIs are deployed and working
- [ ] Socket.io server is configured and running
- [ ] Frontend environment variables are set
- [ ] Routes are added to the router
- [ ] Dependencies are installed
- [ ] Components are copied to the correct directory
- [ ] Real-time updates are working
- [ ] Responsive design works on different screen sizes
- [ ] Error handling displays appropriate messages
- [ ] Tests pass successfully

## 14. Common Issues and Solutions

### Socket Connection Issues
- **Problem**: Socket not connecting
- **Solution**: Check CORS settings on backend, verify REACT_APP_BACKEND_URL

### API Authentication Issues
- **Problem**: 401 errors on API calls
- **Solution**: Ensure JWT tokens are stored in localStorage and API interceptors are configured

### Real-time Updates Not Working
- **Problem**: UI not updating in real-time
- **Solution**: Verify socket rooms are joined correctly and events are emitted from backend

### Responsive Layout Issues
- **Problem**: Layout breaks on mobile
- **Solution**: Check Tailwind CSS responsive classes and viewport meta tag

## 15. Next Steps

After completing Day 2 integration:

1. **Test all user flows**: End-to-end testing of mentorship workflows
2. **Performance testing**: Load testing with multiple concurrent users
3. **Accessibility audit**: Screen reader and keyboard navigation testing
4. **Browser compatibility**: Test across different browsers
5. **Mobile testing**: Test on actual mobile devices

## 16. Ready for Day 3

Once Day 2 is fully integrated and tested, you're ready for:
- **Day 3**: Backend Search Implementation
- **Day 4**: Frontend Search & Discovery
- **Day 5**: Email Notifications
- **Day 6**: Push Notifications & Real-time Updates
- **Day 7**: Advanced User Features

The frontend mentorship components are now fully functional and ready for production use!
