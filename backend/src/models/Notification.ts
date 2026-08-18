import mongoose, { Document, Schema } from 'mongoose';

export interface INotification extends Document {
  recipient: mongoose.Types.ObjectId; // References User
  type: 'new_event' | 'registration_confirmation' | 'event_reminder' | 'event_update' | 'event_cancellation' | 'club_announcement';
  title: string;
  message: string;
  relatedEvent?: mongoose.Types.ObjectId; // References Event
  relatedClub?: mongoose.Types.ObjectId; // References Club
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    recipient: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        'new_event',
        'registration_confirmation',
        'event_reminder',
        'event_update',
        'event_cancellation',
        'club_announcement',
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    relatedEvent: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      default: null,
    },
    relatedClub: {
      type: Schema.Types.ObjectId,
      ref: 'Club',
      default: null,
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index to query unread notifications by recipient and sort by createdAt
notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });

const Notification = mongoose.models.Notification || mongoose.model<INotification>('Notification', notificationSchema);
export default Notification as mongoose.Model<INotification>;
