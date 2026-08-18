import { Response } from 'express';
import mongoose from 'mongoose';
import Club from '../models/Club';
import ClubMembership from '../models/ClubMembership';
import SavedClub from '../models/SavedClub';
import Event from '../models/Event';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

// Utility to check valid Mongoose ObjectId
const isValidId = (id: string) => mongoose.Types.ObjectId.isValid(id);

export async function getClubs(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { search, category } = req.query;
    const filter: Record<string, any> = {};

    if (category) {
      filter.category = { $regex: new RegExp('^' + String(category).trim() + '$', 'i') };
    }

    if (search) {
      const q = String(search).trim();
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
      ];
    }

    const clubs = await Club.find(filter)
      .select('id name description category logo membersCount establishedYear createdAt updatedAt')
      .sort({ name: 1 })
      .lean();

    res.status(200).json({ success: true, data: clubs });
  } catch (error) {
    console.error('getClubs error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function getClubById(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params as any;
    if (!isValidId(id)) {
      res.status(400).json({ success: false, message: 'Invalid club ID' });
      return;
    }

    const club = await Club.findById(id).populate('clubHead', 'name email').lean();
    if (!club) {
      res.status(404).json({ success: false, message: 'Club not found' });
      return;
    }

    // Double-check members count dynamically
    const activeCount = await ClubMembership.countDocuments({
      club: new mongoose.Types.ObjectId(id),
      status: 'active',
    });

    const result = {
      id: club._id.toString(),
      name: club.name,
      description: club.description,
      category: club.category,
      logo: club.logo || null,
      clubHead: club.clubHead ? (club.clubHead as any).name : null,
      clubHeadEmail: club.clubHead ? (club.clubHead as any).email : null,
      membersCount: activeCount > 0 ? activeCount : (club.membersCount || 0),
      capacity: club.capacity || 100,
      contactEmail: club.contactEmail || null,
      contactPhone: club.contactPhone || null,
      establishedYear: club.establishedYear || null,
      createdAt: club.createdAt,
      updatedAt: club.updatedAt,
    };

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('getClubById error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function createClub(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const {
      name,
      description,
      category,
      logo,
      clubHead,
      contactEmail,
      contactPhone,
      establishedYear,
      capacity,
    } = req.body;

    if (!name || !description || !category) {
      res.status(400).json({ success: false, message: 'name, description and category are required' });
      return;
    }

    if (capacity !== undefined && (typeof capacity !== 'number' || capacity <= 0)) {
      res.status(400).json({ success: false, message: 'capacity must be a positive number' });
      return;
    }

    let headId: mongoose.Types.ObjectId | undefined = undefined;
    if (clubHead) {
      if (!isValidId(clubHead)) {
        res.status(400).json({ success: false, message: 'Invalid club head user ID' });
        return;
      }
      headId = new mongoose.Types.ObjectId(clubHead);
    }

    const newClub = await Club.create({
      name: String(name).trim(),
      description: String(description).trim(),
      category: String(category).trim(),
      logo,
      clubHead: headId,
      contactEmail,
      contactPhone,
      establishedYear,
      capacity: capacity !== undefined ? capacity : 100,
    });

    res.status(201).json({ success: true, message: 'Club created successfully', data: newClub });
  } catch (error) {
    console.error('createClub error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function updateClub(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params as any;
    if (!isValidId(id)) {
      res.status(400).json({ success: false, message: 'Invalid club ID' });
      return;
    }

    const club = await Club.findById(id);
    if (!club) {
      res.status(404).json({ success: false, message: 'Club not found' });
      return;
    }

    // Authorization check: Only Admin OR the specific Club Head can update it
    if (req.user?.role !== 'admin' && club.clubHead?.toString() !== req.user?.id) {
      res.status(403).json({ success: false, message: 'Forbidden. You are not authorized to update this club.' });
      return;
    }

    const allowed = ['name', 'description', 'category', 'logo', 'clubHead', 'contactEmail', 'contactPhone', 'establishedYear', 'capacity'];
    const updates: Record<string, any> = {};

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    if (updates.capacity !== undefined && (typeof updates.capacity !== 'number' || updates.capacity <= 0)) {
      res.status(400).json({ success: false, message: 'capacity must be a positive number' });
      return;
    }

    if (updates.name === '' || updates.description === '' || updates.category === '') {
      res.status(400).json({ success: false, message: 'Required fields cannot be empty' });
      return;
    }

    if (updates.clubHead) {
      if (!isValidId(updates.clubHead)) {
        res.status(400).json({ success: false, message: 'Invalid club head user ID' });
        return;
      }
      updates.clubHead = new mongoose.Types.ObjectId(updates.clubHead);
    }

    const updatedClub = await Club.findByIdAndUpdate(id, updates, { new: true });
    res.status(200).json({ success: true, message: 'Club updated successfully', data: updatedClub });
  } catch (error) {
    console.error('updateClub error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function deleteClub(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params as any;
    if (!isValidId(id)) {
      res.status(400).json({ success: false, message: 'Invalid club ID' });
      return;
    }

    const club = await Club.findById(id);
    if (!club) {
      res.status(404).json({ success: false, message: 'Club not found' });
      return;
    }

    // Authorization check
    if (req.user?.role !== 'admin' && club.clubHead?.toString() !== req.user?.id) {
      res.status(403).json({ success: false, message: 'Forbidden. You are not authorized to delete this club.' });
      return;
    }

    await Club.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: 'Club deleted successfully' });
  } catch (error) {
    console.error('deleteClub error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function joinClub(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params as any;
    if (!isValidId(id)) {
      res.status(400).json({ success: false, message: 'Invalid club ID' });
      return;
    }

    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const club = await Club.findById(id);
    if (!club) {
      res.status(404).json({ success: false, message: 'Club not found' });
      return;
    }

    const activeCount = await ClubMembership.countDocuments({
      club: club._id,
      status: 'active',
    });

    const capacity = club.capacity || 100;
    if (activeCount >= capacity) {
      res.status(400).json({ success: false, message: 'Club is full. No slots available.' });
      return;
    }

    const existingMembership = await ClubMembership.findOne({
      club: club._id,
      user: new mongoose.Types.ObjectId(userId),
    });

    if (existingMembership) {
      if (existingMembership.status === 'active') {
        res.status(409).json({ success: false, message: 'Already a member of this club' });
        return;
      }
      existingMembership.status = 'active';
      existingMembership.joinedAt = new Date();
      await existingMembership.save();
    } else {
      await ClubMembership.create({
        club: club._id,
        user: new mongoose.Types.ObjectId(userId),
        role: 'member',
        status: 'active',
      });
    }

    club.membersCount = activeCount + 1;
    await club.save();

    res.status(201).json({ success: true, message: 'Joined club successfully' });
  } catch (error) {
    console.error('joinClub error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function leaveClub(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params as any;
    if (!isValidId(id)) {
      res.status(400).json({ success: false, message: 'Invalid club ID' });
      return;
    }

    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const club = await Club.findById(id);
    if (!club) {
      res.status(404).json({ success: false, message: 'Club not found' });
      return;
    }

    const membership = await ClubMembership.findOne({
      club: club._id,
      user: new mongoose.Types.ObjectId(userId),
      status: 'active',
    });

    if (!membership) {
      res.status(400).json({ success: false, message: 'Not an active member of this club' });
      return;
    }

    membership.status = 'inactive';
    await membership.save();

    const activeCount = await ClubMembership.countDocuments({
      club: club._id,
      status: 'active',
    });
    club.membersCount = activeCount;
    await club.save();

    res.status(200).json({ success: true, message: 'Left club successfully' });
  } catch (error) {
    console.error('leaveClub error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function saveClub(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params as any;
    if (!isValidId(id)) {
      res.status(400).json({ success: false, message: 'Invalid club ID' });
      return;
    }

    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const club = await Club.findById(id);
    if (!club) {
      res.status(404).json({ success: false, message: 'Club not found' });
      return;
    }

    const existing = await SavedClub.findOne({
      club: club._id,
      user: new mongoose.Types.ObjectId(userId),
    });

    if (existing) {
      res.status(409).json({ success: false, message: 'Club already saved' });
      return;
    }

    await SavedClub.create({
      club: club._id,
      user: new mongoose.Types.ObjectId(userId),
    });

    res.status(201).json({ success: true, message: 'Club saved successfully' });
  } catch (error) {
    console.error('saveClub error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function unsaveClub(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params as any;
    if (!isValidId(id)) {
      res.status(400).json({ success: false, message: 'Invalid club ID' });
      return;
    }

    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const deleted = await SavedClub.findOneAndDelete({
      club: new mongoose.Types.ObjectId(id),
      user: new mongoose.Types.ObjectId(userId),
    });

    if (!deleted) {
      res.status(200).json({ success: true, message: 'Club was not saved' });
      return;
    }

    res.status(200).json({ success: true, message: 'Club unsaved successfully' });
  } catch (error) {
    console.error('unsaveClub error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function getSavedStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params as any;
    if (!isValidId(id)) {
      res.status(400).json({ success: false, message: 'Invalid club ID' });
      return;
    }

    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const saved = await SavedClub.findOne({
      club: new mongoose.Types.ObjectId(id),
      user: new mongoose.Types.ObjectId(userId),
    });

    res.status(200).json({ success: true, saved: !!saved });
  } catch (error) {
    console.error('getSavedStatus error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function getSavedClubs(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const savedList = await SavedClub.find({
      user: new mongoose.Types.ObjectId(userId),
    })
      .populate('club', 'id name description category logo membersCount establishedYear')
      .lean();

    const clubs = savedList
      .map((item) => item.club)
      .filter((club) => club !== null);

    res.status(200).json({ success: true, data: clubs });
  } catch (error) {
    console.error('getSavedClubs error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function getClubEvents(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params as any;
    if (!isValidId(id)) {
      res.status(400).json({ success: false, message: 'Invalid club ID' });
      return;
    }

    const events = await Event.find({
      club: new mongoose.Types.ObjectId(id),
      status: { $ne: 'cancelled' },
    })
      .sort({ date: 1, startTime: 1 })
      .lean();

    res.status(200).json({ success: true, data: events });
  } catch (error) {
    console.error('getClubEvents error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function getClubMembers(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params as any;
    if (!isValidId(id)) {
      res.status(400).json({ success: false, message: 'Invalid club ID' });
      return;
    }

    const memberships = await ClubMembership.find({
      club: new mongoose.Types.ObjectId(id),
      status: 'active',
    })
      .populate('user', 'name email rollNumber section')
      .lean();

    const members = memberships.map((m) => ({
      membershipId: m._id.toString(),
      userId: m.user ? (m.user as any)._id.toString() : null,
      name: m.user ? (m.user as any).name : 'Unknown User',
      email: m.user ? (m.user as any).email : null,
      rollNumber: m.user ? (m.user as any).rollNumber : null,
      section: m.user ? (m.user as any).section : null,
      role: m.role,
      status: m.status,
      joinedAt: m.joinedAt,
    }));

    res.status(200).json({ success: true, data: members });
  } catch (error) {
    console.error('getClubMembers error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function getJoinedClubs(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const memberships = await ClubMembership.find({
      user: new mongoose.Types.ObjectId(userId),
      status: 'active',
    })
      .populate('club')
      .lean();

    const clubs = memberships
      .map((m) => {
        if (!m.club) return null;
        const c = m.club as any;
        return {
          id: c._id.toString(),
          name: c.name,
          description: c.description,
          category: c.category,
          logo: c.logo || null,
          membersCount: c.membersCount || 0,
          capacity: c.capacity || 100,
          establishedYear: c.establishedYear || null,
        };
      })
      .filter((c) => c !== null);

    res.status(200).json({ success: true, data: clubs });
  } catch (error) {
    console.error('getJoinedClubs error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}
