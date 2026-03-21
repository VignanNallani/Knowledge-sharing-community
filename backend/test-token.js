import jwt from 'jsonwebtoken';

// Test with hardcoded secret like in our code
const JWT_SECRET = 'dev-jwt-secret-key-for-testing-only';

// Create a token exactly like our auth service
const testToken = jwt.sign(
  { id: 1, email: 'vignan123@gmail.com', role: 'ADMIN', name: 'Vignan Admin' },
  JWT_SECRET,
  { expiresIn: '15m' }
);

console.log('=== TOKEN TEST ===');
console.log('Generated token:', testToken);

// Test verification with same secret
try {
  const decoded = jwt.verify(testToken, JWT_SECRET);
  console.log('✅ Token verification successful');
  console.log('Decoded:', decoded);
} catch (error) {
  console.log('❌ Token verification failed:', error.message);
}

// Test the actual token from the API
const apiToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJ2aWduYW4xMjNAZ21haWwuY29tIiwicm9sZSI6IkFETUlOIiwibmFtZSI6IlZpZ25hbiBBZG1pbiIsImlhdCI6MTc3Mzk4MzUwMCwiZXhwIjoxNzM5ODQ0NDA1fQ.blGPmZ3XPDIaeX6WUNAEG6kzZY6wPCgmu1VGbynb45Y';

console.log('\n=== API TOKEN TEST ===');
try {
  const decoded = jwt.verify(apiToken, JWT_SECRET);
  console.log('✅ API token verification successful');
  console.log('Decoded:', decoded);
} catch (error) {
  console.log('❌ API token verification failed:', error.message);
}
