import mongoose from 'mongoose';
import { logger } from '../utils/logger';

export async function connectDB(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not set in environment');

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    logger.info('✅ MongoDB connected');
  } catch (err) {
    logger.error('❌ MongoDB connection failed:', err);
    throw err;
  }

  mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));
  mongoose.connection.on('reconnected', () => logger.info('MongoDB reconnected'));
}
