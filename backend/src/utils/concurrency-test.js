import prisma from '../config/prisma.js';
import { structuredLogger } from '../config/structured-logger.js';

/**
 * Concurrency Testing Utility
 * 
 * Simulates edge cases and concurrent operations to test system robustness
 */

class ConcurrencyTester {
  async testSlotBookingRaceCondition() {
    structuredLogger.info('Starting slot booking race condition test', {
      type: 'concurrency_test',
      test: 'slot_booking_race'
    });

    // Create a test slot
    const slot = await prisma.slot.create({
      data: {
        mentorId: 1,
        startAt: new Date(Date.now() + 3600000), // 1 hour from now
        endAt: new Date(Date.now() + 7200000),   // 2 hours from now
        status: 'OPEN'
      }
    });

    // Simulate 10 users trying to book the same slot simultaneously
    const bookingPromises = Array.from({ length: 10 }, (_, i) => 
      this.simulateSlotBooking(slot.id, i + 2) // Users 2-11
    );

    const results = await Promise.allSettled(bookingPromises);
    
    // Analyze results
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    structuredLogger.info('Slot booking race condition test completed', {
      type: 'concurrency_test_result',
      test: 'slot_booking_race',
      slotId: slot.id,
      successful,
      failed,
      total: successful + failed,
      expectedSuccessful: 1 // Only one should succeed
    });

    // Verify only one booking exists
    const actualBookings = await prisma.booking.count({
      where: { slotId: slot.id }
    });

    const testPassed = actualBookings === 1;
    
    structuredLogger.info('Slot booking race condition verification', {
      type: 'concurrency_test_verification',
      test: 'slot_booking_race',
      expectedBookings: 1,
      actualBookings,
      testPassed
    });

    return testPassed;
  }

  async simulateSlotBooking(slotId, userId) {
    try {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
      
      const booking = await prisma.$transaction(async (tx) => {
        const slot = await tx.slot.findUnique({
          where: { id: slotId },
          select: { status: true }
        });

        if (!slot || slot.status !== 'OPEN') {
          throw new Error('Slot not available');
        }

        // Create booking
        const booking = await tx.booking.create({
          data: { slotId, menteeId: userId }
        });

        // Update slot status
        await tx.slot.update({
          where: { id: slotId },
          data: { status: 'BOOKED' }
        });

        return booking;
      });

      return { success: true, booking, userId };
    } catch (error) {
      return { success: false, error: error.message, userId };
    }
  }

  async testRefreshTokenRotation() {
    structuredLogger.info('Starting refresh token rotation test', {
      type: 'concurrency_test',
      test: 'refresh_token_rotation'
    });

    const userId = 1;
    
    // Create initial refresh token
    const initialToken = await prisma.refreshToken.create({
      data: {
        token: 'initial_token_' + Date.now(),
        userId,
        expiresAt: new Date(Date.now() + 7 * 24 * 3600000) // 7 days
      }
    });

    // Simulate 5 concurrent refresh requests
    const refreshPromises = Array.from({ length: 5 }, () =>
      this.simulateTokenRotation(initialToken.token, userId)
    );

    const results = await Promise.allSettled(refreshPromises);
    
    // Verify only one new token exists and old is revoked
    const finalTokens = await prisma.refreshToken.findMany({
      where: { userId }
    });

    const activeTokens = finalTokens.filter(t => t.isActive);
    const testPassed = activeTokens.length === 1 && activeTokens[0].token !== initialToken.token;

    structuredLogger.info('Refresh token rotation test completed', {
      type: 'concurrency_test_result',
      test: 'refresh_token_rotation',
      initialTokenId: initialToken.id,
      finalActiveTokens: activeTokens.length,
      testPassed
    });

    return testPassed;
  }

  async simulateTokenRotation(oldToken, userId) {
    try {
      await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
      
      const result = await prisma.$transaction(async (tx) => {
        // Find and validate old token
        const storedToken = await tx.refreshToken.findUnique({
          where: { token: oldToken }
        });

        if (!storedToken || storedToken.expiresAt < new Date()) {
          throw new Error('Invalid token');
        }

        // Delete old token
        await tx.refreshToken.delete({
          where: { id: storedToken.id }
        });

        // Create new token
        const newToken = await tx.refreshToken.create({
          data: {
            token: 'new_token_' + Date.now() + '_' + Math.random(),
            userId,
            expiresAt: new Date(Date.now() + 7 * 24 * 3600000)
          }
        });

        return newToken;
      });

      return { success: true, newToken: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async testMentorshipAcceptanceRace() {
    structuredLogger.info('Starting mentorship acceptance race condition test', {
      type: 'concurrency_test',
      test: 'mentorship_acceptance_race'
    });

    // Create test mentorship request
    const request = await prisma.mentorshipRequest.create({
      data: {
        mentorId: 1,
        menteeId: 2,
        status: 'PENDING',
        topicDescription: 'Test mentorship'
      }
    });

    // Simulate mentor trying to accept from multiple devices
    const acceptPromises = Array.from({ length: 3 }, () =>
      this.simulateMentorshipAcceptance(request.id, 1)
    );

    const results = await Promise.allSettled(acceptPromises);
    
    // Verify only one relationship was created
    const relationships = await prisma.mentorshipRelationship.count({
      where: {
        mentorId: 1,
        menteeId: 2
      }
    });

    const testPassed = relationships === 1;

    structuredLogger.info('Mentorship acceptance race condition test completed', {
      type: 'concurrency_test_result',
      test: 'mentorship_acceptance_race',
      requestId: request.id,
      relationshipsCreated: relationships,
      testPassed
    });

    return testPassed;
  }

  async simulateMentorshipAcceptance(requestId, mentorId) {
    try {
      await new Promise(resolve => setTimeout(resolve, Math.random() * 75));
      
      const result = await prisma.$transaction(async (tx) => {
        const request = await tx.mentorshipRequest.findUnique({
          where: { id: requestId }
        });

        if (!request || request.status !== 'PENDING') {
          throw new Error('Request not available');
        }

        // Update request
        await tx.mentorshipRequest.update({
          where: { id: requestId },
          data: { status: 'ACCEPTED', respondedAt: new Date() }
        });

        // Create relationship
        const relationship = await tx.mentorshipRelationship.create({
          data: {
            mentorId: request.mentorId,
            menteeId: request.menteeId,
            type: 'CAREER'
          }
        });

        return relationship;
      });

      return { success: true, relationship: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async runAllTests() {
    structuredLogger.info('Starting comprehensive concurrency tests', {
      type: 'concurrency_test_suite',
      tests: ['slot_booking_race', 'refresh_token_rotation', 'mentorship_acceptance_race']
    });

    const results = {
      slotBooking: await this.testSlotBookingRaceCondition(),
      tokenRotation: await this.testRefreshTokenRotation(),
      mentorshipAcceptance: await this.testMentorshipAcceptanceRace()
    };

    const allPassed = Object.values(results).every(result => result);

    structuredLogger.info('Comprehensive concurrency tests completed', {
      type: 'concurrency_test_suite_result',
      results,
      allPassed,
      summary: `Passed: ${Object.values(results).filter(r => r).length}/${Object.keys(results).length}`
    });

    return { results, allPassed };
  }
}

export default new ConcurrencyTester();
