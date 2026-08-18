import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { OAuth2Client } from 'google-auth-library';
import User, { IUser } from '../models/User';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

const JWT_SECRET = process.env.JWT_SECRET;

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const EMAIL_FROM = process.env.EMAIL_FROM;
const FRONTEND_RESET_BASE = process.env.FRONTEND_RESET_BASE; // e.g. exp:// or https://yourdomain/reset
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID; // optional, used to validate audience
const PASSWORD_RESET_TTL_MS = Number(process.env.PASSWORD_RESET_TTL_MINUTES || 25) * 60 * 1000;
const RESET_REQUEST_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RESET_REQUEST_RATE_LIMIT_MAX = 3;
const resetRequestTracker = new Map<string, { count: number; resetAt: number }>();

function createTransportIfConfigured() {
  if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
    return nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT ? Number(SMTP_PORT) : 587,
      secure: false,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });
  }

  return null;
}

function isRateLimited(key: string, maxAttempts: number, windowMs: number): boolean {
  const currentKey = key || 'anonymous';
  const now = Date.now();
  const currentEntry = resetRequestTracker.get(currentKey);

  if (!currentEntry) {
    resetRequestTracker.set(currentKey, { count: 1, resetAt: now });
    return false;
  }

  if (now - currentEntry.resetAt > windowMs) {
    resetRequestTracker.set(currentKey, { count: 1, resetAt: now });
    return false;
  }

  currentEntry.count += 1;

  if (currentEntry.count > maxAttempts) {
    return true;
  }

  return false;
}

function getResetLink(token: string, email: string): string {
  const encodedEmail = encodeURIComponent(email);
  const base = FRONTEND_RESET_BASE || 'mobile://reset-password';
  return `${base}?token=${encodeURIComponent(token)}&email=${encodedEmail}`;
}

function clearResetTokenData(user: IUser) {
  user.resetPasswordToken = undefined as any;
  user.resetPasswordExpires = undefined as any;
  user.passwordResetTokenHash = undefined as any;
  user.passwordResetExpires = undefined as any;
}

function normalizeEmail(email: string): string {
  return String(email).trim().toLowerCase();
}

export async function register(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const {
      name,
      section,
      email,
      rollNumber,
      phone,
      password,
      role,
    } = req.body;

    // Validate required fields
    if (
      !name ||
      !section ||
      !email ||
      !rollNumber ||
      !phone ||
      !password
    ) {
      res.status(400).json({
        success: false,
        message: 'All fields are required.',
      });
      return;
    }

    // JWT configuration
    if (!JWT_SECRET) {
      res.status(500).json({
        success: false,
        message: 'JWT configuration is missing.',
      });
      return;
    }

    // Password validation
    if (String(password).length < 6) {
      res.status(400).json({
        success: false,
        message: 'Password must contain at least 6 characters.',
      });
      return;
    }

    // Normalize email
    const normalizedEmail = String(email)
      .trim()
      .toLowerCase();

    // KITSW email validation
    if (!/^[a-z0-9]+@kitsw\.ac\.in$/.test(normalizedEmail)) {
      res.status(400).json({
        success: false,
        message: 'Please use a valid KITSW college email.',
      });
      return;
    }

    // Normalize roll number
    const normalizedRollNumber = String(rollNumber)
      .trim()
      .toUpperCase();

    const normalizedRole = String(role || 'student')
      .trim()
      .toLowerCase();

    if (normalizedRole !== 'student' && normalizedRole !== 'admin') {
      res.status(400).json({
        success: false,
        message: 'Please select a valid role: Student or Admin.',
      });
      return;
    }

    // Check existing account
    const existingUser = await User.findOne({
      $or: [
        { email: normalizedEmail },
        { rollNumber: normalizedRollNumber },
      ],
    });

    if (existingUser) {
      res.status(409).json({
        success: false,
        message:
          'An account with this email or roll number already exists.',
      });
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(
      String(password),
      12,
    );

    // Create user
    const user = await User.create({
      name: String(name).trim(),
      section: String(section).trim(),
      email: normalizedEmail,
      rollNumber: normalizedRollNumber,
      phone: String(phone).trim(),
      password: hashedPassword,
      role: normalizedRole,
    });

    // Generate JWT
    const token = jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email,
      },
      JWT_SECRET,
      {
        expiresIn: '7d',
      },
    );

    // Response
    res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      token,
      user: {
        id: user._id,
        name: user.name,
        section: user.section,
        email: user.email,
        rollNumber: user.rollNumber,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Register error:', error);

    res.status(500).json({
      success: false,
      message: 'Unable to create account.',
    });
  }
}

