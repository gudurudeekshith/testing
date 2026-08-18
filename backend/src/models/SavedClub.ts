import mongoose, { Document, Schema } from 'mongoose';

export interface ISavedClub extends Document {
  user: mongoose.Types.ObjectId; // References User
  club: mongoose.Types.ObjectId; // References Club
  createdAt: Date;
}

const savedClubSchema = new Schema<ISavedClub>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    club: {
      type: Schema.Types.ObjectId,
      ref: 'Club',
      required: true,
      index: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

savedClubSchema.index({ user: 1, club: 1 }, { unique: true });

const SavedClub = mongoose.models.SavedClub || mongoose.model<ISavedClub>('SavedClub', savedClubSchema);
export default SavedClub as mongoose.Model<ISavedClub>;
