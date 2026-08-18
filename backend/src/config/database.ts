import mongoose from 'mongoose';

export async function connectDatabase(): Promise<void> {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error('MONGODB_URI is not configured.');
  }

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      heartbeatFrequencyMS: 10000,
      retryWrites: true,
      retryReads: true,
      maxPoolSize: 10,
      minPoolSize: 1,
    });

    console.log('MongoDB connected successfully.');

    mongoose.connection.on('error', (error) => {
      console.error('MongoDB connection error:', error);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected. Mongoose will attempt to reconnect.');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected successfully.');
    });
  } catch (error) {
    console.error('MongoDB connection failed:', error);
    throw error;
  }
}