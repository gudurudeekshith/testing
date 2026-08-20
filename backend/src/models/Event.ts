import mongoose, { Document, Schema } from 'mongoose';

export interface IEvent extends Document {
  title: string;
  description: string;
  category: string;
  date: Date;
  startTime: string;
  endTime: string;
  venue: string;
  organizer: mongoose.Types.ObjectId; // References User
  club?: mongoose.Types.ObjectId; // References Club
  image?: string;
  latitude?: number;
  longitude?: number;
  capacity?: number;
  registrationsCount: number;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  createdBy?: mongoose.Types.ObjectId; // References User
  createdAt: Date;
  updatedAt: Date;
}

const eventSchema = new Schema<IEvent>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    startTime: {
      type: String,
      required: true,
    },
    endTime: {
      type: String,
      required: true,
    },
    venue: {
      type: String,
      required: true,
      trim: true,
    },
    organizer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    club: {
      type: Schema.Types.ObjectId,
      ref: 'Club',
      default: null,
      index: true,
    },
    latitude: {
      type: Number,
      required: false,
    },
    longitude: {
      type: Number,
      required: false,
    },
    capacity: {
      type: Number,
      required: false,
    },
    registrationsCount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['upcoming', 'ongoing', 'completed', 'cancelled'],
      default: 'upcoming',
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    image: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for filtering/searching
eventSchema.index({ date: 1, category: 1, status: 1, club: 1 });

// Basic validation for lat/lng
eventSchema.path('latitude').validate(function (v: number | null) {
  if (v == null) return true;
  return v >= -90 && v <= 90;
}, 'Latitude must be between -90 and 90');

eventSchema.path('longitude').validate(function (v: number | null) {
  if (v == null) return true;
  return v >= -180 && v <= 180;
}, 'Longitude must be between -180 and 180');

const Event = mongoose.models.Event || mongoose.model<IEvent>('Event', eventSchema);
export default Event as mongoose.Model<IEvent>;
