import ApiResponse from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import asyncHandler from '../middleware/asyncHandler.js';
import mentorshipRepository from '../repositories/mentorship.repo.js';

// ==================== PUBLIC ENDPOINTS ====================

/**
 * GET /api/v1/mentorship/find
 * Simple mentor discovery endpoint
 */
export const discoverMentors = asyncHandler(async (req, res) => {
  const { skip, limit } = req.query;
  
  // For now, return mock data to test the flow
  const mockMentors = [
    {
      id: 1,
      name: "John Doe",
      role: "Senior Backend Engineer",
      bio: "10+ years of experience in Node.js, Python, and cloud architecture",
      hourlyRate: 100,
      skills: ["Node.js", "Python", "AWS", "Docker"],
      rating: 4.8,
      sessionsCompleted: 150
    },
    {
      id: 2,
      name: "Jane Smith", 
      role: "Frontend Architect",
      bio: "Expert in React, TypeScript, and modern frontend technologies",
      hourlyRate: 90,
      skills: ["React", "TypeScript", "CSS", "Vue.js"],
      rating: 4.9,
      sessionsCompleted: 200
    }
  ];

  return ApiResponse.success(res, {
    message: 'Mentors discovered successfully',
    data: mockMentors
  });
});

/**
 * POST /api/v1/mentorship/request
 * Create mentorship request
 */
export const createMentorshipRequest = asyncHandler(async (req, res) => {
  const { mentorId, topic, preferredTime, message } = req.body;
  const menteeId = req.user.id;

  // For now, just return success to test the flow
  const mockRequest = {
    id: Date.now(),
    mentorId,
    menteeId,
    topic,
    preferredTime,
    message,
    status: "PENDING",
    createdAt: new Date().toISOString()
  };

  return ApiResponse.created(res, {
    message: 'Mentorship request created successfully',
    data: mockRequest
  });
});
