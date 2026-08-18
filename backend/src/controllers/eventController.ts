import { Response } from 'express';
import mongoose from 'mongoose';
import Event from '../models/Event';
import Club from '../models/Club';
import EventRegistration from '../models/EventRegistration';
import Notification from '../models/Notification';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { notifyEventRegistrants, notifyClubMembersOfNewEvent } from '../services/notificationService';

// Utility to check valid Mongoose ObjectId
const isValidId = (id: string) => mongoose.Types.ObjectId.isValid(id);

function getDateRange(keyword: string) {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);

  switch (keyword.toLowerCase()) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'this-week': {
      const day = start.getDay();
      const diffToMonday = (day + 6) % 7; // Monday as start
      start.setDate(start.getDate() - diffToMonday);
      start.setHours(0, 0, 0, 0);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      break;
    }
    case 'this-month':
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(start.getMonth() + 1);
      end.setDate(0);
      end.setHours(23, 59, 59, 999);
      break;
    default:
      return null;
  }

  return { start, end };
}

export async function getEvents(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { search, category, date, clubId } = req.query;
    const filter: Record<string, any> = { status: { $ne: 'cancelled' } };

    // Date filtering
    if (!date) {
      filter.date = { $gte: new Date() };
    } else if (date === 'past') {
      filter.date = { $lt: new Date() };
    } else if (date === 'upcoming') {
      filter.date = { $gte: new Date() };
    } else {
      const range = getDateRange(String(date));
      if (range) {
        filter.date = { $gte: range.start, $lte: range.end };
      }
    }

    if (search) {
      const q = String(search).trim();
      filter.$or = [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { venue: { $regex: q, $options: 'i' } },
      ];
    }

    if (category) {
      filter.category = { $regex: new RegExp('^' + String(category).trim() + '$', 'i') };
    }

    if (clubId) {
      if (!isValidId(String(clubId))) {
        res.status(400).json({ success: false, message: 'Invalid club ID' });
        return;
      }
      filter.club = new mongoose.Types.ObjectId(String(clubId));
    }

    const events = await Event.find(filter)
      .populate('club', 'name category')
      .populate('organizer', 'name')
      .sort({ date: 1, startTime: 1 })
      .lean();

    const mapped = events.map((r: any) => ({
      id: r._id.toString(),
      title: r.title,
      description: r.description,
      category: r.category,
      date: r.date,
      startTime: r.startTime,
      endTime: r.endTime,
      venue: r.venue,
      organizer: r.organizer?._id?.toString() || null,
      organizerName: r.organizer?.name || null,
      club: r.club ? { id: r.club._id.toString(), name: r.club.name, category: r.club.category } : null,
      latitude: r.latitude,
      longitude: r.longitude,
      capacity: r.capacity,
      registrationsCount: r.registrationsCount,
      status: r.status,
    }));

    res.status(200).json({ success: true, data: mapped });
  } catch (error) {
    console.error('getEvents error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function getEventById(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params as any;
    if (!isValidId(id)) {
      res.status(400).json({ success: false, message: 'Invalid event ID' });
      return;
    }

    const event: any = await Event.findById(id)
      .populate('club', 'name category')
      .populate('organizer', 'name')
      .lean();

    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found' });
      return;
    }

    const mapped = {
      id: event._id.toString(),
      title: event.title,
      description: event.description,
      category: event.category,
      date: event.date,
      startTime: event.startTime,
      endTime: event.endTime,
      venue: event.venue,
      organizer: event.organizer?._id?.toString() || null,
      organizerName: event.organizer?.name || null,
      club: event.club ? { id: event.club._id.toString(), name: event.club.name, category: event.club.category } : null,
      latitude: event.latitude,
      longitude: event.longitude,
      capacity: event.capacity,
      registrationsCount: event.registrationsCount,
      status: event.status,
    };

    res.status(200).json({ success: true, data: mapped });
  } catch (error) {
    console.error('getEventById error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function createEvent(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const {
      title,
      description,
      category,
      date,
      startTime,
      endTime,
      venue,
      club,
      latitude,
      longitude,
      capacity,
    } = req.body;

    if (!title || !description || !category || !date || !startTime || !venue) {
      res.status(400).json({ success: false, message: 'Missing required fields' });
      return;
    }

    if (capacity !== undefined && (typeof capacity !== 'number' || capacity < 0)) {
      res.status(400).json({ success: false, message: 'capacity must be a positive number' });
      return;
    }

    if (latitude !== undefined && (typeof latitude !== 'number' || latitude < -90 || latitude > 90)) {
      res.status(400).json({ success: false, message: 'Invalid latitude' });
      return;
    }
    if (longitude !== undefined && (typeof longitude !== 'number' || longitude < -180 || longitude > 180)) {
      res.status(400).json({ success: false, message: 'Invalid longitude' });
      return;
    }

    let clubObjectId: mongoose.Types.ObjectId | undefined = undefined;
    if (club) {
      if (!isValidId(club)) {
        res.status(400).json({ success: false, message: 'Invalid club ID' });
        return;
      }
      clubObjectId = new mongoose.Types.ObjectId(club);
      const clubExists = await Club.findById(clubObjectId);
      if (!clubExists) {
        res.status(404).json({ success: false, message: 'Club not found' });
        return;
      }

      // Check if user is the club head or Admin
      if (req.user?.role !== 'admin' && clubExists.clubHead?.toString() !== req.user?.id) {
        res.status(403).json({ success: false, message: 'Forbidden. You are not authorized to create events for this club.' });
        return;
      }
    }

    const organizerId = new mongoose.Types.ObjectId(req.user?.id);

    const newEvent = await Event.create({
      title: String(title).trim(),
      description: String(description).trim(),
      category: String(category).trim(),
      date: new Date(date),
      startTime,
      endTime: endTime || startTime,
      venue: String(venue).trim(),
      organizer: organizerId,
      club: clubObjectId,
      latitude: latitude !== undefined ? latitude : null,
      longitude: longitude !== undefined ? longitude : null,
      capacity: capacity !== undefined ? capacity : null,
      registrationsCount: 0,
      status: 'upcoming',
      createdBy: organizerId,
    }) as any;

    // Notify club members if event belongs to a club
    if (clubObjectId) {
      try {
        await notifyClubMembersOfNewEvent({
          clubId: clubObjectId,
          eventId: newEvent._id,
          eventTitle: newEvent.title,
          organizerName: req.user?.email || 'Organizer',
        });
      } catch (err) {
        console.error('createEvent notification dispatch error:', err);
      }
    }

    res.status(201).json({ success: true, message: 'Event created successfully', data: newEvent });
  } catch (error) {
    console.error('createEvent error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function updateEvent(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params as any;
    if (!isValidId(id)) {
      res.status(400).json({ success: false, message: 'Invalid event ID' });
      return;
    }

    const event = await Event.findById(id);
    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found' });
      return;
    }

    // Check authorization: organizer, host club head, or admin
    let isAuthorized = false;
    if (req.user?.role === 'admin') {
      isAuthorized = true;
    } else if (event.club) {
      const club = await Club.findById(event.club);
      if (club && club.clubHead?.toString() === req.user?.id) {
        isAuthorized = true;
      }
    } else if (event.organizer.toString() === req.user?.id) {
      isAuthorized = true;
    }

    if (!isAuthorized) {
      res.status(403).json({ success: false, message: 'Forbidden. You are not authorized to update this event.' });
      return;
    }

    const allowed = ['title', 'description', 'category', 'date', 'startTime', 'endTime', 'venue', 'club', 'latitude', 'longitude', 'capacity', 'status'];
    const updates: Record<string, any> = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    if (updates.capacity !== undefined && (typeof updates.capacity !== 'number' || updates.capacity < 0)) {
      res.status(400).json({ success: false, message: 'capacity must be a positive number' });
      return;
    }

    if (updates.latitude !== undefined && (typeof updates.latitude !== 'number' || updates.latitude < -90 || updates.latitude > 90)) {
      res.status(400).json({ success: false, message: 'Invalid latitude' });
      return;
    }
    if (updates.longitude !== undefined && (typeof updates.longitude !== 'number' || updates.longitude < -180 || updates.longitude > 180)) {
      res.status(400).json({ success: false, message: 'Invalid longitude' });
      return;
    }

    if (updates.club) {
      if (!isValidId(updates.club)) {
        res.status(400).json({ success: false, message: 'Invalid club ID' });
        return;
      }
      updates.club = new mongoose.Types.ObjectId(updates.club);
      const clubExists = await Club.findById(updates.club);
      if (!clubExists) {
        res.status(404).json({ success: false, message: 'Club not found' });
        return;
      }
    }

    if (updates.date) {
      updates.date = new Date(updates.date);
    }

    const updatedEvent = await Event.findByIdAndUpdate(id, updates, { new: true });
    if (!updatedEvent) {
      res.status(404).json({ success: false, message: 'Event not found' });
      return;
    }

    // Trigger notification if key details were updated
    const checkFields = ['title', 'description', 'date', 'startTime', 'endTime', 'venue', 'category'];
    const hasMeaningfulUpdate = checkFields.some((f) => updates[f] !== undefined);

    if (hasMeaningfulUpdate) {
      try {
        await notifyEventRegistrants(updatedEvent._id, {
          type: 'event_update',
          title: 'Event Details Updated',
          message: `The details for event "${updatedEvent.title}" have been updated. Please check the new schedule.`,
        });
      } catch (err) {
        console.error('updateEvent notification dispatch error:', err);
      }
    }

    res.status(200).json({ success: true, message: 'Event updated successfully', data: updatedEvent });
  } catch (error) {
    console.error('updateEvent error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function cancelEvent(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params as any;
    if (!isValidId(id)) {
      res.status(400).json({ success: false, message: 'Invalid event ID' });
      return;
    }

    const event = await Event.findById(id);
    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found' });
      return;
    }

    // Check authorization: organizer, host club head, or admin
    let isAuthorized = false;
    if (req.user?.role === 'admin') {
      isAuthorized = true;
    } else if (event.club) {
      const club = await Club.findById(event.club);
      if (club && club.clubHead?.toString() === req.user?.id) {
        isAuthorized = true;
      }
    } else if (event.organizer.toString() === req.user?.id) {
      isAuthorized = true;
    }

    if (!isAuthorized) {
      res.status(403).json({ success: false, message: 'Forbidden. You are not authorized to cancel this event.' });
      return;
    }

    if (event.status === 'cancelled') {
      res.status(400).json({ success: false, message: 'Event already cancelled' });
      return;
    }

    event.status = 'cancelled';
    await event.save();

    // Notify registrants about cancellation
    try {
      await notifyEventRegistrants(event._id, {
        type: 'event_cancellation',
        title: 'Event Cancelled',
        message: `The event "${event.title}" has been cancelled.`,
      });
    } catch (err) {
      console.error('cancelEvent notification dispatch error:', err);
    }

    res.status(200).json({ success: true, message: 'Event cancelled successfully' });
  } catch (error) {
    console.error('cancelEvent error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function deleteEvent(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params as any;
    if (!isValidId(id)) {
      res.status(400).json({ success: false, message: 'Invalid event ID' });
      return;
    }

    const event = await Event.findById(id);
    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found' });
      return;
    }

    // Check authorization: organizer, host club head, or admin
    let isAuthorized = false;
    if (req.user?.role === 'admin') {
      isAuthorized = true;
    } else if (event.club) {
      const club = await Club.findById(event.club);
      if (club && club.clubHead?.toString() === req.user?.id) {
        isAuthorized = true;
      }
    } else if (event.organizer.toString() === req.user?.id) {
      isAuthorized = true;
    }

    if (!isAuthorized) {
      res.status(403).json({ success: false, message: 'Forbidden. You are not authorized to delete this event.' });
      return;
    }

    // Clean up related notifications and registrations first
    await Notification.deleteMany({ relatedEvent: event._id });
    await EventRegistration.deleteMany({ event: event._id });
    await Event.findByIdAndDelete(id);

    res.status(200).json({ success: true, message: 'Event deleted successfully' });
  } catch (error) {
    console.error('deleteEvent error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function getEventRegistrations(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params as any;
    if (!isValidId(id)) {
      res.status(400).json({ success: false, message: 'Invalid event ID' });
      return;
    }

    const registrations = await EventRegistration.find({
      event: new mongoose.Types.ObjectId(id),
      status: 'registered',
    })
      .populate('user', 'name email rollNumber section')
      .sort({ registeredAt: 1 })
      .lean();

    const participants = registrations.map((r) => ({
      registrationId: r._id.toString(),
      userId: r.user ? (r.user as any)._id.toString() : null,
      name: r.user ? (r.user as any).name : 'Unknown User',
      email: r.user ? (r.user as any).email : null,
      rollNumber: r.user ? (r.user as any).rollNumber : null,
      section: r.user ? (r.user as any).section : null,
      registeredAt: r.registeredAt,
      status: r.status,
    }));

    res.status(200).json({ success: true, data: participants });
  } catch (error) {
    console.error('getEventRegistrations error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}
