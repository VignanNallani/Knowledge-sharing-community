// Test if our changes are actually being loaded
import authService from './src/services/auth.service.js';

console.log('=== TESTING AUTH SERVICE DIRECTLY ===');

// Test user
const user = { id: 1, email: 'vignan123@gmail.com', role: 'ADMIN', name: 'Vignan Admin' };

try {
  // Call the method directly
  const token = authService.generateAccessToken(user);
  console.log('Generated token:', token);
  
  // Test verification
  const decoded = authService.verifyToken(token);
  console.log('✅ Token verification successful');
  console.log('Decoded:', decoded);
} catch (error) {
  console.log('❌ Error:', error.message);
}
