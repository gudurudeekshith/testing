import dns from 'node:dns';
import dotenv from 'dotenv';

dotenv.config();

dns.setServers([
  '8.8.8.8',
  '1.1.1.1',
]);

import app from './app';
import { connectDatabase } from './config/database';

const PORT = Number(process.env.PORT || 5000);

async function startServer(): Promise<void> {
  try {
    console.log('Checking environment configuration...');

    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is missing from .env');
    }

    console.log('JWT_SECRET loaded successfully.');

    await connectDatabase();

    app.listen(PORT, '0.0.0.0', () => {
      console.log(
        `KitSphere backend running on port ${PORT}`,
      );

      console.log(
        `Backend available at http://0.0.0.0:${PORT}`,
      );

      console.log(
        'JWT configuration loaded successfully.',
      );
    });
  } catch (error) {
    console.error(
      'Failed to start KitSphere backend:',
      error,
    );

    process.exit(1);
  }
}

startServer();