import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

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
    
    console.log('Generated token for user:', user.id, user.email);
    console.log('Token:', token);
    
    // Test follow API call
    const response = await fetch('http://localhost:4000/api/v1/users/211/follow', {
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
