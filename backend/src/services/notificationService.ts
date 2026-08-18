import mongoose from 'mongoose';
import Notification from '../models/Notification';
import EventRegistration from '../models/EventRegistration';
import ClubMembership from '../models/ClubMembership';
import Club from '../models/Club';

const VALID_TYPES = new Set([
  'new_event',
  'registration_confirmation',
  'event_reminder',
  'event_update',
  'event_cancellation',
  'club_announcement',
]);

interface CreateNotificationParams {
  recipient: mongoose.Types.ObjectId | string;
  type: string;
  title: string;
  message: string;
  relatedEvent?: mongoose.Types.ObjectId | string | null;
  relatedClub?: mongoose.Types.ObjectId | string | null;
}

export async function createNotification({
  recipient,
  type,
  title,
  message,
  relatedEvent = null,
  relatedClub = null,
}: CreateNotificationParams) {
  if (!recipient) throw new Error('Invalid recipient');
  if (!VALID_TYPES.has(type)) throw new Error('Invalid notification type');
  if (!title || !message) throw new Error('Missing title or message');

  const dupFilter: Record<string, any> = {
    recipient: new mongoose.Types.ObjectId(recipient.toString()),
    type,
  };

  if (relatedEvent) {
    dupFilter.relatedEvent = new mongoose.Types.ObjectId(relatedEvent.toString());
  }
  if (relatedClub) {
    dupFilter.relatedClub = new mongoose.Types.ObjectId(relatedClub.toString());
  }

  const exists = await Notification.findOne(dupFilter).lean();
  if (exists) return exists;

  const n = new Notification({
    recipient: new mongoose.Types.ObjectId(recipient.toString()),
    type,
    title,
    message,
    relatedEvent: relatedEvent ? new mongoose.Types.ObjectId(relatedEvent.toString()) : null,
    relatedClub: relatedClub ? new mongoose.Types.ObjectId(relatedClub.toString()) : null,
  });

  await n.save();
  return n.toObject();
}

export async function notifyEventRegistrants(
  eventId: mongoose.Types.ObjectId | string,
  { type, title, message, dedupe = true }: { type: string; title: string; message: string; dedupe?: boolean }
) {
  const created = [];
  const eventObjectId = new mongoose.Types.ObjectId(eventId.toString());

  const regs = await EventRegistration.find({
    event: eventObjectId,
    status: 'registered',
  })
    .select('user -_id')
    .lean();

  const userIds = regs.map((r) => r.user).filter(Boolean);

  for (const userId of userIds) {
    try {
      if (dedupe) {
        const exists = await Notification.findOne({
          recipient: userId,
          type,
          relatedEvent: eventObjectId,
        } as any).lean();
        if (exists) continue;
      }

      const n = await createNotification({
        recipient: userId,
        type,
        title,
        message,
        relatedEvent: eventObjectId,
      });
      created.push(n);
    } catch (err: any) {
      console.error(
        `notifyEventRegistrants error for user ${userId.toString()}:`,
        err.message || err
      );
    }
  }

  return created;
}

export async function notifyClubMembersOfNewEvent({
  clubId,
  eventId,
  eventTitle,
  organizerName,
}: {
  clubId: mongoose.Types.ObjectId | string;
  eventId: mongoose.Types.ObjectId | string;
  eventTitle: string;
  organizerName?: string;
}) {
  const created = [];
  const clubObjectId = new mongoose.Types.ObjectId(clubId.toString());
  const eventObjectId = new mongoose.Types.ObjectId(eventId.toString());

  const members = await ClubMembership.find({
    club: clubObjectId,
    status: 'active',
  })
    .select('user -_id')
    .lean();

  const userIds = members.map((m) => m.user).filter(Boolean);
  const hostName = organizerName || 'Club Admin';

  for (const userId of userIds) {
    try {
      const n = await createNotification({
        recipient: userId,
        type: 'new_event',
        title: 'New Event scheduled!',
        message: `${hostName} has scheduled a new event: "${eventTitle}"`,
        relatedEvent: eventObjectId,
        relatedClub: clubObjectId,
      });
      created.push(n);
    } catch (err: any) {
      console.error(
        `notifyClubMembersOfNewEvent error for user ${userId.toString()}:`,
        err.message || err
      );
    }
  }

  return created;
}
