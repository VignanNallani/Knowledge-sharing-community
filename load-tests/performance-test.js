import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const writeErrors = new Rate('write_errors');
const readErrors = new Rate('read_errors');

export const options = {
  stages: [
    { duration: '2m', target: 100 },  // Ramp up to 100 users
    { duration: '5m', target: 100 },  // Stay at 100 users
    { duration: '2m', target: 500 },  // Ramp up to 500 users
    { duration: '5m', target: 500 },  // Stay at 500 users
    { duration: '2m', target: 1000 }, // Ramp up to 1000 users
    { duration: '5m', target: 1000 }, // Stay at 1000 users
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'], // 95% of requests under 1s
    http_req_failed: ['rate<0.05'],    // Error rate under 5%
    errors: ['rate<0.05'],
    write_errors: ['rate<0.1'],        // Allow higher error rate for writes
    read_errors: ['rate<0.02'],        // Lower error rate for reads
  },
};

const BASE_URL = 'http://localhost:4000';

// Test data
const testPosts = [
  { title: 'Performance Test Post 1', content: 'Content for performance testing...' },
  { title: 'Performance Test Post 2', content: 'More content for load testing...' },
  { title: 'Performance Test Post 3', content: 'Additional test content...' },
  { title: 'Performance Test Post 4', content: 'Yet more test content...' },
  { title: 'Performance Test Post 5', content: 'Final test content entry...' },
];

export function setup() {
  // Create a test user and get token
  const loginResponse = http.post(`${BASE_URL}/api/v1/auth/login`, JSON.stringify({
    email: 'loadtest@performance.com',
    password: 'password123'
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
  
  if (loginResponse.status === 200) {
    const data = JSON.parse(loginResponse.body);
    return { token: data.data.accessToken };
  }
  
  return { token: null };
}

export default function(data) {
  if (!data.token) {
    console.error('Failed to get auth token in setup');
    return;
  }
  
  const headers = {
    'Authorization': `Bearer ${data.token}`,
    'Content-Type': 'application/json',
  };

  // Test 1: Read operations (80% of traffic)
  if (Math.random() < 0.8) {
    // Get posts with pagination
    const postsResponse = http.get(`${BASE_URL}/api/v1/posts?limit=20`, { headers });
    const postsOk = check(postsResponse, {
      'posts status is 200': (r) => r.status === 200,
      'posts response time < 500ms': (r) => r.timings.duration < 500,
      'posts has data': (r) => {
        try {
          const data = JSON.parse(r.body);
          return data.data && Array.isArray(data.data.data);
        } catch {
          return false;
        }
      },
    });
    readErrors.add(!postsOk);
    errorRate.add(!postsOk);

    // Get mentors
    const mentorsResponse = http.get(`${BASE_URL}/api/v1/mentorship`, { headers });
    const mentorsOk = check(mentorsResponse, {
      'mentors status is 200': (r) => r.status === 200,
      'mentors response time < 300ms': (r) => r.timings.duration < 300,
    });
    readErrors.add(!mentorsOk);
    errorRate.add(!mentorsOk);
  }
  
  // Test 2: Write operations (20% of traffic)
  else {
    const postTemplate = testPosts[Math.floor(Math.random() * testPosts.length)];
    const postPayload = {
      title: `${postTemplate.title} - ${Date.now()}`,
      content: `${postTemplate.content} - Load test at ${new Date().toISOString()}`,
      idempotencyKey: `load-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };

    // Create post
    const createResponse = http.post(`${BASE_URL}/api/v1/posts`, JSON.stringify(postPayload), { headers });
    const createOk = check(createResponse, {
      'create status is 201': (r) => r.status === 201,
      'create response time < 2000ms': (r) => r.timings.duration < 2000,
      'create has post ID': (r) => {
        try {
          const data = JSON.parse(r.body);
          return data.data && data.data.id;
        } catch {
          return false;
        }
      },
    });
    writeErrors.add(!createOk);
    errorRate.add(!createOk);

    // If post created successfully, try to get it
    if (createResponse.status === 201) {
      const postData = JSON.parse(createResponse.body);
      const getResponse = http.get(`${BASE_URL}/api/v1/posts/${postData.data.id}`, { headers });
      const getOk = check(getResponse, {
        'get created post status is 200': (r) => r.status === 200,
        'get created post response time < 300ms': (r) => r.timings.duration < 300,
      });
      readErrors.add(!getOk);
      errorRate.add(!getOk);
    }
  }

  // Test 3: Health check (every 10 iterations)
  if (Math.random() < 0.1) {
    const healthResponse = http.get(`${BASE_URL}/health`);
    const healthOk = check(healthResponse, {
      'health status is 200': (r) => r.status === 200,
      'health response time < 100ms': (r) => r.timings.duration < 100,
    });
    errorRate.add(!healthOk);
  }

  sleep(Math.random() * 2 + 1); // Random sleep between 1-3 seconds
}

export function teardown(data) {
  console.log('Performance load test completed');
}
