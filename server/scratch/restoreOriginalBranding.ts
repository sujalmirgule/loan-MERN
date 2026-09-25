import { prisma } from '../src/services/db';

async function restoreBranding() {
  console.log('=== RESTORING PRODUCTION BRANDING ===');

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

  const restored = await prisma.brandingSettings.update({
    where: { id: 'default' },
    data: originalBrandingData,
  });

  console.log('Restored Company Name:', restored.companyName);
  console.log('Restored Email:', restored.email);
  console.log('Restored Phone:', restored.phone);
  console.log('Restored Address:', restored.address);
  console.log('=== PRODUCTION BRANDING RESTORED SUCCESSFULLY ===');

  await prisma.$disconnect();
}

restoreBranding().catch(err => {
  console.error(err);
  process.exit(1);
});
