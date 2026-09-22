import fs from 'fs';
import path from 'path';
import { pdfService } from '../src/services/pdfService';

async function testGenerate() {
  console.log('Generating Approval Letter for Customer A (Ajay Kumar, Rs. 100,000)...');
  const pdfBufferA = await pdfService.generateApprovalLetterPdf({
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

  const outDir = path.join(__dirname, '../scratch');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const outPathA = path.join(outDir, 'Approval_Letter_Customer_A.pdf');
  fs.writeFileSync(outPathA, pdfBufferA);
  console.log(`[PASS] Customer A PDF generated at: ${outPathA} (${pdfBufferA.length} bytes)`);

  console.log('Generating Approval Letter for Customer B (Rajesh Sharma, Rs. 346,545)...');
  const pdfBufferB = await pdfService.generateApprovalLetterPdf({
    customerName: 'Rajesh Sharma',
    customerPhone: '9876543210',
    customerEmail: 'rajesh.sharma@example.com',
    customerAddress: 'B-402, Lotus Towers, Andheri East, Mumbai, Maharashtra 400069',
    applicationNumber: 'LN20260922894120',
    loanAccountNumber: 'LN20260922894120',
    approvalNumber: 'LN20260922894120',
    loanType: 'MUDRA LOAN',
    approvedAmount: 346545,
    interestRate: 3.5,
    tenureMonths: 24,
    monthlyEmi: 14972.50,
    processingFee: 9450,
    approvalDate: '2026-09-22',
    panMasked: 'ABCPS1234F',
    aadhaarMasked: 'XXXX-XXXX-9876',
    accountHolderName: 'Rajesh Sharma',
    accountNumberMasked: 'XXXXXX1234',
    bankIfsc: 'HDFC0001234',
    bankName: 'HDFC Bank',
    kycVerificationId: 'MUDFNC/512/819/332',
    companyName: 'MUDRA LOAN',
    companyLegalName: 'Pradhan Mantri Mudra Yojna',
    companyAddress: '3rd Floor, Office No. 218, 219 & 222 Gokhale Plaza, Chinchwadakurdi Link Road, Pune, Maharashtra',
    companyEmail: 'info@dmmdmudra.co.in',
    companyPhone: '8942014797',
  });

  const outPathB = path.join(outDir, 'Approval_Letter_Customer_B.pdf');
  fs.writeFileSync(outPathB, pdfBufferB);
  console.log(`[PASS] Customer B PDF generated at: ${outPathB} (${pdfBufferB.length} bytes)`);
}

testGenerate().catch(console.error);
