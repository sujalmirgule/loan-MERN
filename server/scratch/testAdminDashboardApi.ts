import { authService } from '../src/services/authService';
import { dashboardService } from '../src/services/dashboardService';

async function testApi() {
  console.log('=== TESTING ADMIN AUTH & DASHBOARD SERVICE ===');

  try {
    const loginRes = await authService.loginAdmin('admin@loanapprove.com', 'Admin@123');
    console.log('Admin login successful!');
    console.log('User Role:', loginRes.user.role);
    console.log('Admin Role:', loginRes.user.adminRole);
    console.log('Token Length:', loginRes.token.length);

    const dashData = await dashboardService.getAdminDashboardData({});
    console.log('\nDashboard Data Returned Successfully:');
    console.log('KPI Keys:', Object.keys(dashData.kpis));
    console.log('Funnel Steps Count:', dashData.funnel.length);
    console.log('Application Trend Count:', dashData.applicationTrend.length);
    console.log('Recent Applications Count:', dashData.recentApplications.length);
  } catch (err) {
    console.error('Error during test:', err);
  }
}

testApi();
