import getPrisma from './src/config/prisma.js';
import jwt from 'jsonwebtoken';

const prisma = getPrisma();

async function testFollowToggle() {
  try {
    // Get first user to use for testing
    const user = await prisma.user.findFirst({
      where: { email: 'vignan123@gmail.com' }
    });
    
    if (!user) {
      console.log('Test user not found');
      return;
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role,
        name: user.name 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '15m' }
    );
    
    console.log('Testing follow toggle...');
    
    // Test 1: Follow user 211
    console.log('\n--- Test 1: Following user 211 ---');
    const response1 = await fetch('http://localhost:4000/api/v1/users/211/follow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    const result1 = await response1.json();
    console.log('Response 1:', response1.status, result1);
    
    // Test 2: Follow again (should unfollow)
    console.log('\n--- Test 2: Following user 211 again (should unfollow) ---');
    const response2 = await fetch('http://localhost:4000/api/v1/users/211/follow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    const result2 = await response2.json();
    console.log('Response 2:', response2.status, result2);
    
    // Test 3: Follow again (should follow again)
    console.log('\n--- Test 3: Following user 211 again (should follow) ---');
    const response3 = await fetch('http://localhost:4000/api/v1/users/211/follow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    const result3 = await response3.json();
    console.log('Response 3:', response3.status, result3);
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
  
  await prisma.$disconnect();
}

testFollowToggle();
