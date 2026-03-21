# 🔍 BOOKING FLOW DEBUGGING GUIDE

## Step 1: Test Backend Endpoint First
Open browser and navigate to:
```
http://localhost:4000/api/v1/bookings/my
```
**Expected:** 401 Unauthorized (this confirms route works)

## Step 2: Test Frontend Login
1. Go to: http://localhost:5173/login
2. Login with: vignan123@gmail.com / Test1234
3. Check browser console (F12) for any errors
4. Should redirect to /mentors or /dashboard

## Step 3: Test Mentor Selection
1. Go to: http://localhost:5173/mentors
2. Find Sarah Chen in the list
3. Click "Book Session" button
4. **Check console:** Should see "MENTOR ID: 212"

## Step 4: Test Date Selection
1. In booking modal, select March 15, 2026
2. **Check console:** Should see "Fetching slots for mentor ID: 212"
3. **Check console:** Should see "SLOTS SET: [2 slots]"
4. **Check modal:** Should see "Slots count: 2" + time buttons

## Step 5: Test Slot Selection
1. Click on 14:00 time button
2. Should see the button become selected (different color)
3. Enter topic: "Test booking"

## Step 6: Test Booking Submission
1. Click "Confirm" button
2. **Check console:** Should show API call to POST /bookings
3. **Check Network tab:** Should see 201 Created response
4. **Expected:** Modal shows "Booking Confirmed!" with ✅

## Step 7: Test My Bookings Page
1. Click "View My Bookings →" button
2. Should navigate to: http://localhost:5173/my-bookings
3. **Check console:** Should see "BOOKINGS RESPONSE: {...}"
4. **Check console:** Should see "BOOKINGS SET: [booking]"
5. **Expected:** See booking card in "As Student" tab

## Debug Questions:
1. What step are you getting stuck on?
2. What do you see in browser console (F12)?
3. What do you see in Network tab (F12)?
4. What exact error messages appear?

## Common Issues:
- **No slots:** Check if Sarah Chen has slots in database
- **500 error:** Check backend console for error logs
- **No booking in MyBookings:** Check data path in API response
- **Modal doesn't close:** Check step state management

## Backend Debug Commands:
```bash
# Check if Sarah Chen has slots
cd backend && node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.slot.findMany({ where: { mentorId: 212 } })
  .then(slots => console.log('Sarah Chen slots:', slots.length, slots.map(s => ({ id: s.id, startAt: s.startAt, status: s.status })))
  .finally(() => prisma.\$disconnect());
"

# Check if bookings exist
cd backend && node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.booking.findMany({ include: { slot: true, mentee: true } })
  .then(bookings => console.log('All bookings:', bookings.length, bookings))
  .finally(() => prisma.\$disconnect());
"
```
