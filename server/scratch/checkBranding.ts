import { prisma } from '../src/services/db';

async function main() {
  const branding = await prisma.brandingSettings.findUnique({ where: { id: 'default' } });
  console.log('=== ORIGINAL PRODUCTION BRANDING ===');
  console.log(JSON.stringify(branding, null, 2));
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
