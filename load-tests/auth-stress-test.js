import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const authErrors = new Rate('auth_errors');
const rateLimitErrors = new Rate('rate_limit_errors');

export const options = {
  stages: [
    { duration: '1m', target: 50 },   // Ramp up to 50 users
    { duration: '3m', target: 50 },   // Stay at 50 users
    { duration: '1m', target: 100 },  // Ramp up to 100 users
    { duration: '3m', target: 100 },  // Stay at 100 users
    { duration: '1m', target: 200 },  // Ramp up to 200 users
    { duration: '3m', target: 200 },  // Stay at 200 users
    { duration: '1m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests under 2s for auth
    http_req_failed: ['rate<0.15'],    // Error rate under 15%
    errors: ['rate<0.15'],
    auth_errors: ['rate<0.05'],
    rate_limit_errors: ['rate<0.1'],
  },
};

const BASE_URL = 'http://localhost:4000';

// Test users
const testUsers = [
  { email: 'loadtest1@test.com', password: 'password123' },
  { email: 'loadtest2@test.com', password: 'password123' },
  { email: 'loadtest3@test.com', password: 'password123' },
  { email: 'loadtest4@test.com', password: 'password123' },
  { email: 'loadtest5@test.com', password: 'password123' },
];

export default function() {
  // Test 1: Login with different users
  const user = testUsers[Math.floor(Math.random() * testUsers.length)];
  
  const loginResponse = http.post(`${BASE_URL}/api/v1/auth/login`, JSON.stringify(user), {
    headers: { 'Content-Type': 'application/json' },
  });
  
  const loginOk = check(loginResponse, {
    'login status is 200': (r) => r.status === 200,
    'login response time < 1000ms': (r) => r.timings.duration < 1000,
    'login has access token': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.data && data.data.accessToken;
      } catch {
        return false;
      }
    },
  });
  
  errorRate.add(!loginOk);
  authErrors.add(!loginOk);

  if (loginResponse.status === 200) {
    const data = JSON.parse(loginResponse.body);
    const token = data.data.accessToken;
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    // Test 2: Token refresh behavior
    sleep(5); // Wait to test token refresh
    
    const profileResponse = http.get(`${BASE_URL}/api/v1/auth/me`, { headers });
    const profileOk = check(profileResponse, {
      'profile status is 200': (r) => r.status === 200,
      'profile response time < 500ms': (r) => r.timings.duration < 500,
    });
    
    errorRate.add(!profileOk);
    authErrors.add(!profileOk);

    // Test 3: Rate limiting on login endpoint
    const rateLimitResponse = http.post(`${BASE_URL}/api/v1/auth/login`, JSON.stringify(user), {
      headers: { 'Content-Type': 'application/json' },
    });
    
    const rateLimitOk = check(rateLimitResponse, {
      'rate limit handled correctly': (r) => r.status !== 429 || (r.status === 429 && r.headers['Retry-After']),
    });
    
    rateLimitErrors.add(!rateLimitOk);

    // Test 4: Logout
    const logoutResponse = http.post(`${BASE_URL}/api/v1/auth/logout`, '', { headers });
    const logoutOk = check(logoutResponse, {
      'logout status is 200': (r) => r.status === 200,
      'logout response time < 500ms': (r) => r.timings.duration < 500,
    });
    
    errorRate.add(!logoutOk);
  }

  sleep(1);
}