export async function login(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: 'Email and password are required.',
      });
      return;
    }

    // JWT configuration
    if (!JWT_SECRET) {
      res.status(500).json({
        success: false,
        message: 'JWT configuration is missing.',
      });
      return;
    }

    // Normalize email
    const normalizedEmail = String(email)
      .trim()
      .toLowerCase();

    // Find user
    const user = await User.findOne({
      email: normalizedEmail,
    });

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
      return;
    }

    // Compare password
    const passwordMatches = await bcrypt.compare(
      String(password),
      user.password,
    );

    if (!passwordMatches) {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
      return;
    }

    // Generate JWT
    const token = jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email,
      },
      JWT_SECRET,
      {
        expiresIn: '7d',
      },
    );

    // Response
    res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        id: user._id,
        name: user.name,
        section: user.section,
        email: user.email,
        rollNumber: user.rollNumber,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);

    res.status(500).json({
      success: false,
      message: 'Unable to login.',
    });
  }
}

/**
 * Delete the currently authenticated student's account.
 *
 * The request must contain:
 * Authorization: Bearer <JWT>
 */
export async function deleteAccount(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    // Make sure authentication middleware attached the user
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
      return;
    }

    // Find the authenticated account
    const user = await User.findById(req.user.id);

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User account not found.',
      });
      return;
    }

    // Delete only the authenticated user's account
    await User.findByIdAndDelete(req.user.id);

    res.status(200).json({
      success: true,
      message:
        'Your KitSphere account has been deleted successfully.',
    });
  } catch (error) {
    console.error('Delete account error:', error);

    res.status(500).json({
      success: false,
      message:
        'Unable to delete account. Please try again.',
    });
  }
}

export async function getMe(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const user = await User.findById(req.user.id).select('_id name section email rollNumber phone role');

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    res.status(200).json({ success: true, user: {
      id: user._id,
      name: user.name,
      section: user.section,
      email: user.email,
      rollNumber: user.rollNumber,
      phone: user.phone,
      role: user.role,
    }});
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ success: false, message: 'Unable to retrieve profile.' });
  }
}

export async function updateMe(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const updates: Partial<any> = {};
    const { name, section, phone } = req.body;

    if (name) updates.name = String(name).trim();
    if (section) updates.section = String(section).trim();
    if (phone) updates.phone = String(phone).trim();

    const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true }).select('_id name section email rollNumber phone role');

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    res.status(200).json({ success: true, user: {
      id: user._id,
      name: user.name,
      section: user.section,
      email: user.email,
      rollNumber: user.rollNumber,
      phone: user.phone,
      role: user.role,
    }});
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, message: 'Unable to update profile.' });
  }
}

