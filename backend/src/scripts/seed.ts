import dns from 'node:dns';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDatabase } from '../config/database';
import Club from '../models/Club';
import Event from '../models/Event';
import User from '../models/User';

dns.setServers(['8.8.8.8', '1.1.1.1']);
dotenv.config();

async function seedDatabase(): Promise<void> {
  try {
    await connectDatabase();

    // 1. Find the default admin organizer
    const admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      console.log('No admin user found. Please run npm run create-admin first!');
      return;
    }
    console.log(`Using admin organizer: ${admin.name} (${admin._id})`);

    // 2. Clear existing Events & Clubs (optional, but let's check if collections are empty first)
    const clubCount = await Club.countDocuments();
    const eventCount = await Event.countDocuments();

    if (clubCount > 0 || eventCount > 0) {
      console.log('Database already has clubs/events. Skipping seed to prevent duplicate records.');
      return;
    }

    console.log('Seeding default clubs...');

    const seededClubs: any = await Club.create([
      {
        name: 'Programming Club (KITS)',
        category: 'Technical',
        description: 'The official programming and algorithms club. We host weekly coding contests, hackathons, and lectures on data structures, web development, and artificial intelligence.',
        logo: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=200&auto=format&fit=crop',
        contactEmail: 'programming.club@kitsw.ac.in',
        contactPhone: '9876543210',
        establishedYear: 2018,
        membersCount: 154,
      },
      {
        name: 'Music & Symphony Club',
        category: 'Cultural',
        description: 'For all music enthusiasts, instrumentalists, and singers at KITS Warangal. We practice weekly and host campus concerts, open mics, and cultural fest music events.',
        logo: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?q=80&w=200&auto=format&fit=crop',
        contactEmail: 'symphony.club@kitsw.ac.in',
        contactPhone: '8765432109',
        establishedYear: 2019,
        membersCount: 86,
      },
      {
        name: 'KITS Athletic Society',
        category: 'Sports',
        description: 'Promoting sports, athletic training, cricket leagues, and football tournaments. Join us for daily fitness training and inter-college sports representations.',
        logo: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?q=80&w=200&auto=format&fit=crop',
        contactEmail: 'sports.club@kitsw.ac.in',
        contactPhone: '7654321098',
        establishedYear: 2015,
        membersCount: 120,
      },
    ] as any);

    console.log(`Successfully seeded ${seededClubs.length} clubs.`);

    console.log('Seeding default events...');

    // Schedule dates relative to current time
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    const nextMonth = new Date(today);
    nextMonth.setMonth(today.getMonth() + 1);

    const seededEvents: any = await Event.create([
      {
        title: 'KITS HackFest 2026',
        description: 'A 24-hour developer hackathon focusing on solving campus and municipal problems. Prizes worth 50,000 INR. Free food and certificates provided to all participants.',
        category: 'Technical',
        date: nextWeek,
        startTime: '10:00 AM',
        endTime: '10:00 AM (Next Day)',
        venue: 'CSE Seminar Hall & Labs',
        capacity: 100,
        registrationsCount: 42,
        latitude: 18.0125,
        longitude: 79.5601,
        organizer: admin._id,
        club: seededClubs[0]._id, // Programming Club
        status: 'upcoming',
      },
      {
        title: 'Melody Night Open Mic',
        description: 'Unleash your vocal talents or play your favorite instruments. Auditions are not required; register and perform live on stage.',
        category: 'Cultural',
        date: tomorrow,
        startTime: '05:30 PM',
        endTime: '08:30 PM',
        venue: 'Open Air Theatre (OAT)',
        capacity: 250,
        registrationsCount: 180,
        latitude: 18.0132,
        longitude: 79.5609,
        organizer: admin._id,
        club: seededClubs[1]._id, // Music Club
        status: 'upcoming',
      },
      {
        title: 'Inter-Department Cricket Cup',
        description: 'The annual T20 cricket tournament between departments at KITS Warangal. Come support your branch teams in the championship finals.',
        category: 'Sports',
        date: nextMonth,
        startTime: '09:00 AM',
        endTime: '04:00 PM',
        venue: 'Main Sports Ground',
        capacity: 500,
        registrationsCount: 0,
        latitude: 18.0112,
        longitude: 79.5592,
        organizer: admin._id,
        club: seededClubs[2]._id, // Sports Club
        status: 'upcoming',
      },
    ] as any);

    console.log(`Successfully seeded ${seededEvents.length} events.`);
    console.log('Seeding completed successfully!');
  } catch (error) {
    console.error('Failed to seed database:', error);
  } finally {
    await mongoose.connection.close();
  }
}

seedDatabase();
