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
  console.log('DOCUMENT BRANDING & MULTIPART UPLOAD PIPELINE TEST');
  console.log('====================================================');

  // 1. Admin Login
  console.log('\n[1] Logging in Admin...');
  const adminLogin = await request('/auth/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@loanapprove.com', password: 'Admin@123456' }),
  });
  if (!adminLogin.ok) throw new Error(`Admin login failed: ${JSON.stringify(adminLogin.data)}`);
  const adminToken = (adminLogin.data as any).data.token;
  const adminHeaders = { Authorization: `Bearer ${adminToken}` };
  console.log(`- Admin authenticated. Token: ${adminToken.slice(0, 15)}...`);

  // 2. Fetch Document Branding Settings
  console.log('\n[2] Fetching Document Branding Settings (GET /api/admin/settings/document-branding)...');
  const getBranding = await request('/admin/settings/document-branding', { headers: adminHeaders });
  console.log(`- Status: ${getBranding.status}, Config:`, getBranding.data);
  if (!getBranding.ok) throw new Error('Failed to fetch document branding settings');

  // 3. Upload Approval Header PNG (Multipart FormData with real PNG buffer)
  console.log('\n[3] Uploading New Approval Header PNG (POST /api/admin/settings/branding/upload-approval-header)...');
  // 1x1 transparent PNG binary bytes
  const pngHeaderBytes = Buffer.from('89504e470d0a1a0a0000000d4948445200000400000000e80806000000d8bc88b5000000017352474200aece1ce90000000b49444154785e6360000000020001e221bc330000000049454e44ae426082', 'hex');
  const formHeader = new FormData();
  formHeader.append('file', new Blob([pngHeaderBytes], { type: 'image/png' }), 'custom_approval_header.png');

  const uploadHeaderRes = await request('/admin/settings/branding/upload-approval-header', {
    method: 'POST',
    headers: adminHeaders,
    body: formHeader,
  });
  console.log(`- Status: ${uploadHeaderRes.status}, Response:`, uploadHeaderRes.data);
  if (!uploadHeaderRes.ok) throw new Error(`Approval Header upload failed: ${JSON.stringify(uploadHeaderRes.data)}`);
  const newHeaderUrl = (uploadHeaderRes.data as any).data.url;

  // 4. Upload Watermark PNG (Multipart FormData)
  console.log('\n[4] Uploading New Watermark PNG (POST /api/admin/settings/branding/upload-watermark-logo)...');
  const formWatermark = new FormData();
  formWatermark.append('file', new Blob([pngHeaderBytes], { type: 'image/png' }), 'custom_watermark.png');

  const uploadWatermarkRes = await request('/admin/settings/branding/upload-watermark-logo', {
    method: 'POST',
    headers: adminHeaders,
    body: formWatermark,
  });
  console.log(`- Status: ${uploadWatermarkRes.status}, Response:`, uploadWatermarkRes.data);
  if (!uploadWatermarkRes.ok) throw new Error(`Watermark upload failed: ${JSON.stringify(uploadWatermarkRes.data)}`);
  const newWatermarkUrl = (uploadWatermarkRes.data as any).data.url;

  // 5. Upload Logo PNG (Multipart FormData)
  console.log('\n[5] Uploading Primary Logo PNG (POST /api/admin/settings/branding/upload-logo)...');
  const formLogo = new FormData();
  formLogo.append('file', new Blob([pngHeaderBytes], { type: 'image/png' }), 'custom_logo.png');

  const uploadLogoRes = await request('/admin/settings/branding/upload-logo', {
    method: 'POST',
    headers: adminHeaders,
    body: formLogo,
  });
  console.log(`- Status: ${uploadLogoRes.status}, Response:`, uploadLogoRes.data);
  if (!uploadLogoRes.ok) throw new Error(`Logo upload failed: ${JSON.stringify(uploadLogoRes.data)}`);
  const newLogoUrl = (uploadLogoRes.data as any).data.url;

  // 6. Upload Favicon PNG (Multipart FormData)
  console.log('\n[6] Uploading Favicon PNG (POST /api/admin/settings/branding/upload-favicon)...');
  const formFavicon = new FormData();
  formFavicon.append('file', new Blob([pngHeaderBytes], { type: 'image/png' }), 'custom_favicon.png');

  const uploadFaviconRes = await request('/admin/settings/branding/upload-favicon', {
    method: 'POST',
    headers: adminHeaders,
    body: formFavicon,
  });
  console.log(`- Status: ${uploadFaviconRes.status}, Response:`, uploadFaviconRes.data);
  if (!uploadFaviconRes.ok) throw new Error(`Favicon upload failed: ${JSON.stringify(uploadFaviconRes.data)}`);
  const newFaviconUrl = (uploadFaviconRes.data as any).data.url;

  // 7. Save Document Branding Settings (PUT /api/admin/settings/document-branding)
  console.log('\n[7] Saving Document Branding (PUT /api/admin/settings/document-branding)...');
  const saveRes = await request('/admin/settings/document-branding', {
    method: 'PUT',
    headers: { ...adminHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      approvalLetterHeaderUrl: newHeaderUrl,
      watermarkLogoUrl: newWatermarkUrl,
      documentWatermarkEnabled: true,
      invoiceWatermarkEnabled: true,
      watermarkOpacity: 0.12,
      watermarkSize: 'LARGE',
      watermarkPosition: 'CENTER',
    }),
  });
  console.log(`- Status: ${saveRes.status}, Response:`, saveRes.data);
  if (!saveRes.ok) throw new Error(`Save document branding failed: ${JSON.stringify(saveRes.data)}`);

  // 8. Verify Persistence
  console.log('\n[8] Re-fetching Document Branding to Verify Persistence...');
  const verifyRes = await request('/admin/settings/document-branding', { headers: adminHeaders });
  const verifiedData = (verifyRes.data as any).data;
  console.log('- Verified Header URL:', verifiedData.approvalLetterHeaderUrl);
  console.log('- Verified Watermark URL:', verifiedData.watermarkLogoUrl);
  console.log('- Verified Opacity:', verifiedData.watermarkOpacity);
  if (verifiedData.approvalLetterHeaderUrl !== newHeaderUrl) throw new Error('Header URL not persisted in database');

  // 9. Preview Approval Letter PDF
  console.log('\n[9] Previewing Approval Letter PDF (GET /api/admin/settings/preview/approval-letter)...');
  const previewApprovalRes = await request('/admin/settings/preview/approval-letter', { headers: adminHeaders });
  console.log(`- Approval Letter PDF Preview: Status ${previewApprovalRes.status}, Size: ${(previewApprovalRes.data as Buffer).length} bytes`);
  if (!previewApprovalRes.ok || (previewApprovalRes.data as Buffer).length < 5000) {
    throw new Error('Approval Letter Preview PDF failed or generated corrupt output');
  }

  // 10. Preview Invoice PDF
  console.log('\n[10] Previewing Invoice PDF (GET /api/admin/settings/preview/invoice)...');
  const previewInvoiceRes = await request('/admin/settings/preview/invoice', { headers: adminHeaders });
  console.log(`- Invoice PDF Preview: Status ${previewInvoiceRes.status}, Size: ${(previewInvoiceRes.data as Buffer).length} bytes`);
  if (!previewInvoiceRes.ok || (previewInvoiceRes.data as Buffer).length < 5000) {
    throw new Error('Invoice Preview PDF failed or generated corrupt output');
  }

  // 11. Customer Document Multipart Upload Regression Check
  console.log('\n[11] Customer Document Multipart Upload Regression Check...');
  const testMobile = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
  const regRes = await request('/auth/customer/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Branding Pipeline Verifier',
      mobile: testMobile,
      email: `verifier.${testMobile}@test.com`,
      address: '99 Corporate Plaza',
      state: 'Gujarat',
      city: 'Ahmedabad',
      aadhaar: '123456789012',
      monthlyIncome: 75000,
    }),
  });
  const customerToken = (regRes.data as any).data.token;
  const customerHeaders = { Authorization: `Bearer ${customerToken}` };

  const formKyc = new FormData();
  formKyc.append('documentType', 'AADHAAR_FRONT');
  formKyc.append('file', new Blob([Buffer.from('DUMMY_PDF_BYTES')], { type: 'application/pdf' }), 'aadhaar_front.pdf');

  const kycUploadRes = await request('/customer/documents', {
    method: 'POST',
    headers: customerHeaders,
    body: formKyc,
  });
  console.log(`- Customer KYC Upload Status: ${kycUploadRes.status}`);
  if (!kycUploadRes.ok) throw new Error(`Customer KYC upload failed: ${JSON.stringify(kycUploadRes.data)}`);

  console.log('\n====================================================');
  console.log('BRANDING & MULTIPART PIPELINE FULLY OPERATIONAL: PASS');
  console.log('====================================================');
}

main().catch((err) => {
  console.error('VERIFICATION ERROR:', err);
  process.exit(1);
});
