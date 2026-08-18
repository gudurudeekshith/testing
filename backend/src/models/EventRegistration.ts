import mongoose, { Document, Schema } from 'mongoose';

export interface IEventRegistration extends Document {
  event: mongoose.Types.ObjectId; // References Event
  user: mongoose.Types.ObjectId; // References User
  status: 'registered' | 'cancelled' | 'attended';
  registeredAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const eventRegistrationSchema = new Schema<IEventRegistration>(
  {
    event: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['registered', 'cancelled', 'attended'],
      default: 'registered',
      required: true,
    },
    registeredAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate registrations per event+user
eventRegistrationSchema.index({ event: 1, user: 1 }, { unique: true });

const EventRegistration = mongoose.models.EventRegistration || mongoose.model<IEventRegistration>('EventRegistration', eventRegistrationSchema);
export default EventRegistration as mongoose.Model<IEventRegistration>;
