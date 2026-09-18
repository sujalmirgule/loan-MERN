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


if (process.env.NODE_ENV !== 'production') {
  global.prismaClientInstance = prisma;
}

// Enable SQLite WAL mode and foreign key enforcement
export async function initializeDatabase() {
  try {
    await prisma.$queryRawUnsafe('PRAGMA journal_mode = WAL;');
    await prisma.$queryRawUnsafe('PRAGMA synchronous = NORMAL;');
    await prisma.$queryRawUnsafe('PRAGMA foreign_keys = ON;');
    logger.info('✅ SQLite initialized with WAL mode and foreign keys enabled');
  } catch (error) {
    logger.error('Failed to configure SQLite pragmas', error);
  }
}
