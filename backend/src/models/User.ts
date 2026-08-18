import mongoose, { Document, Schema } from 'mongoose';

export type UserRole = 'student' | 'admin';

export interface IUser extends Document {
  name: string;
  section: string;
  email: string;
  rollNumber: string;
  phone: string;
  password: string;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  passwordResetTokenHash?: string;
  passwordResetExpires?: Date;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    section: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    rollNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
    },

    resetPasswordToken: {
      type: String,
      required: false,
      sparse: true,
    },

    resetPasswordExpires: {
      type: Date,
      required: false,
      sparse: true,
    },

    passwordResetTokenHash: {
      type: String,
      required: false,
      sparse: true,
      index: true,
    },

    passwordResetExpires: {
      type: Date,
      required: false,
      sparse: true,
      index: true,
    },

    role: {
      type: String,
      enum: ['student', 'admin'],
      default: 'student',
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

userSchema.index(
  { passwordResetTokenHash: 1, passwordResetExpires: 1 },
  { sparse: true },
);

const User = mongoose.model<IUser>('User', userSchema);

export default User;