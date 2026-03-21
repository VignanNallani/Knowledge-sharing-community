// Test the login and extract token
import testAuthService from './src/services/test-auth.service.js';
import jwt from 'jsonwebtoken';

const credentials = {
  email: 'vignan123@gmail.com',
  password: 'Test1234'
};

try {
  console.log('=== TESTING LOGIN ===');
  const result = await testAuthService.login(credentials);
  console.log('Login successful!');
  console.log('Access Token:', result.accessToken);
  console.log('User:', result.user);
  
  // Test verification
  const secret = 'dev-jwt-secret-key-for-testing-only';
  const decoded = jwt.verify(result.accessToken, secret);
  console.log('✅ Token verification successful!');
  console.log('Decoded:', decoded);
  
} catch (error) {
  console.log('❌ Error:', error.message);
}
