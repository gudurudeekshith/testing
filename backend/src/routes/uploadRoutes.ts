import { Router, Response } from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { authenticate, requireAdmin } from '../middleware/authMiddleware';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

const router = Router();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer Memory Storage Configuration
const storage = multer.memoryStorage();

const fileFilter = (req: any, file: any, cb: any) => {
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowedMimeTypes.includes(file.mimetype.toLowerCase())) {
    cb(null, true);
  } else {
    cb(new Error('Invalid image format. Only JPG, JPEG, PNG, and WEBP are allowed.'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

const uploadSingleImage = (req: any, res: any, next: any) => {
  upload.single('image')(req, res, (err: any) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, message: 'File is too large. Max size allowed is 5MB.' });
      }
      return res.status(400).json({ success: false, message: err.message });
    } else if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next();
  });
};

router.post('/image', authenticate, requireAdmin, uploadSingleImage, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'No file uploaded.' });
      return;
    }

    // Upload stream wrapper
    const uploadStream = (fileBuffer: Buffer): Promise<any> => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'kitsphere' },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          }
        );
        stream.write(fileBuffer);
        stream.end();
      });
    };

    const result = await uploadStream(req.file.buffer);

    res.status(200).json({
      success: true,
      url: result.secure_url,
    });
  } catch (error: any) {
    console.error('Cloudinary upload error:', error);
    res.status(500).json({ success: false, message: error.message || 'Image upload failed.' });
  }
});

export default router;
