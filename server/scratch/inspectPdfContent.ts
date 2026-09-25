import fs from 'fs';
import path from 'path';
// @ts-ignore
import pdfParse from 'pdf-parse';

async function inspectPdfText() {
  const approvalPdfPath = path.join(__dirname, 'Approval_Letter_TEST_BRAND.pdf');
  const invoicePdfPath = path.join(__dirname, 'Invoice_TEST_BRAND.pdf');

  const approvalBuf = fs.readFileSync(approvalPdfPath);
  const invoiceBuf = fs.readFileSync(invoicePdfPath);

  const approvalData = await pdfParse(approvalBuf);
  const invoiceData = await pdfParse(invoiceBuf);

  console.log('=== APPROVAL LETTER PDF TEXT CONTENT ===');
  console.log(approvalData.text.slice(0, 500));
  console.log('\nContains "TEST FINANCE SERVICES":', approvalData.text.includes('TEST FINANCE SERVICES'));
  console.log('Contains "test@finance-demo.com":', approvalData.text.includes('test@finance-demo.com'));
  console.log('Contains "9999999999":', approvalData.text.includes('9999999999'));

  console.log('\n=== INVOICE PDF TEXT CONTENT ===');
  console.log(invoiceData.text.slice(0, 500));
  console.log('\nContains "TEST FINANCE SERVICES":', invoiceData.text.includes('TEST FINANCE SERVICES'));
  console.log('Contains "test@finance-demo.com":', invoiceData.text.includes('test@finance-demo.com'));
  console.log('Contains "9999999999":', invoiceData.text.includes('9999999999'));
}

inspectPdfText().catch(err => {
  console.error(err);
  process.exit(1);
});
