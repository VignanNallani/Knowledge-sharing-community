import { PrismaClient } from '@prisma/client';
import { cacheService } from '../src/cache/cache.service.js';

console.log('🎯 DB QUERY REDUCTION TEST - VERY IMPORTANT');
console.log('REDIS_URL:', process.env.REDIS_URL);

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

let queryCount = 0;

// Override Prisma query logging to count queries
const originalQuery = prisma.$queryRaw;
prisma.$queryRaw = function(...args) {
  queryCount++;
  console.log(`🗄️  DB Query #${queryCount}:`, args[0]);
  return originalQuery.apply(this, args);
};

// Simulate user service with caching
class UserService {
  static async getUserProfile(userId) {
    const cacheKey = `user:profile:${userId}`;
    
    console.log(`🔍 Getting user profile for ${userId}`);
    
    // Try cache first
    let userProfile = await cacheService.get(cacheKey);
    
    if (userProfile) {
      console.log(`🎯 CACHE HIT for user ${userId}`);
      return userProfile;
    }
    
    console.log(`💾 CACHE MISS for user ${userId} - querying DB`);
    
    // Query database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        posts: {
          take: 5,
          orderBy: { createdAt: 'desc' }
        },
        followers: {
          take: 10,
          include: {
            follower: true
          }
        }
      }
    });
    
    if (user) {
      // Cache the result
      await cacheService.set(cacheKey, user, 300); // 5 minutes
      console.log(`✅ Cached user profile for ${userId}`);
    }
    
    return user;
  }
  
  static async updateUserProfile(userId, updateData) {
    console.log(`📝 Updating user profile for ${userId}`);
    
    // Update in database
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData
    });
    
    // Invalidate cache
    const cacheKey = `user:profile:${userId}`;
    await cacheService.delete(cacheKey);
    console.log(`🗑️  Invalidated cache for user ${userId}`);
    
    return updatedUser;
  }
}

async function testDBQueryReduction() {
  try {
    const testUserId = 'test-user-123';
    
    console.log('\n📝 STEP 1: First request (expecting DB query)');
    queryCount = 0; // Reset counter
    
    const result1 = await UserService.getUserProfile(testUserId);
    console.log(`Query count after first request: ${queryCount}`);
    
    if (queryCount === 0) {
      console.log('❌ CRITICAL: No DB query made on first request!');
      return;
    }
    
    console.log('\n📝 STEP 2: Second request (expecting CACHE HIT, no DB query)');
    queryCount = 0; // Reset counter
    
    const result2 = await UserService.getUserProfile(testUserId);
    console.log(`Query count after second request: ${queryCount}`);
    
    if (queryCount > 0) {
      console.log('❌ CRITICAL FAILURE: Cache not working - DB still queried!');
      console.log('Expected: 0 queries');
      console.log(`Actual: ${queryCount} queries`);
      return;
    }
    
    if (!result2 || !result1) {
      console.log('❌ CRITICAL: Results are null/undefined');
      return;
    }
    
    console.log('\n📝 STEP 3: Third request (expecting CACHE HIT, no DB query)');
    queryCount = 0; // Reset counter
    
    const result3 = await UserService.getUserProfile(testUserId);
    console.log(`Query count after third request: ${queryCount}`);
    
    if (queryCount > 0) {
      console.log('❌ CRITICAL FAILURE: Cache not persistent!');
      return;
    }
    
    console.log('\n📝 STEP 4: Update user (expecting cache invalidation)');
    await UserService.updateUserProfile(testUserId, {
      name: 'Updated Name',
      bio: 'Updated bio'
    });
    
    console.log('\n📝 STEP 5: Request after update (expecting DB query)');
    queryCount = 0; // Reset counter
    
    const result4 = await UserService.getUserProfile(testUserId);
    console.log(`Query count after update: ${queryCount}`);
    
    if (queryCount === 0) {
      console.log('❌ CRITICAL FAILURE: Cache invalidation not working!');
      return;
    }
    
    console.log('\n🎉 SUCCESS: All cache integration tests passed!');
    console.log('✅ Cache hits work');
    console.log('✅ DB queries reduced');
    console.log('✅ Cache invalidation works');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testDBQueryReduction();
