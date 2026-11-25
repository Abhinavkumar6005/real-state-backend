const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const Enquiry = require('../models/Enquiry');
const Plot = require('../models/Plot');
const SiteContent = require('../models/SiteContent');
const Construction = require('../models/Construction');
const defaults = require('../content/defaults');
const merge = require('../content/merge');
const constructionDefaults = require('../content/constructionDefaults');

const normalizePlot = (p) => {
  const o = p.toObject ? p.toObject() : { ...p };
  if (o.availability === 'Booked') o.availability = 'Reserved';
  return o;
};

router.get('/content', async (req, res, next) => {
  try {
    const doc = await SiteContent.findOne({ key: 'main' });
    res.json(merge(defaults, doc ? doc.data : {}));
  } catch (e) { next(e); }
});

router.get('/plots', async (req, res, next) => {
  try {
    const plots = await Plot.find({ published: true }).sort({ featured: -1, order: 1, createdAt: -1 });
    res.json(plots.map(normalizePlot));
  } catch (e) { next(e); }
});

router.get('/construction', async (req, res, next) => {
  try {
    const doc = await Construction.findOne({ key: 'main' });
    if (!doc) return res.json(constructionDefaults);
    res.json(doc);
  } catch (e) { next(e); }
});

const limiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 20, message: { message: 'Too many requests. Please try again later.' } });

router.post('/enquiries', limiter, async (req, res, next) => {
  try {
    const b = req.body || {};
    if (b.website) return res.status(201).json({ ok: true }); // honeypot
    const errors = {};
    const name = String(b.name || '').trim();
    const email = String(b.email || '').trim();
    const phone = String(b.phone || '').trim();
    const message = String(b.message || '').trim();
    const date = new Date(b.visitDate);
    const enquiryType = b.enquiryType === 'Plot Booking' ? 'Plot Booking' : 'Site Visit';

    if (name.length < 2) errors.name = 'Enter your full name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Enter a valid email address.';
    if (!/^[+]?[0-9\s\-()]{7,20}$/.test(phone)) errors.phone = 'Enter a valid phone number.';
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (isNaN(date) || date < today) errors.visitDate = 'Choose today or a future date.';
    if (message.length > 2000) errors.message = 'Keep your message under 2000 characters.';
    if (Object.keys(errors).length) return res.status(422).json({ message: 'Please check the highlighted fields.', errors });

    let plotId = null, plotTitle = '', plotNumber = '';
    if (b.plotId && /^[a-f\d]{24}$/i.test(String(b.plotId))) {
      const plot = await Plot.findById(b.plotId);
      if (plot) {
        plotId = plot._id;
        plotTitle = plot.title;
        plotNumber = plot.plotNumber || plot.plotCode || '';
      }
    }

    const created = await Enquiry.create({
      name,
      email,
      phone,
      visitDate: date,
      enquiryType,
      message,
      plotId,
      plotTitle,
      plotNumber,
      history: [{ action: `${enquiryType} request submitted${plotTitle ? ` for ${plotTitle}` : ''}` }],
    });
    res.status(201).json({ ok: true, id: created._id });
  } catch (e) { next(e); }
});

module.exports = router;
