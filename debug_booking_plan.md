# Complete Booking Flow Test

## Debug Status:
✅ Backend: http://localhost:4000 (running with debug logs)
✅ Frontend: http://localhost:5173 (running)
✅ Debug logging added to both frontend and backend

## Test Steps:

### 1. Test Student Booking Creation
1. Open browser: http://localhost:5173/mentors
2. Login: vignan123@gmail.com / Test1234
3. Click "Book Session" on Sarah Chen
4. Select March 15, 2026
5. Should see: "Slots count: 2" + time buttons
6. Select 14:00 slot, enter topic "Test booking"
7. Click Confirm
8. Check browser console for:
   - "MENTOR ID: 212"
   - "SLOTS SET: [2 slots]"
   - API response details

### 2. Check Booking Creation in Backend
Backend console should show:
```
GETMYBOOKINGS - userId: [student_id]
GETMYBOOKINGS - bookings found: 1
GETMYBOOKINGS - bookings data: [booking details]
```

### 3. Test Mentor Dashboard
1. Open new tab: http://localhost:5173/login
2. Login: sarah.chen@devmentor.com / [password]
3. Go to: http://localhost:5173/my-bookings
4. Click "As Mentor" tab
5. Should see the booking with PENDING status
6. Should see "Accept" (green) and "Decline" (red) buttons
7. Click "Accept"
8. Should see success message

### 4. Verify Status Update
1. Login back as student: vignan123@gmail.com
2. Go to: http://localhost:5173/my-bookings
3. "As Student" tab should show booking with ACCEPTED status
4. Should see "Join Session" button

## Expected Issues to Debug:
- If booking doesn't appear: Check backend GETMYBOOKINGS logs
- If mentor can't see booking: Check userRole assignment
- If status doesn't update: Check PATCH /bookings/:id/status endpoint

## Debug Commands:
- Check browser console: F12 → Network tab → API responses
- Check backend console: Look for "GETMYBOOKINGS" logs
- Check database: Run direct query to verify booking exists
