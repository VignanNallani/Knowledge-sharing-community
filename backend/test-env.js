import dotenv from 'dotenv';

// Test different dotenv configurations
console.log('=== Before dotenv.config() ===');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'LOADED' : 'MISSING');
console.log('NODE_ENV:', process.env.NODE_ENV);

// Load .env
dotenv.config();
console.log('\n=== After dotenv.config() ===');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? process.env.JWT_SECRET.substring(0, 10) + '...' : 'MISSING');
console.log('NODE_ENV:', process.env.NODE_ENV);

// Test with explicit path
dotenv.config({ path: '.env' });
console.log('\n=== After dotenv.config({ path: ".env" }) ===');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? process.env.JWT_SECRET.substring(0, 10) + '...' : 'MISSING');

// Test JWT signing
import jwt from 'jsonwebtoken';
const testToken = jwt.sign(
  { id: 1, email: 'test@test.com', role: 'ADMIN', name: 'Test User' },
  process.env.JWT_SECRET,
  { expiresIn: '15m' }
);
console.log('\n=== Test Token ===');
console.log('Token:', testToken);

// Test JWT verification
try {
  const decoded = jwt.verify(testToken, process.env.JWT_SECRET);
  console.log('✅ Token verification successful');
  console.log('Decoded:', decoded);
} catch (error) {
  console.log('❌ Token verification failed:', error.message);
}
