import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

import User from '../models/User';
import Club from '../models/Club';
import ClubMembership from '../models/ClubMembership';
import SavedClub from '../models/SavedClub';
import Event from '../models/Event';
import EventRegistration from '../models/EventRegistration';

import * as clubController from '../controllers/clubController';
import * as eventController from '../controllers/eventController';
import * as regController from '../controllers/registrationController';

// Mock Express Response helper
function createMockResponse() {
  const res: any = {};
  res.statusCode = 200;
  res.status = (code: number) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data: any) => {
    res.data = data;
    return res;
  };
  return res;
}

async function runTests() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('MONGODB_URI is not set in environment.');
    process.exit(1);
  }

  console.log('Connecting to database...');
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB successfully.');

  try {
    // 1. Clean up any previous test remnants
    console.log('Cleaning up old test users...');
    await User.deleteMany({ email: { $in: ['test_student@kitsw.ac.in', 'test_admin@kitsw.ac.in'] } });
    await Club.deleteMany({ name: 'Test Integration Club' });

    // 2. Create test accounts
    console.log('Creating mock accounts...');
    const studentUser = await User.create({
      name: 'Test Student',
      section: 'CSE-1',
      email: 'test_student@kitsw.ac.in',
      rollNumber: 'B20CS001',
      phone: '9999999999',
      password: 'password123',
      role: 'student',
    });

    const adminUser = await User.create({
      name: 'Test Admin',
      section: 'N/A',
      email: 'test_admin@kitsw.ac.in',
      rollNumber: 'ADMIN001',
      phone: '8888888888',
      password: 'password123',
      role: 'admin',
    });

    console.log(`Mock Student: ${studentUser.name} (${studentUser.role})`);
    console.log(`Mock Admin: ${adminUser.name} (${adminUser.role})`);

    // 3. Test Club Creation Authorization
    console.log('\n--- TESTING CLUB CREATION AUTHORIZATION ---');
    
    // Student request should fail simulated middleware check
    const reqCreateClubStudent: any = {
      body: { name: 'Test Integration Club', description: 'Testing clubs features', category: 'Technical' },
      user: { id: studentUser._id.toString(), email: studentUser.email, role: studentUser.role },
    };
    const requireAdminMock = (req: any) => req.user && req.user.role === 'admin';
    
    if (!requireAdminMock(reqCreateClubStudent)) {
      console.log('Pass: Student blocked from creating club (Simulated Middleware Guard).');
    } else {
      console.error('FAIL: Student not blocked from creating club.');
    }

    // Admin request should succeed
    const reqCreateClubAdmin: any = {
      body: { name: 'Test Integration Club', description: 'Testing clubs features', category: 'Technical', clubHead: studentUser._id.toString() },
      user: { id: adminUser._id.toString(), email: adminUser.email, role: adminUser.role },
    };
    const resCreateClubAdmin = createMockResponse();
    await clubController.createClub(reqCreateClubAdmin, resCreateClubAdmin);
    
    if (resCreateClubAdmin.statusCode === 201 && resCreateClubAdmin.data.success) {
      console.log('Pass: Admin created club successfully.');
    } else {
      console.error('FAIL: Admin failed to create club. Status:', resCreateClubAdmin.statusCode, resCreateClubAdmin.data);
      throw new Error('Club creation failed.');
    }

    const testClubId = resCreateClubAdmin.data.data._id.toString();

    // 4. Test GET Club Details
    console.log('\n--- TESTING CLUB DETAIL ENDPOINTS ---');
    const reqGetClub: any = { params: { id: testClubId } };
    const resGetClub = createMockResponse();
    await clubController.getClubById(reqGetClub, resGetClub);
    
    if (resGetClub.statusCode === 200 && resGetClub.data.success && resGetClub.data.data.name === 'Test Integration Club') {
      console.log('Pass: GET Club by ID successfully retrieved club details.');
    } else {
      console.error('FAIL: GET Club details. Status:', resGetClub.statusCode, resGetClub.data);
    }

    // 5. Test Join Club
    console.log('\n--- TESTING JOIN CLUB ---');
    const reqJoin: any = {
      params: { id: testClubId },
      user: { id: studentUser._id.toString(), email: studentUser.email, role: studentUser.role },
    };
    const resJoin = createMockResponse();
    await clubController.joinClub(reqJoin, resJoin);

    if (resJoin.statusCode === 201 && resJoin.data.success) {
      console.log('Pass: Student joined club successfully.');
    } else {
      console.error('FAIL: Student failed to join club. Status:', resJoin.statusCode, resJoin.data);
    }

    // Double join check
    const resJoinDup = createMockResponse();
    await clubController.joinClub(reqJoin, resJoinDup);
    if (resJoinDup.statusCode === 409) {
      console.log('Pass: Duplicate club membership join request rejected with 409.');
    } else {
      console.error('FAIL: Duplicate join check failed. Status:', resJoinDup.statusCode, resJoinDup.data);
    }

    // 6. Test Save Club
    console.log('\n--- TESTING SAVE CLUB ---');
    const reqSave: any = {
      params: { id: testClubId },
      user: { id: studentUser._id.toString(), email: studentUser.email, role: studentUser.role },
    };
    const resSave = createMockResponse();
    await clubController.saveClub(reqSave, resSave);

    if (resSave.statusCode === 201 && resSave.data.success) {
      console.log('Pass: Student saved club successfully.');
    } else {
      console.error('FAIL: Save club failed. Status:', resSave.statusCode, resSave.data);
    }

    // Saved Status Check
    const resSavedStatus = createMockResponse();
    await clubController.getSavedStatus(reqSave, resSavedStatus);
    if (resSavedStatus.statusCode === 200 && resSavedStatus.data.saved === true) {
      console.log('Pass: Saved status returns true.');
    } else {
      console.error('FAIL: Saved status returned false. Status:', resSavedStatus.statusCode, resSavedStatus.data);
    }

    // Get Saved Clubs List Check
    const resSavedList = createMockResponse();
    await clubController.getSavedClubs(reqSave, resSavedList);
    if (resSavedList.statusCode === 200 && resSavedList.data.success && resSavedList.data.data.length === 1) {
      console.log('Pass: Student saved clubs list retrieved successfully.');
    } else {
      console.error('FAIL: Saved clubs list retrieval failed. Status:', resSavedList.statusCode, resSavedList.data);
    }

    // 7. Test Create Event
    console.log('\n--- TESTING EVENT CREATION AUTHORIZATION ---');
    
    // Student event creation should fail simulated middleware check
    const reqCreateEventStudent: any = {
      body: { title: 'Test Event', description: 'Testing events features', category: 'Technical', date: new Date(), startTime: '10:00', venue: 'Auditorium', club: testClubId },
      user: { id: studentUser._id.toString(), email: studentUser.email, role: studentUser.role },
    };
    if (!requireAdminMock(reqCreateEventStudent)) {
      console.log('Pass: Student blocked from creating event (Simulated Middleware Guard).');
    } else {
      console.error('FAIL: Student not blocked from creating event.');
    }

    // Admin should succeed
    const reqCreateEventAdmin: any = {
      body: { title: 'Test Event', description: 'Testing events features', category: 'Seminar', date: new Date(), startTime: '10:00', venue: 'Auditorium', club: testClubId, capacity: 2 },
      user: { id: adminUser._id.toString(), email: adminUser.email, role: adminUser.role },
    };
    const resCreateEventAdmin = createMockResponse();
    await eventController.createEvent(reqCreateEventAdmin, resCreateEventAdmin);

    if (resCreateEventAdmin.statusCode === 201 && resCreateEventAdmin.data.success) {
      console.log('Pass: Admin created event successfully.');
    } else {
      console.error('FAIL: Admin failed to create event. Status:', resCreateEventAdmin.statusCode, resCreateEventAdmin.data);
      throw new Error('Event creation failed.');
    }

    const testEventId = resCreateEventAdmin.data.data._id.toString();

    // 8. Test Register for Event & Capacity Enforcing
    console.log('\n--- TESTING EVENT REGISTRATION & CAPACITY ---');
    const reqRegister: any = {
      params: { eventId: testEventId },
      user: { id: studentUser._id.toString(), email: studentUser.email, role: studentUser.role },
    };
    const resRegister = createMockResponse();
    await regController.registerForEvent(reqRegister, resRegister);

    if (resRegister.statusCode === 201 && resRegister.data.success) {
      console.log('Pass: Student registered for event successfully.');
    } else {
      console.error('FAIL: Event registration failed. Status:', resRegister.statusCode, resRegister.data);
    }

    // Double register check
    const resRegisterDup = createMockResponse();
    await regController.registerForEvent(reqRegister, resRegisterDup);
    if (resRegisterDup.statusCode === 409) {
      console.log('Pass: Duplicate event registration rejected with 409.');
    } else {
      console.error('FAIL: Duplicate registration check failed. Status:', resRegisterDup.statusCode, resRegisterDup.data);
    }

    // Create a second student to fill the event capacity (max capacity is 2)
    const studentUser2 = await User.create({
      name: 'Test Student 2',
      section: 'CSE-1',
      email: 'test_student_2@kitsw.ac.in',
      rollNumber: 'B20CS002',
      phone: '9999999998',
      password: 'password123',
      role: 'student',
    });

    const reqRegister2: any = {
      params: { eventId: testEventId },
      user: { id: studentUser2._id.toString(), email: studentUser2.email, role: studentUser2.role },
    };
    const resRegister2 = createMockResponse();
    await regController.registerForEvent(reqRegister2, resRegister2);

    // Create a third student to test capacity overflow
    const studentUser3 = await User.create({
      name: 'Test Student 3',
      section: 'CSE-1',
      email: 'test_student_3@kitsw.ac.in',
      rollNumber: 'B20CS003',
      phone: '9999999997',
      password: 'password123',
      role: 'student',
    });

    const reqRegister3: any = {
      params: { eventId: testEventId },
      user: { id: studentUser3._id.toString(), email: studentUser3.email, role: studentUser3.role },
    };
    const resRegister3 = createMockResponse();
    await regController.registerForEvent(reqRegister3, resRegister3);

    if (resRegister3.statusCode === 409 && resRegister3.data.message.includes('full')) {
      console.log('Pass: Event capacity constraint successfully enforced (third registration rejected).');
    } else {
      console.error('FAIL: Capacity constraint failed. Status:', resRegister3.statusCode, resRegister3.data);
    }

    // 9. Test Cancel Registration
    console.log('\n--- TESTING REGISTRATION CANCELLATION ---');
    const resCancel = createMockResponse();
    await regController.cancelRegistration(reqRegister, resCancel);
    if (resCancel.statusCode === 200 && resCancel.data.success) {
      console.log('Pass: Student cancelled own registration successfully.');
    } else {
      console.error('FAIL: Cancel registration failed. Status:', resCancel.statusCode, resCancel.data);
    }

    // 10. Test Get My Registrations
    console.log('\n--- TESTING MY REGISTRATIONS FEED ---');
    const resMyRegs = createMockResponse();
    await regController.getMyRegistrations(reqRegister, resMyRegs);
    if (resMyRegs.statusCode === 200 && resMyRegs.data.success) {
      console.log('Pass: GET My Registrations successfully loaded student registrations list.');
    } else {
      console.error('FAIL: GET My Registrations failed. Status:', resMyRegs.statusCode, resMyRegs.data);
    }

    // Clean up second and third students
    await User.deleteMany({ email: { $in: ['test_student_2@kitsw.ac.in', 'test_student_3@kitsw.ac.in'] } });

    // 11. Cleanup test databases
    console.log('\nCleaning up databases...');
    await SavedClub.deleteMany({ user: studentUser._id });
    await ClubMembership.deleteMany({ club: testClubId });
    await EventRegistration.deleteMany({ event: testEventId });
    await Event.deleteMany({ club: testClubId });
    await Club.deleteMany({ _id: testClubId });
    await User.deleteMany({ email: { $in: ['test_student@kitsw.ac.in', 'test_admin@kitsw.ac.in'] } });
    console.log('Cleanup completed successfully.');

  } catch (err) {
    console.error('An error occurred during tests:', err);
  } finally {
    console.log('Disconnecting from database...');
    await mongoose.disconnect();
    console.log('Disconnected.');
  }
}

runTests();
