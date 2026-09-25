import { prisma } from '../src/services/db';

async function executeAbsoluteDataCleanup() {
  console.log('=== PURGING ALL DEMO & TEST DATA FOR PRODUCTION ===');

  const mainAdminEmail = 'admin@loanapprove.com';

  // 1. Purge child records
  await prisma.invoice.deleteMany({});
  await prisma.charge.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.eMISchedule.deleteMany({});
  await prisma.disbursement.deleteMany({});
  await prisma.loanAgreement.deleteMany({});
  await prisma.documentRequest.deleteMany({});
  await prisma.loanDocument.deleteMany({});
  await prisma.loanApplication.deleteMany({});
  await prisma.supportTicket.deleteMany({});
  await prisma.notification.deleteMany({});

  // 2. Purge all test customers
  const deletedCust = await prisma.customer.deleteMany({});
  console.log(`Purged ${deletedCust.count} test customer records.`);

  // 3. Purge all non-Main Admin accounts
  const deletedAdmins = await prisma.adminUser.deleteMany({
    where: { email: { not: mainAdminEmail } }
  });
  console.log(`Purged ${deletedAdmins.count} test admin accounts.`);

  // 4. Verify exact 1 Main Admin remains
  const remainingAdmins = await prisma.adminUser.findMany({ select: { id: true, email: true, fullName: true, role: true } });
  console.log('Remaining Admins (MUST BE 1):', JSON.stringify(remainingAdmins, null, 2));

  // 5. Restore production branding
  const originalBrandingData = {
    companyName: "Loan Approve Financial Services",
    appName: "Loan Approve",
    logoUrl: null,
    faviconUrl: null,
    primaryColor: "#047857",
    secondaryColor: "#0f172a",
    email: "support@craftmudra.in",
    phone: "+91 8942014797",
    address: "5th Floor, Kumbhat Complex, No. 29, Rattan Bazaar, Chennai, Tamil Nadu 600003",
    website: "https://craftmudra.in",
    termsUrl: "https://loanapprove.com/terms",
    privacyUrl: "https://loanapprove.com/privacy",
    companyLegalName: "Loan Approve Financial Services Pvt. Ltd.",
    authorizedSignatoryName: "Authorized Underwriting Officer",
    authorizedSignatoryDesignation: "Credit & Sanction Division",
    authorizedSignatureUrl: null,
    companyStampUrl: null,
    approvalLetterHeaderUrl: null,
    secondaryLogoUrl: null,
    watermarkLogoUrl: null,
    documentWatermarkEnabled: true,
    invoiceWatermarkEnabled: true,
    watermarkOpacity: 0.1,
    watermarkSize: "MEDIUM",
    watermarkPosition: "CENTER"
  };

  await prisma.brandingSettings.update({
    where: { id: 'default' },
    data: originalBrandingData,
  });

  console.log('=== ABSOLUTE CLEANUP COMPLETED SUCCESSFULLY ===');
  await prisma.$disconnect();
}

executeAbsoluteDataCleanup().catch(err => {
  console.error(err);
  process.exit(1);
});
