import mongoose, { Document, Schema } from 'mongoose';

export interface IClub extends Document {
  name: string;
  description: string;
  category: string;
  logo?: string;
  clubHead?: mongoose.Types.ObjectId; // References User
  membersCount: number;
  capacity: number;
  contactEmail?: string;
  contactPhone?: string;
  establishedYear?: number;
  createdAt: Date;
  updatedAt: Date;
}

const clubSchema = new Schema<IClub>(
  {
    name: {
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
    logo: {
      type: String,
      required: false,
    },
    clubHead: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    membersCount: {
      type: Number,
      default: 0,
    },
    capacity: {
      type: Number,
      default: 100,
    },
    contactEmail: {
      type: String,
      lowercase: true,
      trim: true,
      required: false,
    },
    contactPhone: {
      type: String,
      trim: true,
      required: false,
    },
    establishedYear: {
      type: Number,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

clubSchema.index({ name: 'text', category: 1 });

const Club = mongoose.models.Club || mongoose.model<IClub>('Club', clubSchema);
export default Club as mongoose.Model<IClub>;
