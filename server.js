// const path = require('path');
// require('dotenv').config({ path: path.join(__dirname, '.env') });
// const express = require('express');
// const cors = require('cors');
// const helmet = require('helmet');
// const rateLimit = require('express-rate-limit');
// const connectDB = require('./config/db');
// const authMw = require('./middleware/auth');

// if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
//   console.error('Set JWT_SECRET (32+ characters) in .env');
//   process.exit(1);
// }

// const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:3000,http://localhost:3001')
//   .split(',')
//   .map((s) => s.trim())
//   .filter(Boolean);

// const app = express();
// app.set('trust proxy', 1);
// app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
// app.use(cors({
//   origin(origin, cb) {
//     if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
//     cb(new Error('Origin not allowed by CORS'));
//   },
// }));
// app.use(express.json({ limit: '2mb' }));
// app.use('/uploads', express.static(path.join(__dirname, 'uploads'), { maxAge: '7d' }));

// app.get('/api/health', (req, res) => res.json({ ok: true }));
// app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 30, message: { message: 'Too many attempts. Try again in 15 minutes.' } }), require('./routes/auth'));
// app.use('/api/public', require('./routes/public'));
// app.use('/api/admin', authMw, require('./routes/admin'));

// app.use((req, res) => res.status(404).json({ message: 'Not found' }));
// app.use((err, req, res, next) => {
//   if (err && err.code === 11000) {
//     return res.status(400).json({ message: 'That plot ID or unique value already exists.' });
//   }
//   const known = err.name === 'MulterError' || err.name === 'ValidationError' || /file type|allowed|replacement|CORS/i.test(err.message);
//   if (!known) console.error(err);
//   res.status(known ? 400 : 500).json({
//     message: known ? (err.code === 'LIMIT_FILE_SIZE' ? 'File is too large (max 40 MB).' : err.message) : 'Something went wrong. Please try again.',
//   });
// });

// const port = process.env.PORT || 5001;
// connectDB()
//   .then(() => app.listen(port, () => console.log('API on port ' + port)))
//   .catch((e) => {
//     console.error('Database connection failed:', e.message);
//     process.exit(1);
//   });


// const path = require('path');
// require('dotenv').config({ path: path.join(__dirname, '.env') });
// const express = require('express');
// const cors = require('cors');
// const helmet = require('helmet');
// const rateLimit = require('express-rate-limit');
// const connectDB = require('./config/db');
// const authMw = require('./middleware/auth');

// // Log instead of process.exit(): exiting kills the serverless function
// if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
//   console.error('JWT_SECRET missing or shorter than 32 characters');
// }

// const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:3000,http://localhost:3001')
//   .split(',')
//   .map((s) => s.trim().replace(/\/$/, ''))
//   .filter(Boolean);

// const app = express();
// app.set('trust proxy', 1);
// app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
// app.use(cors({
//   origin(origin, cb) {
//     if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
//     cb(new Error('Origin not allowed by CORS'));
//   },
// }));
// app.use(express.json({ limit: '2mb' }));

// // Health check runs BEFORE the DB middleware, so you can test the function itself
// app.get('/api/health', (req, res) => res.json({ ok: true }));
// app.get('/', (req, res) => res.json({ message: 'API running' }));

// // Lazy, cached DB connection (reused across warm invocations)
// let dbPromise = null;
// app.use(async (req, res, next) => {
//   try {
//     if (!dbPromise) dbPromise = connectDB();
//     await dbPromise;
//     next();
//   } catch (e) {
//     dbPromise = null; // retry on next request
//     console.error('Database connection failed:', e.message);
//     res.status(500).json({ message: 'Database connection failed' });
//   }
// });

// // Only useful locally. Vercel's filesystem is read-only and nothing persists.
// app.use('/uploads', express.static(path.join(__dirname, 'uploads'), { maxAge: '7d' }));

