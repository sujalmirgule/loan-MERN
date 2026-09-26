import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

declare global {
  var prismaClientInstance: PrismaClient | undefined;
}

export const prisma =
  global.prismaClientInstance ||
  new PrismaClient({
    log: ['warn', 'error'],
  });


if (!global.prismaClientInstance) {
  global.prismaClientInstance = prisma;
}

// Initialize database connection and configure engine-specific settings
export async function initializeDatabase() {
  try {
    const dbUrl = process.env.DATABASE_URL || '';
    if (dbUrl.startsWith('file:') || dbUrl.includes('.db')) {
      await prisma.$queryRawUnsafe('PRAGMA journal_mode = WAL;');
      await prisma.$queryRawUnsafe('PRAGMA synchronous = NORMAL;');
      await prisma.$queryRawUnsafe('PRAGMA foreign_keys = ON;');
      logger.info('✅ SQLite initialized with WAL mode and foreign keys enabled');
    } else {
      await prisma.$queryRawUnsafe('SELECT 1;');
      logger.info('✅ MySQL production database connection initialized');
    }
  } catch (error) {
    logger.error('Failed to initialize database connection', error);
  }
}
