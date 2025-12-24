// Test authentication with Python backend
const API_BASE_URL = 'http://localhost:8000';

async function testRegister() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        name: 'Test User',
        password: 'password123',
        role: 'admin'
      })
    });

    const data = await response.json();
    console.log('✅ Register response:', data);
    return data;
  } catch (error) {
    console.error('❌ Register failed:', error.message);
  }
}

async function testLogin() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123'
      })
    });

    const data = await response.json();
    console.log('✅ Login response:', data);
    return data;
  } catch (error) {
    console.error('❌ Login failed:', error.message);
  }
}

async function testGetMe(token) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await response.json();
    console.log('✅ Get me response:', data);
    return data;
  } catch (error) {
    console.error('❌ Get me failed:', error.message);
  }
}

async function runTests() {
  console.log('🧪 Testing authentication flow...\n');

  // Test registration
  console.log('1️⃣ Testing registration...');
  const registerResult = await testRegister();
  console.log('');

  // Test login
  console.log('2️⃣ Testing login...');
  const loginResult = await testLogin();
  console.log('');

  if (loginResult?.token) {
    // Test get current user
    console.log('3️⃣ Testing get current user...');
    await testGetMe(loginResult.token);
    console.log('');
  }

  console.log('✅ All tests completed!');
}

runTests();
