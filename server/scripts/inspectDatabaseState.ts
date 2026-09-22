import { prisma } from '../src/services/db';

async function main() {
  const customers = await prisma.customer.findMany({
    include: {
      loans: {
        include: {
          documents: true,
          charges: true,
        },
      },
      documents: true,
      charges: true,
    },
  });

  console.log('=== CUSTOMERS IN DB ===');
  for (const c of customers) {
    console.log(`\nCustomer: ${c.fullName} (${c.mobile}) - ID: ${c.id}`);
    console.log(`  KYC Status: ${c.kycStatus}, Status: ${c.status}`);
    console.log(`  Documents (${c.documents.length}):`);
    for (const d of c.documents) {
      console.log(`    - ${d.documentType}: ${d.status} (loanId: ${d.loanId || 'null'}, version: ${d.version})`);
    }
    console.log(`  Loans (${c.loans.length}):`);
    for (const l of c.loans) {
      console.log(`    - Loan ${l.applicationNumber} [${l.status}]: ₹${l.requestedAmount} (loanId: ${l.id})`);
      console.log(`      Linked Docs (${l.documents.length}): ${l.documents.map(ld => ld.documentType).join(', ') || 'none'}`);
    }
    console.log(`  Charges (${c.charges.length}):`);
    for (const ch of c.charges) {
      console.log(`    - ${ch.name} [${ch.status}]: ₹${ch.amount} (sentAt: ${ch.sentAt ? ch.sentAt.toISOString() : 'null'})`);
    }
  }

  const allLoans = await prisma.loanApplication.findMany({
    include: {
      customer: true,
      documents: true,
    },
  });

  console.log(`\n=== ALL LOANS IN DB (${allLoans.length}) ===`);
  for (const l of allLoans) {
    console.log(`Loan ${l.applicationNumber} | Customer: ${l.customer?.fullName} (${l.customer?.mobile}) | Status: ${l.status} | Docs: ${l.documents.length}`);
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
