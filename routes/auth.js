const router = require('express').Router();
const bcrypt = require('bcryptjs'), jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

router.post('/login', async (req, res) => {
  const email = String(req.body.email || '').toLowerCase().trim();
  const password = String(req.body.password || '');
  const admin = await Admin.findOne({ email });
  // Same message for unknown email and wrong password
  const ok = admin && await bcrypt.compare(password, admin.passwordHash);
  if (!ok) return res.status(401).json({ message: 'Email or password is incorrect.' });
  const token = jwt.sign({ id: admin._id, email: admin.email }, process.env.JWT_SECRET, { expiresIn: '8h' });
  res.json({ token, email: admin.email });
});

module.exports = router;
