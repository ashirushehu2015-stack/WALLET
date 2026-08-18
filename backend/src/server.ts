import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import { logger } from './config/logger';
import { prisma } from './config/db';

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await prisma.$connect();
    logger.info('✅ PostgreSQL Database connected successfully');

    app.listen(PORT, () => {
      logger.info(`🚀 Wallet Backend & Double-Entry Ledger Engine running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
