import getPrisma from './src/config/prisma.js';
import jwt from 'jsonwebtoken';

const prisma = getPrisma();

async function testFollowAPI() {
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
    
    console.log('Testing follow API...');
    
    // Test follow API call to user 212 (as mentioned in original issue)
    const response = await fetch('http://localhost:4000/api/v1/users/212/follow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    const result = await response.json();
    console.log('Follow API Response:', response.status, result);
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
  
  await prisma.$disconnect();
}

testFollowAPI();
