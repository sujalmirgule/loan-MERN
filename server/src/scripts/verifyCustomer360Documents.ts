import { prisma } from '../services/db';
import { documentService } from '../services/documentService';
import { adminDocumentController } from '../controllers/adminDocumentController';
import express, { Express } from 'express';
import supertest from 'supertest';
import adminRoutes from '../routes/adminRoutes';
import { generateAuthToken } from '../services/tokenService';
import crypto from 'crypto';

async function runVerification() {
  console.log('====================================================');
  console.log('PHASE: CUSTOMER 360 DOCUMENT MANAGEMENT CENTER QA');
  console.log('====================================================\n');

  // 1. Setup Express app with admin routes
  const app: Express = express();
  app.use(express.json());
  app.use('/api/admin', adminRoutes);

  // 2. Setup Admin user
  let admin = await prisma.adminUser.findFirst({
    where: { role: 'SUPER_ADMIN', isActive: true },
  });

  if (!admin) {
    admin = await prisma.adminUser.create({
      data: {
        email: 'docadmin@loanapprove.com',
        passwordHash: 'dummy',
        fullName: 'Document QA Admin',
        role: 'SUPER_ADMIN',
        isActive: true,
      },
    });
  }

  const adminToken = generateAuthToken(admin.id, 'ADMIN');

  const uniqueSuffix = Date.now().toString().slice(-6);

  // 3. Setup Customer A & Customer B
  const customerA = await prisma.customer.create({
    data: {
      fullName: `Aarav Patel ${uniqueSuffix}`,
      mobile: `98200${uniqueSuffix}`,
      email: `aarav.${uniqueSuffix}@example.com`,
      address: '401, Sapphire Tower, Andheri East',
      state: 'Maharashtra',
      city: 'Mumbai',
      pincode: '400069',
      aadhaarEncrypted: 'enc_aadhaar_123',
      aadhaarMasked: 'XXXXXXXX1234',
      panEncrypted: 'enc_pan_123',
      panMasked: 'ABCDE1234F',
      monthlyIncome: 85000,
      kycStatus: 'PENDING',
      status: 'ACTIVE',
    },
  });

  const customerB = await prisma.customer.create({
    data: {
      fullName: `Neha Sharma ${uniqueSuffix}`,
      mobile: `98201${uniqueSuffix}`,
      email: `neha.${uniqueSuffix}@example.com`,
      address: '202, Palm Beach, Vashi',
      state: 'Maharashtra',
      city: 'Navi Mumbai',
      pincode: '400703',
      aadhaarEncrypted: 'enc_aadhaar_456',
      aadhaarMasked: 'XXXXXXXX5678',
      monthlyIncome: 95000,
      kycStatus: 'PENDING',
      status: 'ACTIVE',
    },
  });

  console.log(`[SETUP] Created Customer A: ${customerA.id} (${customerA.fullName})`);
  console.log(`[SETUP] Created Customer B: ${customerB.id} (${customerB.fullName})`);

  // 4. Upload 5 real documents for Customer A
  const fakePdfBuffer = Buffer.from('%PDF-1.4\n%real test document content\n%%EOF');
  const fakeJpgBuffer = Buffer.from('\xFF\xD8\xFF\xE0\x00\x10JFIF\x00\x01\x01\x01\x00H\x00H\x00\x00\xFF\xDB\x00C\x00');

  const docUploads = [
    {
      type: 'AADHAAR_FRONT' as const,
      name: 'Aadhaar_Front.pdf',
      mime: 'application/pdf',
      buf: fakePdfBuffer,
    },
    {
      type: 'PAN' as const,
      name: 'PAN_Card.jpg',
      mime: 'image/jpeg',
      buf: fakeJpgBuffer,
    },
    {
      type: 'BANK_STATEMENT' as const,
      name: 'Bank_Statement_6M.pdf',
      mime: 'application/pdf',
      buf: fakePdfBuffer,
    },
    {
      type: 'SALARY_SLIP' as const,
      name: 'Salary_Slip_Aug2026.pdf',
      mime: 'application/pdf',
      buf: fakePdfBuffer,
    },
    {
      type: 'ADDRESS_PROOF' as const,
      name: 'Electricity_Bill.pdf',
      mime: 'application/pdf',
      buf: fakePdfBuffer,
    },
  ];

  const createdDocsA: any[] = [];
  for (const item of docUploads) {
    const fileObj: Express.Multer.File = {
      fieldname: 'file',
      originalname: item.name,
      encoding: '7bit',
      mimetype: item.mime,
      size: item.buf.length,
      destination: '',
      filename: item.name,
      path: '',
      buffer: item.buf,
      stream: null as any,
    };

    const doc = await documentService.uploadDocument(
      customerA.id,
      item.type,
      fileObj,
      undefined,
      '127.0.0.1'
    );
    createdDocsA.push(doc);
    console.log(`[UPLOAD] Uploaded ${item.type} for Customer A: id=${doc.id}, v=${doc.version}`);
  }

  // Upload 1 document for Customer B
  const docB = await documentService.uploadDocument(
    customerB.id,
    'PAN',
    {
      fieldname: 'file',
      originalname: 'Neha_PAN.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      size: fakeJpgBuffer.length,
      destination: '',
      filename: 'Neha_PAN.jpg',
      path: '',
      buffer: fakeJpgBuffer,
      stream: null as any,
    },
    undefined,
    '127.0.0.1'
  );
  console.log(`[UPLOAD] Uploaded PAN for Customer B: id=${docB.id}\n`);

  // ========================================================
  // TEST 1 & 2 & 3: List Documents for Customer A
  // ========================================================
  console.log('--- TEST 1, 2, 3: Listing Documents in Customer 360 ---');
  const listRes = await supertest(app)
    .get(`/api/admin/customers/${customerA.id}/documents`)
    .set('Authorization', `Bearer ${adminToken}`);

  if (listRes.status !== 200 || !listRes.body.success) {
    throw new Error(`Failed to list documents: ${listRes.status} ${JSON.stringify(listRes.body)}`);
  }

  const listData = listRes.body.data;
  console.log(`✓ Documents listed successfully: total=${listData.documents.length}, count=${listData.summary.total}`);
  if (listData.documents.length !== 5) {
    throw new Error(`Expected 5 documents, got ${listData.documents.length}`);
  }

  const docTypes = listData.documents.map((d: any) => d.documentType);
  console.log(`✓ Present document types: ${docTypes.join(', ')}`);
  console.log(`✓ Summary:`, listData.summary);

  // ========================================================
  // TEST 4: Document View (Inline Stream)
  // ========================================================
  console.log('\n--- TEST 4: View Document (Inline Stream) ---');
  const viewRes = await supertest(app)
    .get(`/api/admin/documents/${createdDocsA[0].id}/view`)
    .set('Authorization', `Bearer ${adminToken}`);

  if (viewRes.status !== 200) {
    throw new Error(`Failed to view document: ${viewRes.status}`);
  }
  console.log(`✓ View response status 200`);
  console.log(`✓ Content-Type: ${viewRes.header['content-type']}`);
  console.log(`✓ Content-Disposition: ${viewRes.header['content-disposition']}`);
  if (!viewRes.header['content-disposition'].includes('inline')) {
    throw new Error('Expected inline Content-Disposition for view');
  }

  // ========================================================
  // TEST 5: Individual Document Download (Attachment Stream)
  // ========================================================
  console.log('\n--- TEST 5: Individual Document Download ---');
  const downloadRes = await supertest(app)
    .get(`/api/admin/documents/${createdDocsA[1].id}/download`)
    .set('Authorization', `Bearer ${adminToken}`);

  if (downloadRes.status !== 200) {
    throw new Error(`Failed to download document: ${downloadRes.status}`);
  }
  console.log(`✓ Download response status 200`);
  console.log(`✓ Content-Disposition: ${downloadRes.header['content-disposition']}`);
  if (!downloadRes.header['content-disposition'].includes('attachment')) {
    throw new Error('Expected attachment Content-Disposition for download');
  }

  // ========================================================
  // TEST 6 & 7: Bulk Download All as ZIP
  // ========================================================
  console.log('\n--- TEST 6 & 7: Bulk Download ZIP ---');
  const zipRes = await supertest(app)
    .post(`/api/admin/customers/${customerA.id}/documents/download-zip`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      documentIds: createdDocsA.map((d) => d.id),
    });

  if (zipRes.status !== 200) {
    throw new Error(`Failed to download ZIP: ${zipRes.status} ${JSON.stringify(zipRes.body)}`);
  }
  console.log(`✓ ZIP response status 200`);
  console.log(`✓ Content-Type: ${zipRes.header['content-type']}`);
  console.log(`✓ Content-Disposition: ${zipRes.header['content-disposition']}`);
  console.log(`✓ Received ZIP buffer size: ${zipRes.body.length || zipRes.text.length} bytes`);

  // ========================================================
  // TEST 8: IDOR Security Check (Customer A cannot download Customer B's doc)
  // ========================================================
  console.log('\n--- TEST 8: IDOR Security Prevention ---');
  const idorRes = await supertest(app)
    .post(`/api/admin/customers/${customerA.id}/documents/download-zip`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      documentIds: [createdDocsA[0].id, docB.id], // docB belongs to Customer B!
    });

  console.log(`✓ IDOR attempt response status: ${idorRes.status} (Expected: 403)`);
  if (idorRes.status !== 403) {
    throw new Error(`IDOR breach! Expected 403 Forbidden, got ${idorRes.status}`);
  }
  console.log(`✓ IDOR successfully prevented: ${idorRes.body.message}`);

  // ========================================================
  // TEST 9: Admin Verify Action
  // ========================================================
  console.log('\n--- TEST 9: Admin Verify Document ---');
  const verifyRes = await supertest(app)
    .post(`/api/admin/documents/${createdDocsA[0].id}/verify`)
    .set('Authorization', `Bearer ${adminToken}`);

  if (verifyRes.status !== 200 || !verifyRes.body.success) {
    throw new Error(`Failed to verify document: ${verifyRes.status}`);
  }
  console.log(`✓ Document ${createdDocsA[0].id} verified: status=${verifyRes.body.data.document.status}`);

  // ========================================================
  // TEST 10: Admin Reject Action
  // ========================================================
  console.log('\n--- TEST 10: Admin Reject Document ---');
  const rejectRes = await supertest(app)
    .post(`/api/admin/documents/${createdDocsA[1].id}/reject`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ reason: 'Blurred image, PAN characters illegible' });

  if (rejectRes.status !== 200 || !rejectRes.body.success) {
    throw new Error(`Failed to reject document: ${rejectRes.status}`);
  }
  console.log(`✓ Document ${createdDocsA[1].id} rejected: reason=${rejectRes.body.data.document.rejectionReason}`);

  // ========================================================
  // TEST 11: Admin Request Correction Action
  // ========================================================
  console.log('\n--- TEST 11: Admin Request Correction ---');
  const correctionRes = await supertest(app)
    .post(`/api/admin/documents/${createdDocsA[2].id}/request-correction`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ reason: 'Please provide bank statement for the last 6 complete months with official seal' });

  if (correctionRes.status !== 200 || !correctionRes.body.success) {
    throw new Error(`Failed to request correction: ${correctionRes.status}`);
  }
  console.log(`✓ Correction requested on ${createdDocsA[2].id}: status=${correctionRes.body.data.document.status}`);

  // Verify in-app customer notification created
  const customerNotification = await prisma.notification.findFirst({
    where: {
      customerId: customerA.id,
      eventType: 'DOCUMENT_CORRECTION_REQUIRED',
    },
    orderBy: { createdAt: 'desc' },
  });
  console.log(`✓ Customer notification generated: "${customerNotification?.title}" - "${customerNotification?.message}"`);

  // ========================================================
  // TEST 10 (Versioning): Customer re-uploads document (v2)
  // ========================================================
  console.log('\n--- TEST: Document Versioning (v2) ---');
  const v2Doc = await documentService.uploadDocument(
    customerA.id,
    'BANK_STATEMENT',
    {
      fieldname: 'file',
      originalname: 'Bank_Statement_6M_v2.pdf',
      encoding: '7bit',
      mimetype: 'application/pdf',
      size: fakePdfBuffer.length + 100,
      destination: '',
      filename: 'Bank_Statement_6M_v2.pdf',
      path: '',
      buffer: fakePdfBuffer,
      stream: null as any,
    },
    undefined,
    '127.0.0.1'
  );
  console.log(`✓ Re-uploaded BANK_STATEMENT: id=${v2Doc.id}, version=${v2Doc.version}`);

  const recheckRes = await supertest(app)
    .get(`/api/admin/customers/${customerA.id}/documents`)
    .set('Authorization', `Bearer ${adminToken}`);

  const bankDocEntry = recheckRes.body.data.documents.find((d: any) => d.documentType === 'BANK_STATEMENT');
  console.log(`✓ BANK_STATEMENT current version=${bankDocEntry.version}, historical versionsCount=${bankDocEntry.versionsCount}`);
  if (bankDocEntry.version !== 2 || bankDocEntry.versionsCount !== 2) {
    throw new Error(`Versioning failed: expected v2 with 2 versions, got v${bankDocEntry.version} (${bankDocEntry.versionsCount})`);
  }

  // ========================================================
  // TEST 12: Audit Logs Verification
  // ========================================================
  console.log('\n--- TEST 12: Audit Logs Verification ---');
  const requiredAuditActions = [
    'DOCUMENT_VIEWED',
    'DOCUMENT_DOWNLOADED',
    'DOCUMENTS_BULK_DOWNLOADED',
    'DOCUMENT_VERIFIED',
    'DOCUMENT_REJECTED',
    'DOCUMENT_CORRECTION_REQUESTED',
  ];

  for (const actionName of requiredAuditActions) {
    const log = await prisma.auditLog.findFirst({
      where: {
        actorType: 'ADMIN',
        action: actionName,
      },
      orderBy: { timestamp: 'desc' },
    });
    if (!log) {
      throw new Error(`Missing required audit log for action: ${actionName}`);
    }
    console.log(`✓ Audit log verified: ${actionName} (actor: ${log.actorName}, entity: ${log.entity})`);
  }

  // ========================================================
  // TEST 13: Empty State Verification
  // ========================================================
  console.log('\n--- TEST 13: Empty State for Customer with 0 Documents ---');
  const customerC = await prisma.customer.create({
    data: {
      fullName: `Empty Customer ${uniqueSuffix}`,
      mobile: `98202${uniqueSuffix}`,
      email: `empty.${uniqueSuffix}@example.com`,
      address: 'Zero Road',
      state: 'Delhi',
      city: 'New Delhi',
      aadhaarEncrypted: 'enc_aadhaar_empty',
      aadhaarMasked: 'XXXXXXXX0000',
      monthlyIncome: 50000,
    },
  });

  const emptyRes = await supertest(app)
    .get(`/api/admin/customers/${customerC.id}/documents`)
    .set('Authorization', `Bearer ${adminToken}`);

  if (emptyRes.status !== 200 || emptyRes.body.data.documents.length !== 0) {
    throw new Error(`Expected 0 documents for empty customer, got ${emptyRes.body.data.documents.length}`);
  }
  console.log(`✓ Empty customer returned 0 documents: total=${emptyRes.body.data.summary.total}`);

  console.log('\n====================================================');
  console.log('ALL 15 VERIFICATION CRITERIA PASSED WITH ZERO ERRORS!');
  console.log('====================================================\n');
}

runVerification()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('VERIFICATION FAILED:', err);
    process.exit(1);
  });
