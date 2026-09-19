import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Loan Approve database seeding...');

  // 1. Seed Initial Admin
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@loanapprove.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123456';
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(adminPassword, salt);

  const admin = await prisma.adminUser.upsert({
    where: { email: adminEmail },
    update: {},
    create: {

      email: adminEmail,
      passwordHash,
      fullName: 'Chief Operations Administrator',
      role: 'ADMIN',
      isActive: true,
    },
  });
  console.log(`✅ Admin user seeded: ${admin.email}`);

  // 2. Seed Default Branding Settings
  const branding = await prisma.brandingSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      companyName: 'Loan Approve Financial Services',
      appName: 'Loan Approve',
      primaryColor: '#047857',
      secondaryColor: '#0f172a',
      email: 'support@loanapprove.com',
      phone: '+91 98765 43210',
      address: 'Nariman Point, Financial District, Mumbai, Maharashtra 400021',
      website: 'https://loanapprove.com',
      termsUrl: 'https://loanapprove.com/terms',
      privacyUrl: 'https://loanapprove.com/privacy',
    },
  });
  console.log(`✅ Default branding settings seeded: ${branding.appName}`);

  // 3. Seed Default Email Settings
  await prisma.emailSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      smtpHost: 'smtp.loanapprove.com',
      smtpPort: 587,
      smtpUsername: 'notifications@loanapprove.com',
      smtpPasswordEnc: '',
      fromName: 'Loan Approve Financial Services',
      fromEmail: 'notifications@loanapprove.com',
      encryption: 'STARTTLS',
    },
  });
  console.log('✅ Default email settings seeded');

  // 4. Seed Default WhatsApp Settings
  await prisma.whatsAppSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      provider: 'META',
      phoneNumber: '+919876543210',
      phoneNumberId: '',
      businessAccountId: '',
      apiEndpoint: 'https://graph.facebook.com/v19.0',
      accessTokenEnc: '',
      enabled: false,
    },
  });
  console.log('✅ Default WhatsApp settings seeded');

  // 5. Seed Default Payment Config
  await prisma.paymentConfig.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      chargeAmount: 500,
      chargeType: 'PROCESSING_DEPOSIT',
      upiId: 'pay@loanapprove',
      accountNumber: '9876543210123',
      ifscCode: 'HDFC0001234',
      accountHolderName: 'Loan Approve Financial Services',
      instructions: 'Please transfer the processing fee using UPI or IMPS and enter the 12-digit UTR number below.',
    },
  });
  console.log('✅ Default payment config seeded');

  console.log('✨ Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
