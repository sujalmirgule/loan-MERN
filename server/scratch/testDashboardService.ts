import { dashboardService } from '../src/services/dashboardService';

async function testDash() {
  console.log('Testing getAdminDashboardData()...');
  try {
    const data = await dashboardService.getAdminDashboardData({});
    console.log('Success! Data returned:');
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('ERROR in getAdminDashboardData:', err);
  }
}

testDash();
