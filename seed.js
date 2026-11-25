// Creates or updates the admin account from .env and seeds initial construction data. Run: npm run seed
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const bcrypt = require('bcryptjs');
const connectDB = require('./config/db');
const Admin = require('./models/Admin');
const Construction = require('./models/Construction');
const constructionDefaults = require('./content/constructionDefaults');

(async () => {
  try {
    const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    const password = (process.env.ADMIN_PASSWORD || '').trim();
    if (!email || password.length < 8) {
      console.error('Set ADMIN_EMAIL and an ADMIN_PASSWORD of 8+ characters in .env');
      process.exit(1);
    }

    await connectDB();
    const passwordHash = await bcrypt.hash(password, 12);
    const admin = await Admin.findOneAndUpdate(
      { email },
      { email, passwordHash },
      { upsert: true, new: true }
    );

    const existing = await Construction.findOne({ key: 'main' });
    if (!existing) {
      await Construction.create({ key: 'main', ...constructionDefaults });
      console.log('Initial construction masterplan seeded.');
    }

    console.log('Admin ready:', admin.email, '(id:', admin._id.toString() + ')');
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exit(1);
  }
})();
