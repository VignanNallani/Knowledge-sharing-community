import jwt from 'jsonwebtoken';

// Test the exact same code as in our auth service
const generateAccessToken = (user) => {
  const JWT_SECRET = 'dev-jwt-secret-key-for-testing-only';
  
  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: '15m' }
  );
  
  return token;
};

// Test the exact same code as in our middleware
const verifyToken = (token) => {
  const JWT_SECRET = 'dev-jwt-secret-key-for-testing-only';
  
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw error;
  }
};

// Test with the same user data
const user = { id: 1, email: 'vignan123@gmail.com', role: 'ADMIN', name: 'Vignan Admin' };

console.log('=== TESTING TOKEN GENERATION & VERIFICATION ===');
console.log('User data:', user);

const token = generateAccessToken(user);
console.log('Generated token:', token);

try {
  const decoded = verifyToken(token);
  console.log('✅ Token verification successful');
  console.log('Decoded payload:', decoded);
} catch (error) {
  console.log('❌ Token verification failed:', error.message);
}

// Test with the actual API token
const apiToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJ2aWduYW4xMjNAZ21haWwuY29tIiwicm9sZSI6IkFETUlOIiwibmFtZSI6IlZpZ25hbiBBZG1pbiIsImlhdCI6MTc3Mzk5NTI0OCwiZXhwIjoxNzM5OTYxNDg1fQ.2Dm7TSaMpEMHZnUNR5o9utJ8E74Ohkqtes_3hMHG3PQ';

console.log('\n=== TESTING API TOKEN ===');
try {
  const decoded = verifyToken(apiToken);
  console.log('✅ API token verification successful');
  console.log('Decoded payload:', decoded);
} catch (error) {
  console.log('❌ API token verification failed:', error.message);
}
