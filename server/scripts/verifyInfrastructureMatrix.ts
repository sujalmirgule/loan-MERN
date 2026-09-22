const API_BASE = 'http://localhost:5000/api';

async function request(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const res = await fetch(url, options);
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const json = await res.json();
    return { status: res.status, ok: res.ok, data: json, headers: res.headers };
  } else {
    const buffer = await res.arrayBuffer();
    return { status: res.status, ok: res.ok, data: Buffer.from(buffer), headers: res.headers };
  }
}

async function main() {
  console.log('====================================================');
  console.log('MASTER BACKEND / AUTH / API INFRASTRUCTURE VERIFICATION');
  console.log('====================================================');

  // 1. Health Endpoint Check
  console.log('\n[1] Checking Health Endpoint...');
  const healthRes = await request('/health');
  console.log(`- Health Check: Status ${healthRes.status}, data:`, healthRes.data);
  if (healthRes.status !== 200) throw new Error('Health check failed');

  // 2. Admin Authentication
  console.log('\n[2] Logging in Admin...');
  const adminLoginRes = await request('/auth/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@loanapprove.com',
      password: 'Admin@123456',
    }),
  });
  if (adminLoginRes.status !== 200) throw new Error(`Admin login failed: ${JSON.stringify(adminLoginRes.data)}`);
  const adminToken = (adminLoginRes.data as any).data.token;
  const adminHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${adminToken}`,
  };
  console.log(`- Admin Login: Status ${adminLoginRes.status}, Token: ${adminToken.slice(0, 15)}...`);

  // 3. Admin Dashboard
  console.log('\n[3] Testing Admin Dashboard (GET /api/admin/dashboard)...');
  const dashRes = await request('/admin/dashboard', { headers: adminHeaders });
  console.log(`- Dashboard: Status ${dashRes.status}, KPIs:`, (dashRes.data as any).data?.kpis);
  if (dashRes.status !== 200) throw new Error('Dashboard failed');

  // 4. Admin UPI Settings (GET & PATCH)
  console.log('\n[4] Testing Admin UPI Settings (GET & PATCH /api/admin/settings/upi)...');
  const upiGetRes = await request('/admin/settings/upi', { headers: adminHeaders });
  console.log(`- UPI Settings GET: Status ${upiGetRes.status}, VPA: ${(upiGetRes.data as any).data?.upiId}`);
  if (upiGetRes.status !== 200) throw new Error('UPI Settings GET failed');

  const upiPatchRes = await request('/admin/settings/upi', {
    method: 'PATCH',
    headers: adminHeaders,
    body: JSON.stringify({
      enabled: true,
      upiId: 'finance.corp@icici',
      merchantName: 'Loan Finance Services Ltd',
    }),
  });
  console.log(`- UPI Settings PATCH: Status ${upiPatchRes.status}, Updated VPA: ${(upiPatchRes.data as any).data?.upiId}`);
  if (upiPatchRes.status !== 200) throw new Error('UPI Settings PATCH failed');

  // 5. Dynamic KYC Charge Update (₹499 -> ₹799)
  console.log('\n[5] Updating KYC Charge to ₹799 (PATCH /api/admin/charges/config)...');
  const chargeConfigRes = await request('/admin/charges/config', {
    method: 'PATCH',
    headers: adminHeaders,
    body: JSON.stringify({ kycChargeAmount: 799 }),
  });
  console.log(`- Charges Config: Status ${chargeConfigRes.status}, KYC Charge: ₹${(chargeConfigRes.data as any).data?.kycChargeAmount}`);
  if (chargeConfigRes.status !== 200) throw new Error('Charge config update failed');

  // 6. Customer Register & Login
  const testMobile = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
  console.log(`\n[6] Registering Fresh Test Customer with mobile ${testMobile}...`);
  const regRes = await request('/auth/customer/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Rajesh Infrastructure Test',
      mobile: testMobile,
      email: `rajesh.${testMobile}@infra.test`,
      address: '404 Infrastructure Way, BKC',
      state: 'Maharashtra',
      city: 'Mumbai',
      aadhaar: '567812349012',
      monthlyIncome: 65000,
    }),
  });
  if (regRes.status !== 201) throw new Error(`Customer register failed: ${JSON.stringify(regRes.data)}`);
  const customerToken = (regRes.data as any).data.token;
  const customerId = (regRes.data as any).data.user.id;
  const customerHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${customerToken}`,
  };
  console.log(`- Customer Registered: Status ${regRes.status}, ID: ${customerId}`);

  // 7. Customer KYC Upload (Aadhaar Front + Back) using Blob / FormData
  console.log('\n[7] Uploading Aadhaar Front + Back (Customer)...');
  const blobFront = new Blob(['PDF_DUMMY_CONTENT_FRONT'], { type: 'application/pdf' });
  const form1 = new FormData();
  form1.append('documentType', 'AADHAAR_FRONT');
  form1.append('file', blobFront, 'aadhaar_front.pdf');

  const upFrontRes = await request('/customer/documents', {
    method: 'POST',
    headers: { Authorization: `Bearer ${customerToken}` },
    body: form1,
  });
  console.log(`- Aadhaar Front Upload: Status ${upFrontRes.status}`);
  if (upFrontRes.status !== 201) throw new Error(`Aadhaar Front upload failed: ${JSON.stringify(upFrontRes.data)}`);

  const blobBack = new Blob(['PDF_DUMMY_CONTENT_BACK'], { type: 'application/pdf' });
  const form2 = new FormData();
  form2.append('documentType', 'AADHAAR_BACK');
  form2.append('file', blobBack, 'aadhaar_back.pdf');

  const upBackRes = await request('/customer/documents', {
    method: 'POST',
    headers: { Authorization: `Bearer ${customerToken}` },
    body: form2,
  });
  console.log(`- Aadhaar Back Upload: Status ${upBackRes.status}`);
  if (upBackRes.status !== 201) throw new Error(`Aadhaar Back upload failed: ${JSON.stringify(upBackRes.data)}`);

  // 8. Admin KYC Queue (GET /api/admin/kyc)
  console.log('\n[8] Verifying Customer in Admin KYC Queue (GET /api/admin/kyc)...');
  const kycQueueRes = await request('/admin/kyc', { headers: adminHeaders });
  const kycCustomers = (kycQueueRes.data as any).data?.customers || [];
  const kycItem = kycCustomers.find((c: any) => c.id === customerId);
  console.log(`- KYC Queue: Status ${kycQueueRes.status}, Found: ${Boolean(kycItem)}, KYC Status: ${kycItem?.kycStatus}`);
  if (!kycItem) throw new Error('Customer not appearing in KYC queue after Aadhaar Front + Back upload');

  // 9. Admin Customer 360 (GET /api/admin/customers/:id)
  console.log(`\n[9] Verifying Admin Customer 360 (GET /api/admin/customers/${customerId})...`);
  const c360Res = await request(`/admin/customers/${customerId}`, { headers: adminHeaders });
  const c360 = (c360Res.data as any).data;
  console.log(`- Customer 360: Status ${c360Res.status}, Name: ${c360?.customer?.fullName}, Docs: ${c360?.documents?.length}`);
  if (c360Res.status !== 200) throw new Error('Customer 360 failed');

  // 10. Customer KYC Charge Reflection (₹799)
  console.log('\n[10] Checking Customer Charges (GET /api/customer/charges)...');
  const custChargesRes = await request('/customer/charges', { headers: customerHeaders });
  const chargesList = (custChargesRes.data as any).data || [];
  const kycCharge = chargesList.find((c: any) => c.name?.includes('KYC') || c.chargeType === 'KYC_VERIFICATION');
  console.log(`- Customer KYC Charge: ₹${kycCharge?.amount} (Expected ₹799)`);
  if (kycCharge?.amount !== 799) throw new Error(`KYC charge expected ₹799 but got ₹${kycCharge?.amount}`);

  // 11. Customer KYC UTR Payment Submission (POST /api/customer/charges/:id/submit-utr)
  const testUtr = String(Math.floor(100000000000 + Math.random() * 900000000000));
  console.log(`\n[11] Submitting UTR ${testUtr} for KYC Charge (POST /api/customer/charges/${kycCharge.id}/submit-utr)...`);
  const utrSubmissionRes = await request(`/customer/charges/${kycCharge.id}/submit-utr`, {
    method: 'POST',
    headers: customerHeaders,
    body: JSON.stringify({
      utr: testUtr,
      paymentMethod: 'UPI',
    }),
  });
  console.log(`- UTR Submission: Status ${utrSubmissionRes.status}, Data:`, utrSubmissionRes.data);
  if (utrSubmissionRes.status !== 200 && utrSubmissionRes.status !== 201) throw new Error('UTR submission failed');

  // 12. Admin KYC Approval (POST /api/admin/kyc/:id/decision)
  console.log(`\n[12] Approving KYC as Admin (POST /api/admin/kyc/${customerId}/decision)...`);
  const kycDecisionRes = await request(`/admin/kyc/${customerId}/decision`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      status: 'APPROVED',
      reason: 'All identity documents and UTR payment verified by underwriting team.',
    }),
  });
  console.log(`- KYC Approval: Status ${kycDecisionRes.status}, KYC Status: ${(kycDecisionRes.data as any).data?.kycStatus}`);
  if (kycDecisionRes.status !== 200) throw new Error('KYC approval failed');

  // 13. Invoice Verification
  console.log(`\n[13] Verifying KYC Invoice (GET /api/customer/charges/${kycCharge.id}/invoice)...`);
  const invoiceRes = await request(`/customer/charges/${kycCharge.id}/invoice`, { headers: customerHeaders });
  console.log(`- Customer Invoice PDF: Status ${invoiceRes.status}, PDF Size: ${(invoiceRes.data as Buffer).length} bytes`);
  if (invoiceRes.status !== 200 || (invoiceRes.data as Buffer).length < 1000) throw new Error('Customer Invoice generation failed');

  const adminInvoiceRes = await request(`/admin/customers/${customerId}/invoice/pdf`, { headers: adminHeaders });
  console.log(`- Admin Customer 360 Invoice PDF: Status ${adminInvoiceRes.status}, PDF Size: ${(adminInvoiceRes.data as Buffer).length} bytes`);
  if (adminInvoiceRes.status !== 200 || (adminInvoiceRes.data as Buffer).length < 1000) throw new Error('Admin Invoice download failed');

  console.log('\n====================================================');
  console.log('ALL INFRASTRUCTURE ENDPOINTS & WORKFLOWS VERIFIED: 100% PASS');
  console.log('====================================================');
}

main().catch((err) => {
  console.error('VERIFICATION ERROR:', err);
  process.exit(1);
});
