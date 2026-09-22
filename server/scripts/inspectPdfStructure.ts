import fs from 'fs';
import path from 'path';

function checkPdf(filePath: string) {
  const buf = fs.readFileSync(filePath);
  const str = buf.toString('latin1');
  
  // Count /Type /Page (excluding Pages)
  const pageMatches = str.match(/\/Type\s*\/Page[^s]/g) || [];
  console.log(`File: ${path.basename(filePath)}`);
  console.log(`Size: ${buf.length} bytes`);
  console.log(`Page count: ${pageMatches.length}`);

  // Check critical text content in PDF stream / objects
  const checks = [
    'APPLICANT DETAILS OVERVIEW',
    'YOUR APPLICATION DETAILS',
    'SANCTIONED LOAN AMOUNT',
    'EMI AND LOAN AMOUNT APPROVED',
    'APPROVED AMOUNT IN WORDS',
    'Loan Management Services',
    'PAGE 1 OF 2',
    'PRADHAN MANTRI MUDRA YOJNA',
    'DOCUMENT CHECKLIST & VERIFICATION GUIDELINES',
    'KINDLY SUBMIT / COMPLETE ALL REQUIRED DOCUMENTS',
    'PROCESSING FEE DEPOSIT (REFUNDABLE)',
    'Payment Mode',
    'Important Note',
    'PAGE 2 OF 2',
  ];

  console.log('--- Content Checks ---');
  for (const c of checks) {
    const present = str.includes(c);
    console.log(`  ${c}: ${present ? 'FOUND' : 'NOT FOUND'}`);
  }
}

const dir = path.join(__dirname, '../scratch');
checkPdf(path.join(dir, 'Approval_Letter_Customer_A.pdf'));
console.log('\n----------------------------------------\n');
checkPdf(path.join(dir, 'Approval_Letter_Customer_B.pdf'));
