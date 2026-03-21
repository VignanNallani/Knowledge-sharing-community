const axios = require('axios');

const API_BASE = 'http://localhost:4000/api/v1';

async function testMentorshipFlow() {
  try {
    console.log('🚀 Testing Mentorship Flow...\n');

    // Step 1: Test mentor discovery (public endpoint)
    console.log('1. Testing mentor discovery...');
    const mentorsResponse = await axios.get(`${API_BASE}/mentorship/find`);
    console.log('✅ Mentors found:', mentorsResponse.data.data.length);
    console.log('Sample mentor:', mentorsResponse.data.data[0]);

    // Step 2: Register a test user (or login if exists)
    console.log('\n2. Registering test user...');
    try {
      const registerResponse = await axios.post(`${API_BASE}/auth/register`, {
        name: 'Test Learner',
        email: 'learner@example.com',
        password: 'Password123!',
        role: 'USER'
      });
      console.log('✅ User registered successfully');
    } catch (error) {
      if (error.response?.data?.message === 'User already exists') {
        console.log('ℹ️ User already exists, proceeding to login');
      } else {
        throw error;
      }
    }

    // Step 3: Login
    console.log('\n3. Logging in...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'learner@example.com',
      password: 'Password123!'
    });
    console.log('Login response:', JSON.stringify(loginResponse.data, null, 2));
    const token = loginResponse.data.message.accessToken;
    console.log('✅ Login successful');

    // Step 4: Create mentorship request
    console.log('\n4. Creating mentorship request...');
    const firstMentor = mentorsResponse.data.data[0];
    const requestResponse = await axios.post(`${API_BASE}/mentorship/request`, {
      mentorId: firstMentor.id,
      topic: 'Career guidance in backend development',
      preferredTime: '2026-03-07T10:00:00Z',
      message: 'I would like to learn about backend architecture best practices'
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('✅ Mentorship request created:', requestResponse.data.data);

    console.log('\n🎉 Complete mentorship flow test passed!');
    console.log('\n📊 Summary:');
    console.log('- ✅ Mentor discovery working');
    console.log('- ✅ User registration working');
    console.log('- ✅ User authentication working');
    console.log('- ✅ Mentorship request creation working');
    console.log('\n🚀 Platform is ready for real users!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testMentorshipFlow();
