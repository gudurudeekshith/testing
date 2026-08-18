import dns from 'node:dns';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

import User from '../models/User';
import { connectDatabase } from '../config/database';

dns.setServers(['8.8.8.8', '1.1.1.1']);

dotenv.config();

async function updateExistingUsers(): Promise<void> {
  try {
    await connectDatabase();

    const result = await User.updateMany(
      {
        role: { $exists: false },
      },
      {
        $set: {
          role: 'student',
        },
      },
    );

    console.log('');
    console.log('================================');
    console.log('Existing Users Updated');
    console.log('================================');
    console.log(`Matched: ${result.matchedCount}`);
    console.log(`Updated: ${result.modifiedCount}`);
    console.log('================================');
    console.log('');
  } catch (error) {
    console.error('Failed to update existing users:', error);
  } finally {
    await mongoose.connection.close();
  }
}

updateExistingUsers();