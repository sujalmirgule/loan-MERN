import { prisma } from '../src/services/db';

async function restore() {
  const cust = await prisma.customer.findFirst({ where: { mobile: '6589423115' } });
  if (!cust) {
    console.error('Customer 6589423115 not found');
    return;
  }

  // Check if loan already exists
  let loan = await prisma.loanApplication.findFirst({ where: { customerId: cust.id } });
  if (!loan) {
    loan = await prisma.loanApplication.create({
      data: {
        applicationNumber: 'LA-2026-000006',
        customerId: cust.id,
        requestedAmount: 200000,
        approvedAmount: 150000,
        proposedAmount: 150000,
        acceptedAmount: 150000,
        tenureMonths: 24,
        estimatedEmi: 6950,
        purpose: 'Business growth',
        status: 'APPROVED',
        submittedAt: new Date(),
      },
    });
  }

  let charge = await prisma.charge.findFirst({ where: { customerId: cust.id } });
  if (!charge) {
    charge = await prisma.charge.create({
      data: {
        name: 'KYC Verification Charge',
        amount: 799,
        type: 'FIXED',
        isMandatory: true,
        isActive: true,
        status: 'PAID',
        customerId: cust.id,
        loanId: loan.id,
        transactionRef: '987654321098',
        paidAt: new Date(),
        sentAt: new Date(),
      },
    });
  }

  let payment = await prisma.payment.findFirst({ where: { customerId: cust.id } });
  if (!payment) {
    payment = await prisma.payment.create({
      data: {
        customerId: cust.id,
        loanId: loan.id,
        chargeId: charge.id,
        amount: 799,
        paymentMethod: 'UPI',
        paymentType: 'KYC_VERIFICATION',
        transactionRef: '987654321098',
        receiptNumber: 'RCP-2026-000006',
        status: 'PAID',
        verifiedAt: new Date(),
        paymentDate: new Date(),
      },
    });
  }

  let invoice = await prisma.invoice.findFirst({ where: { customerId: cust.id } });
  if (!invoice) {
    invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: 'INV-2026-ACCFF6',
        customerId: cust.id,
        loanId: loan.id,
        chargeId: charge.id,
        chargeName: 'KYC Verification Charge',
        amount: 799,
        taxAmount: 143.82,
        totalAmount: 942.82,
        currency: 'INR',
        status: 'PAID',
        storageKey: `invoices/${cust.id}/kyc.pdf`,
        filePath: '',
        fileUrl: `/api/customer/charges/${charge.id}/invoice`,
        issuedAt: new Date(),
      },
    });
  }

  // Ensure customer has KYC approved
  await prisma.customer.update({
    where: { id: cust.id },
    data: { kycStatus: 'APPROVED' },
  });

  console.log('Golden customer 6589423115 restored with loan, charge, payment, and invoice!');
}

restore()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
