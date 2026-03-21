import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function testFollowConstraint() {
  try {
    console.log('Testing follower constraint...');
    
    // Try to find a follow relationship using the tuple constraint
    const result = await prisma.follower.findUnique({
      where: {
        followerId_followingId: {
          followerId: 1,
          followingId: 2
        }
      }
    });
    
    console.log('Success with followerId_followingId:', result);
  } catch (error) {
    console.log('Error with followerId_followingId:', error.message);
    
    // Try alternative - just using the fields directly
    try {
      const result2 = await prisma.follower.findFirst({
        where: {
          followerId: 1,
          followingId: 2
        }
      });
      console.log('Success with findFirst:', result2);
    } catch (error2) {
      console.log('Error with findFirst:', error2.message);
    }
  }
  
  await prisma.$disconnect();
}

testFollowConstraint();
