import { Response } from 'express';
import mongoose from 'mongoose';
import Notification from '../models/Notification';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

// Utility to check valid Mongoose ObjectId
const isValidId = (id: string) => mongoose.Types.ObjectId.isValid(id);

export async function getMyNotifications(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const notifications = await Notification.find({
      recipient: new mongoose.Types.ObjectId(userId),
    })
      .populate('relatedEvent', 'title date')
      .populate('relatedClub', 'name')
      .sort({ createdAt: -1 })
      .lean();

    const mapped = notifications.map((r: any) => ({
      id: r._id.toString(),
      type: r.type,
      title: r.title,
      message: r.message,
      read: r.read,
      createdAt: r.createdAt,
      relatedEvent: r.relatedEvent ? { id: r.relatedEvent._id.toString(), title: r.relatedEvent.title, date: r.relatedEvent.date } : null,
      relatedClub: r.relatedClub ? { id: r.relatedClub._id.toString(), name: r.relatedClub.name } : null,
    }));

    res.status(200).json({ success: true, data: mapped });
  } catch (error) {
    console.error('getMyNotifications error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function getUnreadNotifications(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const notifications = await Notification.find({
      recipient: new mongoose.Types.ObjectId(userId),
      read: false,
    })
      .populate('relatedEvent', 'title date')
      .populate('relatedClub', 'name')
      .sort({ createdAt: -1 })
      .lean();

    const mapped = notifications.map((r: any) => ({
      id: r._id.toString(),
      type: r.type,
      title: r.title,
      message: r.message,
      read: r.read,
      createdAt: r.createdAt,
      relatedEvent: r.relatedEvent ? { id: r.relatedEvent._id.toString(), title: r.relatedEvent.title, date: r.relatedEvent.date } : null,
      relatedClub: r.relatedClub ? { id: r.relatedClub._id.toString(), name: r.relatedClub.name } : null,
    }));

    res.status(200).json({
      success: true,
      data: {
        notifications: mapped,
        unreadCount: mapped.length,
      },
    });
  } catch (error) {
    console.error('getUnreadNotifications error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function markNotificationAsRead(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params as any;
    if (!isValidId(id)) {
      res.status(400).json({ success: false, message: 'Invalid notification ID' });
      return;
    }

    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const notification = await Notification.findById(id);
    if (!notification) {
      res.status(404).json({ success: false, message: 'Notification not found' });
      return;
    }

    if (notification.recipient.toString() !== userId) {
      res.status(403).json({ success: false, message: 'Forbidden' });
      return;
    }

    notification.read = true;
    await notification.save();

    res.status(200).json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    console.error('markNotificationAsRead error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function markAllNotificationsAsRead(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    await Notification.updateMany(
      { recipient: new mongoose.Types.ObjectId(userId), read: false },
      { read: true }
    );

    res.status(200).json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    console.error('markAllNotificationsAsRead error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function deleteNotification(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params as any;
    if (!isValidId(id)) {
      res.status(400).json({ success: false, message: 'Invalid notification ID' });
      return;
    }

    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const notification = await Notification.findById(id);
    if (!notification) {
      res.status(404).json({ success: false, message: 'Notification not found' });
      return;
    }

    if (notification.recipient.toString() !== userId) {
      res.status(403).json({ success: false, message: 'Forbidden' });
      return;
    }

    await Notification.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('deleteNotification error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}
