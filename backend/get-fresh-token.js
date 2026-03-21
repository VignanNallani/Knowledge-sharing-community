// Get fresh token after proper fix
import authService from './src/services/auth.service.js';

const credentials = {
  email: 'vignan123@gmail.com',
  password: 'Test1234'
};

try {
  const result = await authService.login(credentials);
  console.log('FRESH TOKEN:', result.accessToken);
} catch (error) {
  console.log('ERROR:', error.message);
}
