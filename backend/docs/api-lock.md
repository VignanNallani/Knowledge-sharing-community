# API LOCK LIST — MVP

This file defines the ONLY backend APIs allowed to exist for the MVP.
Any API not listed here must be removed from:
- routes
- controllers
- services
- prisma usage
- openapi.json

---

## AUTH
- POST /api/auth/register
- POST /api/auth/login
- GET /api/auth/me

## USERS
- GET /api/users/:id
- GET /api/mentors

## POSTS
- GET /api/posts
- POST /api/posts
- GET /api/posts/:id
- DELETE /api/posts/:id (ADMIN or author only)

## COMMENTS
- GET /api/posts/:id/comments
- POST /api/posts/:id/comments
- POST /api/comments/:id/reply

## LIKES
- POST /api/posts/:id/like

## MENTORSHIP
- GET /api/mentorship/slots
- POST /api/mentorship/slots (MENTOR only)
- POST /api/mentorship/book
