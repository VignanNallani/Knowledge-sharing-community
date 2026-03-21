// Quick test to get fresh token
import authService from './src/services/auth.service.js';

const credentials = {
  email: 'vignan123@gmail.com',
  password: 'Test1234'
};

try {
  const result = await authService.login(credentials);
  console.log('TOKEN:', result.accessToken);
} catch (error) {
  console.log('ERROR:', error.message);
}
