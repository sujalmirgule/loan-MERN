import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

// Let's test with pdfjs or direct parsing
async function testPageCount() {
  const { pdfService } = await import('../src/services/pdfService');
  const buffer = await pdfService.generateApprovalLetterPdf({
    customerName: 'Ajay Kumar',
    customerPhone: '8274843108',
    customerEmail: 'ajay.kumar@example.com',
    customerAddress: '3rd Floor, Office No. 218, 219 & 222 Gokhale Plaza, Chinchwadakurdi Link Road, Pune, Maharashtra',
    applicationNumber: 'LN20260906142729',
    loanAccountNumber: 'LN20260906142729',
    approvalNumber: 'LN20260906142729',
    loanType: 'MUDRA LOAN',
    approvedAmount: 100000,
    interestRate: 2.0,
    tenureMonths: 12,
    monthlyEmi: 8500,
    processingFee: 7899,
    approvalDate: '2026-09-09',
    panMasked: 'BANPN9796M',
    aadhaarMasked: 'XXXX-XXXX-3108',
    accountHolderName: 'Ajay',
    accountNumberMasked: 'XXXXXX6776',
    bankIfsc: 'SBIN0004235',
    bankName: 'Sbi',
    kycVerificationId: 'MUDFNC/437/907/687',
    companyName: 'MUDRA LOAN',
    companyLegalName: 'Pradhan Mantri Mudra Yojna',
    companyAddress: '3rd Floor, Office No. 218, 219 & 222 Gokhale Plaza, Chinchwadakurdi Link Road, Pune, Maharashtra',
    companyEmail: 'info@dmmdmudra.co.in',
    companyPhone: '8942014797',
  });

  // In PDF structure, /Count N under /Pages defines total pages
  const str = buffer.toString('latin1');
  const countMatch = str.match(/\/Type\s*\/Pages[^>]*\/Count\s+(\d+)/);
  console.log(`Pages /Count: ${countMatch ? countMatch[1] : 'unknown'}`);

  // Also count /Type /Page\b
  const pageMatches = str.match(/\/Type\s*\/Page\b/g) || [];
  console.log(`Page objects count (/Type /Page): ${pageMatches.length}`);
}

testPageCount().catch(console.error);