export async function forgotPassword(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ success: false, message: 'Please enter your email address.' });
      return;
    }

    const normalizedEmail = normalizeEmail(email);
    const emailPattern = /^[a-z0-9._%+-]+@kitsw\.ac\.in$/i;

    if (!emailPattern.test(normalizedEmail)) {
      res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
      return;
    }

    const rateLimitKey = `${req.ip || 'unknown'}:${normalizedEmail}`;
    if (isRateLimited(rateLimitKey, RESET_REQUEST_RATE_LIMIT_MAX, RESET_REQUEST_RATE_LIMIT_WINDOW_MS)) {
      res.status(429).json({
        success: false,
        message: 'Too many requests. Please wait a while and try again.',
      });
      return;
    }

    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      res.status(200).json({
        success: true,
        message: 'If an account exists for this email, a password reset link has been sent.',
      });
      return;
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expiry = new Date(Date.now() + PASSWORD_RESET_TTL_MS);

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = expiry;
    user.passwordResetTokenHash = hashedToken;
    user.passwordResetExpires = expiry;

    await user.save();

    const resetLink = getResetLink(resetToken, user.email);
    const transport = createTransportIfConfigured();

    try {
      if (transport && EMAIL_FROM) {
        await transport.sendMail({
          from: EMAIL_FROM,
          to: user.email,
          subject: 'KitSphere password reset',
          text: `You requested a password reset. Use this link to reset your password: ${resetLink}`,
          html: `<p>You requested a password reset.</p><p><a href="${resetLink}">Reset your password</a></p>`,
        });
      } else if (process.env.NODE_ENV === 'production') {
        throw new Error('Reset email service unavailable.');
      }

      res.status(200).json({
        success: true,
        message: 'If an account exists for this email, a password reset link has been sent.',
      });
    } catch (emailError) {
      console.error('Password reset email delivery failed.');
      res.status(503).json({
        success: false,
        message: 'We couldn\'t send the reset email right now. Please try again in a moment.',
      });
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again later.',
    });
  }
}

export async function resetPassword(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const { token, password, newPassword } = req.body;
    const suppliedPassword = String(password ?? newPassword ?? '');

    if (!token || !suppliedPassword) {
      res.status(400).json({ success: false, message: 'Token and new password are required.' });
      return;
    }

    if (String(suppliedPassword).trim().length < 6) {
      res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
      return;
    }

    const hashedToken = crypto.createHash('sha256').update(String(token).trim()).digest('hex');

    const user = await User.findOne({
      $or: [
        {
          passwordResetTokenHash: hashedToken,
          passwordResetExpires: { $gt: new Date() },
        },
        {
          resetPasswordToken: hashedToken,
          resetPasswordExpires: { $gt: new Date() },
        },
      ],
    });

    if (!user) {
      res.status(400).json({
        success: false,
        message: 'This reset link is invalid or expired. Please request a new password reset link.',
      });
      return;
    }

    if (await bcrypt.compare(String(suppliedPassword), user.password)) {
      res.status(400).json({
        success: false,
        message: 'Your new password must be different from your current password.',
      });
      return;
    }

    user.password = await bcrypt.hash(String(suppliedPassword), 12);
    clearResetTokenData(user);
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password has been reset successfully.',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again later.',
    });
  }
}

export async function googleAuth(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      res.status(400).json({ success: false, message: 'idToken is required.' });
      return;
    }

    const client = new OAuth2Client(GOOGLE_CLIENT_ID);

    const ticket = await client.verifyIdToken({ idToken, audience: GOOGLE_CLIENT_ID || undefined });
    const payload = ticket.getPayload();

    if (!payload || !payload.email) {
      res.status(400).json({ success: false, message: 'Unable to verify Google identity.' });
      return;
    }

    const email = String(payload.email).toLowerCase();

    // Only allow college emails
    if (!/^[a-z0-9]+@kitsw\.ac\.in$/.test(email)) {
      res.status(403).json({ success: false, message: 'Google account must use KITSW college email.' });
      return;
    }

    let user = await User.findOne({ email });

    if (!user) {
      const generatedPassword = await bcrypt.hash(`${Date.now()}-${crypto.randomBytes(24).toString('hex')}`, 12);

      user = await User.create({
        name: payload.name || 'Student',
        section: 'N/A',
        email,
        rollNumber: payload.email.split('@')[0].toUpperCase(),
        phone: (payload as any).phone_number || '',
        password: generatedPassword,
      });
    }

    // Generate JWT
    if (!JWT_SECRET) {
      res.status(500).json({ success: false, message: 'JWT configuration is missing.' });
      return;
    }

    const token = jwt.sign({ userId: user._id.toString(), email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    res.status(200).json({ success: true, message: 'Login successful.', token, user: {
      id: user._id,
      name: user.name,
      section: user.section,
      email: user.email,
      rollNumber: user.rollNumber,
      phone: user.phone,
    }});
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({ success: false, message: 'Unable to authenticate with Google.' });
  }
}