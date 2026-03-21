const getPrisma = require('./config/prisma');
const prisma = getPrisma();

async function testFollow() {
  try {
    console.log('🔍 Testing follow system...');
    
    // Check if users exist
    const users = await prisma.user.findMany({ take: 3 });
    console.log('✅ Users found:', users.map(u => ({ id: u.id, name: u.name, role: u.role })));
    
    if (users.length < 2) {
      console.log('❌ Need at least 2 users to test follow system');
      return;
    }
    
    const follower = users[0];
    const following = users[1];
    
    console.log(`📝 Testing: ${follower.name} (ID: ${follower.id}) follows ${following.name} (ID: ${following.id})`);
    
    // Check if already following
    const existing = await prisma.follower.findUnique({
      where: { 
        followerId_followingId: { 
          followerId: follower.id, 
          followingId: following.id 
        } 
      }
    });
    
    if (existing) {
      console.log('⚠️  Already following, testing unfollow...');
      await prisma.follower.delete({ where: { id: existing.id } });
      console.log('✅ Unfollowed successfully');
    } else {
      console.log('📝 Creating follow relationship...');
      const follow = await prisma.follower.create({ 
        data: { 
          followerId: follower.id, 
          followingId: following.id 
        } 
      });
      console.log('✅ Followed successfully:', follow);
    }
    
    // Test fetching followers
    const followers = await prisma.follower.findMany({
      where: { followingId: following.id },
      include: {
        follower: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });
    
    console.log(`📊 ${following.name} has ${followers.length} followers:`, followers.map(f => f.follower.name));
    
    // Test fetching following
    const followingList = await prisma.follower.findMany({
      where: { followerId: follower.id },
      include: {
        following: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });
    
    console.log(`📊 ${follower.name} follows ${followingList.length} people:`, followingList.map(f => f.following.name));
    
    console.log('🎉 Follow system test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testFollow();
