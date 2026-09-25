import { prisma } from '../src/services/db';

async function auditAllTables() {
  console.log('=== AUDITING ALL PRISMA TABLES ===');

  const models = [
    'adminUser',
    'customer',
    'loanApplication',
    'loanDocument',
    'documentRequest',
    'loanAgreement',
    'disbursement',
    'eMISchedule',
    'payment',
    'charge',
    'invoice',
    'supportTicket',
    'notification',
    'auditLog',
    'domain',
    'brandingSettings',
    'paymentGatewaySettings',
    'communicationSettings'
  ];

  for (const model of models) {
    if ((prisma as any)[model]) {
      const count = await (prisma as any)[model].count();
      console.log(`${model}: ${count}`);
    } else {
      console.log(`${model}: NOT FOUND ON PRISMA CLIENT`);
    }
  }

  await prisma.$disconnect();
}

auditAllTables().catch(err => {
  console.error(err);
  process.exit(1);
});
