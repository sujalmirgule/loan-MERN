import { prisma } from '../src/services/db';

async function inspectData() {
  const adminUsers = await prisma.adminUser.findMany({
    select: { id: true, email: true, role: true, isActive: true, fullName: true }
  });
  console.log('=== ADMIN USERS ===');
  console.log(JSON.stringify(adminUsers, null, 2));

  const customers = await prisma.customer.findMany({
    select: { id: true, fullName: true, mobile: true, email: true, isActive: true, createdAt: true }
  });
  console.log('\n=== CUSTOMERS ===');
  console.log(JSON.stringify(customers, null, 2));

  const loans = await prisma.loanApplication.findMany({
    select: { id: true, applicationNumber: true, status: true, customerId: true, approvedAmount: true, createdAt: true }
  });
  console.log('\n=== LOAN APPLICATIONS ===');
  console.log(JSON.stringify(loans, null, 2));

  const charges = await prisma.charge.findMany({
    select: { id: true, name: true, amount: true, status: true, loanId: true, customerId: true, createdAt: true }
  });
  console.log('\n=== CHARGES ===');
  console.log(JSON.stringify(charges, null, 2));

  await prisma.$disconnect();
}

inspectData().catch(err => {
  console.error(err);
  process.exit(1);
});