// app.use('/api/auth', rateLimit({
//   windowMs: 15 * 60 * 1000,
//   max: 30,
//   message: { message: 'Too many attempts. Try again in 15 minutes.' },
// }), require('./routes/auth'));
// app.use('/api/public', require('./routes/public'));
// app.use('/api/admin', authMw, require('./routes/admin'));

// app.use((req, res) => res.status(404).json({ message: 'Not found' }));

// app.use((err, req, res, next) => {
//   if (err && err.code === 11000) {
//     return res.status(400).json({ message: 'That plot ID or unique value already exists.' });
//   }
//   const known = err.name === 'MulterError' || err.name === 'ValidationError' || /file type|allowed|replacement|CORS/i.test(err.message);
//   if (!known) console.error(err);
//   res.status(known ? 400 : 500).json({
//     message: known
//       ? (err.code === 'LIMIT_FILE_SIZE' ? 'File is too large (max 40 MB).' : err.message)
//       : 'Something went wrong. Please try again.',
//   });
// });

// // Local dev only: Vercel imports the exported app instead
// if (require.main === module) {
//   const port = process.env.PORT || 5001;
//   app.listen(port, () => console.log('API on port ' + port));
// }

// module.exports = app;
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const authMw = require('./middleware/auth');

// Log instead of process.exit(): exiting kills the serverless function
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('JWT_SECRET missing or shorter than 32 characters');
}

// Allowed frontends: built-in defaults + anything in CLIENT_URL (comma separated)
const allowedOrigins = [
  'https://realstate-zeta-eight.vercel.app',
  'http://localhost:3000',
  'http://localhost:3001',
  ...(process.env.CLIENT_URL || '').split(','),
]
  .map((s) => s.trim().replace(/\/$/, ''))
  .filter(Boolean);

const corsOptions = {
  origin(origin, cb) {
    // No origin = server-to-server or curl; allow
    if (!origin || allowedOrigins.includes(origin.replace(/\/$/, ''))) {
      return cb(null, true);
    }
    console.error('CORS blocked origin:', origin);
    return cb(null, false); // no CORS headers, but no crash
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 204,
};

const app = express();
app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// CORS must come first, and preflight must be answered before the DB middleware
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json({ limit: '2mb' }));

// Health check runs BEFORE the DB middleware, so you can test the function itself
app.get('/api/health', (req, res) => res.json({ ok: true }));
app.get('/', (req, res) => res.json({ message: 'API running' }));

// Lazy, cached DB connection (reused across warm invocations)
let dbPromise = null;
app.use(async (req, res, next) => {
  try {
    if (!dbPromise) dbPromise = connectDB();
    await dbPromise;
    next();
  } catch (e) {
    dbPromise = null; // retry on next request
    console.error('Database connection failed:', e.message);
    res.status(500).json({ message: 'Database connection failed' });
  }
});

// Only useful locally. Vercel's filesystem is read-only and nothing persists.
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), { maxAge: '7d' }));

app.use('/api/auth', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { message: 'Too many attempts. Try again in 15 minutes.' },
}), require('./routes/auth'));
app.use('/api/public', require('./routes/public'));
app.use('/api/admin', authMw, require('./routes/admin'));

app.use((req, res) => res.status(404).json({ message: 'Not found' }));

app.use((err, req, res, next) => {
  if (err && err.code === 11000) {
    return res.status(400).json({ message: 'That plot ID or unique value already exists.' });
  }
  const known = err.name === 'MulterError' || err.name === 'ValidationError' || /file type|allowed|replacement/i.test(err.message);
  if (!known) console.error(err);
  res.status(known ? 400 : 500).json({
    message: known
      ? (err.code === 'LIMIT_FILE_SIZE' ? 'File is too large (max 40 MB).' : err.message)
      : 'Something went wrong. Please try again.',
  });
});

// Local dev only: Vercel imports the exported app instead
if (require.main === module) {
  const port = process.env.PORT || 5001;
  app.listen(port, () => console.log('API on port ' + port));
}

module.exports = app;
