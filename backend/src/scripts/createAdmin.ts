import dns from 'node:dns';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

import User from '../models/User';
import { connectDatabase } from '../config/database';

dns.setServers(['8.8.8.8', '1.1.1.1']);

dotenv.config();

async function createAdmin(): Promise<void> {
  try {
    await connectDatabase();

    const email = 'admin@kitsw.ac.in';
    const password = 'Admin@12345';

    const existingAdmin = await User.findOne({
      email,
    });

    if (existingAdmin) {
      console.log('Admin account already exists.');
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const admin = await User.create({
      name: 'KitSphere Admin',
      section: 'ADMIN',
      email,
      rollNumber: 'ADMIN001',
      phone: '0000000000',
      password: hashedPassword,
      role: 'admin',
    });

    console.log('');
    console.log('================================');
    console.log('KitSphere Admin Created');
    console.log('================================');
    console.log(`Email: ${admin.email}`);
    console.log(`Password: ${password}`);
    console.log(`Role: ${admin.role}`);
    console.log('================================');
    console.log('');
  } catch (error) {
    console.error('Failed to create admin:', error);
  } finally {
    await mongoose.connection.close();
  }
}

createAdmin();