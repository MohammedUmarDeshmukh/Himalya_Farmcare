import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';

const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads', 'products');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

// Storage configuration with unique safe filenames
const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename(_req, file, cb) {
    const rawExt = path.extname(file.originalname).toLowerCase();
    const ext = ALLOWED_EXTENSIONS.has(rawExt) ? rawExt : '.jpg';
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `product-${uniqueSuffix}${ext}`);
  },
});

// File filter validating both MIME type and file extension
function fileFilter(_req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  const mime = (file.mimetype || '').toLowerCase();

  const isMimeValid = ALLOWED_MIME_TYPES.has(mime);
  const isExtValid = ALLOWED_EXTENSIONS.has(ext);

  if (isMimeValid && isExtValid) {
    cb(null, true);
  } else {
    cb(
      new Error(
        'Invalid file type. Only JPG, JPEG, PNG, and WEBP image files are allowed.',
      ),
      false,
    );
  }
}

// 5 MB maximum file size limit
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
    files: 1,
  },
});

// Wrapper middleware to provide clean error responses for Multer errors
export function handleProductImageUpload(req, res, next) {
  upload.single('image')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            message: 'Image upload failed: File size exceeds the maximum limit of 5 MB.',
          });
        }
        return res.status(400).json({
          message: `Image upload failed: ${err.message}`,
        });
      }
      return res.status(400).json({
        message: err.message || 'Image upload failed.',
      });
    }
    next();
  });
}

// Utility to safely delete an uploaded product image from local disk
export function removeProductImageFile(relativeImagePath) {
  if (!relativeImagePath || typeof relativeImagePath !== 'string') return;
  if (!relativeImagePath.startsWith('/uploads/products/')) return;

  const filename = path.basename(relativeImagePath);
  // Ensure strict safety: no path traversal
  const fullPath = path.resolve(UPLOAD_DIR, filename);

  // Verify the target file is inside UPLOAD_DIR
  if (fullPath.startsWith(UPLOAD_DIR) && fs.existsSync(fullPath)) {
    try {
      fs.unlinkSync(fullPath);
    } catch (error) {
      console.warn(`Failed to delete local product image ${filename}:`, error.message);
    }
  }
}
