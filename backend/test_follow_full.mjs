import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function testFollowFunctionality() {
  try {
    console.log('Testing follow functionality...');
    
    // Check if users exist
    const users = await prisma.user.findMany({
      take: 2,
      select: { id: true, email: true, name: true }
    });
    
    console.log('Found users:', users);
    
    if (users.length < 2) {
      console.log('Need at least 2 users to test follow functionality');
      return;
    }
    
    const followerId = users[0].id;
    const followingId = users[1].id;
    
    console.log(`Testing: User ${followerId} following User ${followingId}`);
    
    // Test creating a follow relationship
    const follow = await prisma.follower.create({
      data: {
        followerId,
        followingId
      }
    });
    
    console.log('Created follow:', follow);
    
    // Test finding the follow relationship
    const foundFollow = await prisma.follower.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId
        }
      }
    });
    
    console.log('Found follow:', foundFollow);
    
    // Clean up
    await prisma.follower.delete({
      where: {
        followerId_followingId: {
          followerId,
          followingId
        }
      }
    });
    
    console.log('Test completed successfully!');
    
  } catch (error) {
    console.error('Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
  
  await prisma.$disconnect();
}

testFollowFunctionality();
