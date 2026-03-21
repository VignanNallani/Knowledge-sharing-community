import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up to 100 users
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 200 }, // Ramp up to 200 users
    { duration: '5m', target: 200 }, // Stay at 200 users
    { duration: '2m', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
    http_req_failed: ['rate<0.1'],    // Error rate under 10%
    errors: ['rate<0.1'],             // Custom error rate under 10%
  },
};

const BASE_URL = 'http://localhost:4000';

// Test data
const users = [
  { email: 'user1@test.com', password: 'password123' },
  { email: 'user2@test.com', password: 'password123' },
  { email: 'user3@test.com', password: 'password123' },
  { email: 'user4@test.com', password: 'password123' },
  { email: 'user5@test.com', password: 'password123' },
];

export function setup() {
  // Create test users and get tokens
  const tokens = [];
  
  for (const user of users) {
    const loginResponse = http.post(`${BASE_URL}/api/v1/auth/login`, JSON.stringify(user), {
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (loginResponse.status === 200) {
      const data = JSON.parse(loginResponse.body);
      tokens.push(data.data.accessToken);
    }
  }
  
  return { tokens };
}

export default function(data) {
  // Select a random user token
  const token = data.tokens[Math.floor(Math.random() * data.tokens.length)];
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  // Test 1: Get posts (main read operation)
  const postsResponse = http.get(`${BASE_URL}/api/v1/posts`, { headers });
  const postsOk = check(postsResponse, {
    'posts status is 200': (r) => r.status === 200,
    'posts response time < 500ms': (r) => r.timings.duration < 500,
    'posts has data array': (r) => {
      try {
        const data = JSON.parse(r.body);
        return Array.isArray(data.data);
      } catch {
        return false;
      }
    },
  });
  errorRate.add(!postsOk);

  // Test 2: Get user profile
  const profileResponse = http.get(`${BASE_URL}/api/v1/auth/me`, { headers });
  const profileOk = check(profileResponse, {
    'profile status is 200': (r) => r.status === 200,
    'profile has user data': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.data && data.data.email;
      } catch {
        return false;
      }
    },
  });
  errorRate.add(!profileOk);

  // Test 3: Create a post (write operation)
  const postPayload = {
    title: `Load Test Post ${Date.now()}`,
    content: 'This is a load test post created during performance testing.',
    idempotencyKey: `load-test-${Date.now()}-${Math.random()}`,
  };

  const createResponse = http.post(`${BASE_URL}/api/v1/posts`, JSON.stringify(postPayload), { headers });
  const createOk = check(createResponse, {
    'create status is 201': (r) => r.status === 201,
    'create response time < 1000ms': (r) => r.timings.duration < 1000,
    'create has post data': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.data && data.data.id;
      } catch {
        return false;
      }
    },
  });
  errorRate.add(!createOk);

  // Test 4: Get mentors
  const mentorsResponse = http.get(`${BASE_URL}/api/v1/mentorship`, { headers });
  const mentorsOk = check(mentorsResponse, {
    'mentors status is 200': (r) => r.status === 200,
    'mentors response time < 300ms': (r) => r.timings.duration < 300,
  });
  errorRate.add(!mentorsOk);

  // Test 5: Health check
  const healthResponse = http.get(`${BASE_URL}/health`);
  const healthOk = check(healthResponse, {
    'health status is 200': (r) => r.status === 200,
    'health response time < 100ms': (r) => r.timings.duration < 100,
  });
  errorRate.add(!healthOk);

  sleep(1); // Wait 1 second between iterations
}

export function teardown(data) {
  // Cleanup test data if needed
  console.log('Load test completed');
}
