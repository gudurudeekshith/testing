import { Response } from 'express';
import mongoose from 'mongoose';
import Event from '../models/Event';
import EventRegistration from '../models/EventRegistration';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { createNotification } from '../services/notificationService';

// Utility to check valid Mongoose ObjectId
const isValidId = (id: string) => mongoose.Types.ObjectId.isValid(id);

export async function registerForEvent(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { eventId } = req.params as any;
    if (!isValidId(eventId)) {
      res.status(400).json({ success: false, message: 'Invalid event ID' });
      return;
    }

    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    // Only students can register for events (admin authorization check)
    if (req.user?.role === 'admin') {
      res.status(403).json({ success: false, message: 'Admins cannot register for events' });
      return;
    }

    const event = await Event.findById(eventId);
    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found' });
      return;
    }

    if (event.status === 'cancelled') {
      res.status(400).json({ success: false, message: 'Cannot register for a cancelled event' });
      return;
    }
    if (event.status === 'completed') {
      res.status(400).json({ success: false, message: 'Cannot register for a completed event' });
      return;
    }

    const activeCount = await EventRegistration.countDocuments({
      event: event._id,
      status: 'registered',
    });

    if (event.capacity !== undefined && event.capacity !== null) {
      if (activeCount >= event.capacity) {
        res.status(409).json({ success: false, message: 'This event is full' });
        return;
      }
    }

    const existingReg = await EventRegistration.findOne({
      event: event._id,
      user: new mongoose.Types.ObjectId(userId),
    });

    if (existingReg) {
      if (existingReg.status === 'registered') {
        res.status(409).json({ success: false, message: 'You are already registered for this event' });
        return;
      }
      // Reactivate previous cancelled registration
      existingReg.status = 'registered';
      existingReg.registeredAt = new Date();
      await existingReg.save();
    } else {
      await EventRegistration.create({
        event: event._id,
        user: new mongoose.Types.ObjectId(userId),
        status: 'registered',
      });
    }

    event.registrationsCount = activeCount + 1;
    await event.save();

    // Trigger notification
    try {
      await createNotification({
        recipient: userId,
        type: 'registration_confirmation',
        title: 'Registration Confirmed',
        message: `You have successfully registered for the event: "${event.title}"`,
        relatedEvent: event._id,
      });
    } catch (nerr: any) {
      console.error('Registration notification failed:', nerr.message || nerr);
    }

    res.status(201).json({
      success: true,
      message: 'Registered for event successfully',
      data: {
        event: {
          id: event._id.toString(),
          title: event.title,
          registrationsCount: event.registrationsCount,
        },
      },
    });
  } catch (error) {
    console.error('registerForEvent error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function cancelRegistration(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { eventId } = req.params as any;
    if (!isValidId(eventId)) {
      res.status(400).json({ success: false, message: 'Invalid event ID' });
      return;
    }

    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const event = await Event.findById(eventId);
    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found' });
      return;
    }

    const reg = await EventRegistration.findOne({
      event: event._id,
      user: new mongoose.Types.ObjectId(userId),
      status: 'registered',
    });

    if (!reg) {
      res.status(404).json({ success: false, message: 'Registration not found' });
      return;
    }

    reg.status = 'cancelled';
    await reg.save();

    const activeCount = await EventRegistration.countDocuments({
      event: event._id,
      status: 'registered',
    });
    event.registrationsCount = activeCount;
    await event.save();

    res.status(200).json({ success: true, message: 'Registration cancelled successfully' });
  } catch (error) {
    console.error('cancelRegistration error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function getMyRegistrations(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const regs = await EventRegistration.find({
      user: new mongoose.Types.ObjectId(userId),
    })
      .populate({
        path: 'event',
        select: 'id title date startTime endTime venue category status organizer latitude longitude',
        populate: {
          path: 'organizer',
          select: 'name',
        },
      })
      .sort({ registeredAt: -1 })
      .lean();

    const mapped = regs
      .filter((r: any) => r.event !== null)
      .map((r: any) => ({
        id: r._id.toString(),
        status: r.status,
        registeredAt: r.registeredAt,
        event: {
          id: r.event._id.toString(),
          title: r.event.title,
          date: r.event.date,
          startTime: r.event.startTime,
          endTime: r.event.endTime,
          venue: r.event.venue,
          category: r.event.category,
          status: r.event.status,
          organizer: r.event.organizer?._id?.toString() || null,
          organizerName: r.event.organizer?.name || 'Organizer',
          latitude: r.event.latitude,
          longitude: r.event.longitude,
        },
      }));

    res.status(200).json({ success: true, data: mapped });
  } catch (error) {
    console.error('getMyRegistrations error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}
