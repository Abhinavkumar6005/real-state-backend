const multer = require('multer'), path = require('path'), crypto = require('crypto');
const dir = path.join(__dirname, '..', 'uploads');
const EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'video/mp4': '.mp4', 'video/webm': '.webm' };
const make = (replace) => multer({
  storage: multer.diskStorage({
    destination: dir,
    filename: (req, f, cb) => {
      const e = EXT[f.mimetype];
      if (replace) {
        const n = path.basename(req.params.name);
        return path.extname(n) === e ? cb(null, n) : cb(new Error('The replacement must be the same file type.'));
      }
      cb(null, crypto.randomBytes(12).toString('hex') + e);
    },
  }),
  limits: { fileSize: 40 * 1024 * 1024 },
  fileFilter: (req, f, cb) => EXT[f.mimetype] ? cb(null, true) : cb(new Error('Only JPG, PNG, WebP, MP4 or WebM files are allowed.')),
}).single('file');
module.exports = { upload: make(false), replace: make(true), dir, MAX_IMAGE: 5 * 1024 * 1024 };
