import mongoose, { Document, Schema } from 'mongoose';

export interface IClubMembership extends Document {
  club: mongoose.Types.ObjectId; // References Club
  user: mongoose.Types.ObjectId; // References User
  role: 'member' | 'clubAdmin';
  status: 'active' | 'inactive';
  joinedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const clubMembershipSchema = new Schema<IClubMembership>(
  {
    club: {
      type: Schema.Types.ObjectId,
      ref: 'Club',
      required: true,
      index: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['member', 'clubAdmin'],
      default: 'member',
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
      required: true,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate membership for the same user + club
clubMembershipSchema.index({ club: 1, user: 1 }, { unique: true });

const ClubMembership = mongoose.models.ClubMembership || mongoose.model<IClubMembership>('ClubMembership', clubMembershipSchema);
export default ClubMembership as mongoose.Model<IClubMembership>;
