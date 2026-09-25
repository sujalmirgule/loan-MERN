import { authService } from '../src/services/authService';

async function testHttpEndpoint() {
  console.log('=== TESTING HTTP /api/admin/dashboard ENDPOINT ===');

  try {
    const loginRes = await authService.loginAdmin('admin@loanapprove.com', 'Admin@123');
    const token = loginRes.token;

    const res = await fetch('http://localhost:5000/api/admin/dashboard', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('HTTP Status:', res.status, res.statusText);
    const body = await res.json();
    console.log('HTTP Response Body Success:', body.success);
    console.log('Data structure keys:', Object.keys(body.data || {}));
  } catch (err) {
    console.error('Error during HTTP fetch test:', err);
  }
}

testHttpEndpoint();
