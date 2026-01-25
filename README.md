# Knowledge Sharing & Mentorship Platform

A production-grade community and mentorship platform designed to enable real-world experience transfer between early-career engineers and experienced professionals.

This is not a tutorial site or a Q&A clone.  
It is a system built to replicate how engineers actually learn inside strong teams.

---

## Why This Product Exists

Early-career engineers struggle not because of a lack of resources,  
but because they lack exposure to real-world engineering decisions.

Most platforms teach what to build, but not:
- how production systems actually evolve,
- what mistakes experienced engineers avoid,
- how real teams debug, discuss, and decide.

This platform bridges that gap by enabling direct experience transfer through structured discussions, mentorship, and moderated knowledge sharing.

Mentorship is a feature.  
Experience transfer is the product.

---

## Product Screenshots

### Login & Authentication
![Login Page](portfolio-assets/knowledge-sharing/01-login.png)

### Community Feed
![Community Feed](portfolio-assets/knowledge-sharing/02-feed.png)

### Post Detail & Discussions
![Post Detail](portfolio-assets/knowledge-sharing/03-post-detail.png)

### Admin Dashboard
![Admin Dashboard](portfolio-assets/knowledge-sharing/04-admin-dashboard.png)

### Mentor Dashboard
![Mentor Dashboard](portfolio-assets/knowledge-sharing/05-mentor-dashboard.png)

### User Profile
![User Profile](portfolio-assets/knowledge-sharing/06-user-profile.png)

---

## What Problem It Solves

### For Early-Career Engineers
- Career confusion and decision paralysis
- No access to experienced mentors outside personal networks
- Overwhelmed by shallow, noisy content
- Lack of real engineering context

### For Experienced Engineers
- No scalable way to mentor beyond private circles
- Knowledge sharing limited to informal channels
- Low signal-to-noise on existing platforms
- No visibility into mentorship impact

This platform connects both sides in a moderated, production-grade environment that prioritizes learning quality over virality.

---

## Core Product Philosophy

- Learning happens through context, not answers
- Growth happens through experience transfer
- Quality beats engagement farming
- Mentorship should be structured, practical, and accessible

The goal is to simulate how engineers actually grow inside strong engineering teams.

---

## Core Product Concept

- Posts represent real engineering problems, decisions, or lessons
- Discussions simulate team-level technical conversations
- Mentors guide juniors based on experience, not theory
- Moderation enforces signal over noise
- UI feels like a real internal engineering tool

---

## Key Features

### Platform Features
- Role-based access control (Admin / Mentor / User)
- Community feed with posts, likes, and nested comments
- Follow system for engineers and mentors
- Reporting and moderation workflow
- Activity tracking and engagement signals

### Mentorship System
- Mentor discovery and role-based dashboards
- Experience and expertise visibility
- Mentorship workflows (in progress)
- Foundation for paid and free mentorship tiers

### Real-Time Experience
- Live comment updates using Socket.IO
- Optimistic UI updates
- Real-time event handling architecture

### UI & UX
- Recruiter-grade, production-style UI
- Skeleton loaders for perceived performance
- Smooth animations using Framer Motion
- Clear empty-state and error-state design
- Responsive layout for different screen sizes

---

## Tech Stack

### Frontend
- React + Vite
- Tailwind CSS
- Framer Motion
- Axios
- Date-fns

### Backend
- Node.js + Express
- PostgreSQL
- Prisma ORM
- JWT-based authentication
- Socket.IO

---

## Architecture Overview

Client (React + Vite)  
↓  
REST APIs (Express + JWT Authentication)  
↓  
Service Layer (Business Logic)  
↓  
Database (PostgreSQL via Prisma)

---

## Authentication Flow

1. User logs in using email and password
2. Backend validates credentials
3. JWT issued on successful authentication
4. Token sent via Authorization header
5. Protected routes validated using middleware

---

## Real-Time System Design

- Socket.IO initialized on backend
- Clients join scoped rooms (per post or user)
- Events emitted for comments, likes, and updates
- UI updates without page refresh

---

## Database Design

- PostgreSQL chosen for reliability and relational integrity
- Schema normalized for scalability
- Referential integrity enforced via foreign keys
- Audit fields: created_at, updated_at
- Soft deletes where applicable

### Core Tables
- users
- posts
- comments
- likes
- followers
- skills
- mentorships
- reports
- notifications

### Indexing Strategy
Indexes applied on:
- users.email
- posts.created_at
- comments.post_id
- followers.following_id
- mentorship relationships

---

## Security & Production Considerations

- Passwords hashed using bcrypt
- JWT authentication with expiration
- Route protection via middleware
- Environment-based secrets management
- CORS configuration
- Input validation across endpoints
- Rate limiting planned for sensitive routes

---

## API Documentation

- Swagger UI available at /api/docs
- OpenAPI specification designed for expansion
- Clear separation between public and protected routes

---

## Local Development Setup

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm

---

### Backend Setup

cd backend  
npm install  
cp .env.example .env  
npx prisma generate  
npx prisma db push  
npm run dev  

Backend runs on http://localhost:4000

---

### Frontend Setup

cd frontend  
npm install  
npm run dev  

Frontend runs on http://localhost:5173

Environment variable:

VITE_API_BASE_URL=http://localhost:4000

---

## Roadmap

### Phase 1 — Core Platform (Completed)
- Authentication and authorization
- Posts, comments, likes
- UI foundation
- Database schema
- Real-time updates

### Phase 2 — Mentorship Layer (In Progress)
- Mentor verification
- Slot booking
- Experience tagging

### Phase 3 — Scale & Trust
- Advanced moderation tools
- Reputation scoring
- Search and discovery
- Analytics for mentors

---

## Why This Project Matters

This project demonstrates:
- Product-first engineering mindset
- Scalable backend architecture
- Real-world database design
- Production-grade UI decisions
- System thinking beyond CRUD apps

It reflects how I think as an engineer, not just how fast I code.

---

## Author

Vignan Naidu Nallani  
Computer Science Engineer  
Focused on building production-grade systems with real-world impact

---

If you’re a recruiter or founder:  
This project represents my approach to building real products, not demos.  
I’m open to backend, full-stack, and product-engineering roles.
