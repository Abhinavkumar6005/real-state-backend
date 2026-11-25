const router = require('express').Router();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Enquiry = require('../models/Enquiry');
const Plot = require('../models/Plot');
const SiteContent = require('../models/SiteContent');
const Construction = require('../models/Construction');
const defaults = require('../content/defaults');
const merge = require('../content/merge');
const constructionDefaults = require('../content/constructionDefaults');
const { upload, replace, dir, MAX_IMAGE } = require('../middleware/upload');

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const isId = (id) => /^[a-f\d]{24}$/i.test(id);
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const normalizePlot = (p) => {
  const o = p.toObject ? p.toObject() : { ...p };
  if (o.availability === 'Booked') o.availability = 'Reserved';
  return o;
};

async function getOrCreateConstruction() {
  let doc = await Construction.findOne({ key: 'main' });
  if (!doc) doc = await Construction.create({ key: 'main', ...constructionDefaults });
  return doc;
}

router.get('/me', (req, res) => res.json({ email: req.admin.email }));

/* Dashboard */
router.get('/stats', wrap(async (req, res) => {
  const week = new Date(Date.now() - 7 * 864e5);
  const [total, last7, byStatus, recent, allPlots, content, construction] = await Promise.all([
    Enquiry.countDocuments(),
    Enquiry.countDocuments({ createdAt: { $gte: week } }),
    Enquiry.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
    Enquiry.find().sort({ createdAt: -1 }).limit(5),
    Plot.find({}, 'availability published featured'),
    SiteContent.findOne({ key: 'main' }),
    getOrCreateConstruction(),
  ]);

  const plotStats = {
    total: allPlots.length,
    available: allPlots.filter((p) => p.availability === 'Available').length,
    reserved: allPlots.filter((p) => p.availability === 'Reserved' || p.availability === 'Booked').length,
    sold: allPlots.filter((p) => p.availability === 'Sold').length,
    published: allPlots.filter((p) => p.published).length,
    draft: allPlots.filter((p) => !p.published).length,
    featured: allPlots.filter((p) => p.featured).length,
  };

  const zones = construction.zones || [];
  const merged = merge(defaults, content ? content.data : {});
  res.json({
    total,
    last7,
    byStatus: Object.fromEntries(byStatus.map((s) => [s._id, s.n])),
    recent,
    plots: plotStats,
    construction: {
      overallProgress: construction.overallProgress,
      currentPhase: construction.currentPhase,
      totalZones: zones.length,
      completedZones: zones.filter((z) => z.status === 'Completed').length,
      underConstructionZones: zones.filter((z) => z.status === 'Under Construction').length,
      upcomingZones: zones.filter((z) => z.status === 'Upcoming').length,
      lastUpdatedAt: construction.lastUpdatedAt || construction.updatedAt,
    },
    contentStatus: {
      lastEdited: content ? content.updatedAt : null,
      heroVideoSet: !!merged.home.hero.videoUrl,
      contactSet: !!(merged.contact.info.email || merged.contact.info.phone),
    },
  });
}));

/* Enquiries */
router.get('/enquiries', wrap(async (req, res) => {
  const { search, status, page = 1 } = req.query;
  const q = {};
  if (status && Enquiry.STATUSES.includes(status)) q.status = status;
  if (search) {
    const r = new RegExp(esc(String(search)), 'i');
    q.$or = [{ name: r }, { email: r }, { phone: r }, { plotTitle: r }, { plotNumber: r }];
  }
  const limit = 20, skip = (Math.max(1, +page) - 1) * limit;
  const [items, total] = await Promise.all([Enquiry.find(q).sort({ createdAt: -1 }).skip(skip).limit(limit), Enquiry.countDocuments(q)]);
  res.json({ items, total, pages: Math.ceil(total / limit) });
}));

router.get('/enquiries/:id', wrap(async (req, res) => {
  const e = isId(req.params.id) && await Enquiry.findById(req.params.id);
  e ? res.json(e) : res.status(404).json({ message: 'Enquiry not found.' });
}));

router.patch('/enquiries/:id', wrap(async (req, res) => {
  const e = isId(req.params.id) && await Enquiry.findById(req.params.id);
  if (!e) return res.status(404).json({ message: 'Enquiry not found.' });
  if (!Enquiry.STATUSES.includes(req.body.status)) return res.status(400).json({ message: 'Choose a valid status.' });
  if (e.status !== req.body.status) {
    e.history.push({ action: `Status changed from ${e.status} to ${req.body.status}` });
    e.status = req.body.status;
  }
  await e.save();
  res.json(e);
}));

router.post('/enquiries/:id/notes', wrap(async (req, res) => {
  const e = isId(req.params.id) && await Enquiry.findById(req.params.id);
  const text = String(req.body.text || '').trim();
  if (!e) return res.status(404).json({ message: 'Enquiry not found.' });
  if (!text) return res.status(400).json({ message: 'Write a note first.' });
  e.notes.push({ text });
  e.history.push({ action: 'Note added' });
  await e.save();
  res.json(e);
}));

router.put('/enquiries/:id/notes/:noteId', wrap(async (req, res) => {
  const e = isId(req.params.id) && await Enquiry.findById(req.params.id);
  const note = e && e.notes.id(req.params.noteId);
  const text = String(req.body.text || '').trim();
  if (!note) return res.status(404).json({ message: 'Note not found.' });
  if (!text) return res.status(400).json({ message: 'A note cannot be empty.' });
  note.text = text;
  note.updatedAt = new Date();
  e.history.push({ action: 'Note edited' });
  await e.save();
  res.json(e);
}));

router.delete('/enquiries/:id/notes/:noteId', wrap(async (req, res) => {
  const e = isId(req.params.id) && await Enquiry.findById(req.params.id);
  if (!e) return res.status(404).json({ message: 'Enquiry not found.' });
  e.notes.pull(req.params.noteId);
  e.history.push({ action: 'Note deleted' });
  await e.save();
  res.json(e);
}));

router.delete('/enquiries/:id', wrap(async (req, res) => {
  if (isId(req.params.id)) await Enquiry.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
}));

/* Plots */
const parseFeatures = (val) => {
  if (Array.isArray(val)) return val.map((s) => String(s).trim()).filter(Boolean);
  if (typeof val === 'string') return val.split(',').map((s) => s.trim()).filter(Boolean);
  return [];
};

const plotFields = (b) => {
  const rawAvail = b.availability === 'Booked' ? 'Reserved' : b.availability;
  const code = String(b.plotCode || '').trim();
  return {
    title: String(b.title || '').trim(),
    plotNumber: String(b.plotNumber || '').trim(),
    ...(code ? { plotCode: code } : {}),
    location: String(b.location || '').trim(),
    area: String(b.area || '').trim(),
    dimensions: String(b.dimensions || '').trim(),
    facing: String(b.facing || '').trim(),
    price: String(b.price || '').trim(),
    description: String(b.description || ''),
    features: parseFeatures(b.features),
    images: Array.isArray(b.images) ? b.images.filter((s) => typeof s === 'string') : [],
    availability: ['Available', 'Reserved', 'Sold'].includes(rawAvail) ? rawAvail : 'Available',
    featured: !!b.featured,
    published: b.published === undefined ? true : !!b.published,
  };
};

router.get('/plots', wrap(async (req, res) => {
  const plots = await Plot.find().sort({ order: 1, createdAt: -1 });
  res.json(plots.map(normalizePlot));
}));

router.put('/plots/reorder', wrap(async (req, res) => {
  const ids = (req.body.ids || []).filter(isId);
  await Plot.bulkWrite(ids.map((id, i) => ({ updateOne: { filter: { _id: id }, update: { order: i } } })));
  res.json({ ok: true });
}));

router.post('/plots', wrap(async (req, res) => {
  const f = plotFields(req.body);
  if (!f.title) return res.status(400).json({ message: 'Give the plot a title.' });
  if (!f.plotCode) {
    f.plotCode = 'VST-' + crypto.randomBytes(2).toString('hex').toUpperCase();
  }
  const last = await Plot.findOne().sort({ order: -1 });
  const created = await Plot.create({ ...f, order: last ? last.order + 1 : 0 });
  res.status(201).json(normalizePlot(created));
}));

router.put('/plots/:id', wrap(async (req, res) => {
  const f = plotFields(req.body);
  if (!f.title) return res.status(400).json({ message: 'Give the plot a title.' });
  const updateOp = f.plotCode ? f : { ...f, $unset: { plotCode: 1 } };
  const p = isId(req.params.id) && await Plot.findByIdAndUpdate(req.params.id, updateOp, { new: true, runValidators: true });
  p ? res.json(normalizePlot(p)) : res.status(404).json({ message: 'Plot not found.' });
}));

router.delete('/plots/:id', wrap(async (req, res) => {
  if (isId(req.params.id)) await Plot.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
}));

/* Construction Progress */
router.get('/construction', wrap(async (req, res) => {
  res.json(await getOrCreateConstruction());
}));

router.put('/construction', wrap(async (req, res) => {
  const b = req.body || {};
  const doc = await getOrCreateConstruction();
  if (typeof b.projectTitle === 'string') doc.projectTitle = b.projectTitle.trim();
  if (b.overallProgress !== undefined) {
    doc.overallProgress = Math.max(0, Math.min(100, Number(b.overallProgress) || 0));
  }
  if (typeof b.currentPhase === 'string') doc.currentPhase = b.currentPhase.trim();
  if (typeof b.summary === 'string') doc.summary = b.summary.trim();
  if (typeof b.architecturalPlanImage === 'string') doc.architecturalPlanImage = b.architecturalPlanImage.trim();
  if (Array.isArray(b.zones)) doc.zones = b.zones;
  if (Array.isArray(b.updates)) doc.updates = b.updates;
  if (Array.isArray(b.gallery)) doc.gallery = b.gallery;
  doc.lastUpdatedAt = new Date();
  await doc.save();
  res.json(doc);
}));

router.post('/construction/zones', wrap(async (req, res) => {
  const doc = await getOrCreateConstruction();
  const b = req.body || {};
  if (!b.name) return res.status(400).json({ message: 'Zone name is required.' });
  doc.zones.push({
    code: String(b.code || `Z-${doc.zones.length + 1}`).trim(),
    name: String(b.name).trim(),
    category: Construction.ZONE_CATEGORIES.includes(b.category) ? b.category : 'Infrastructure',
    status: Construction.ZONE_STATUSES.includes(b.status) ? b.status : 'Upcoming',
    progress: Math.max(0, Math.min(100, Number(b.progress) || 0)),
    description: String(b.description || ''),
    targetDate: String(b.targetDate || ''),
    photos: Array.isArray(b.photos) ? b.photos : [],
    shape: Construction.ZONE_SHAPES.includes(b.shape) ? b.shape : 'building',
    gridX: Number(b.gridX) || 0,
    gridZ: Number(b.gridZ) || 0,
    width: Math.max(0.8, Number(b.width) || 2.5),
    depth: Math.max(0.8, Number(b.depth) || 2.5),
  });
  doc.lastUpdatedAt = new Date();
  await doc.save();
  res.status(201).json(doc);
}));

router.put('/construction/zones/:zoneId', wrap(async (req, res) => {
  const doc = await getOrCreateConstruction();
  const z = doc.zones.id(req.params.zoneId);
  if (!z) return res.status(404).json({ message: 'Zone not found.' });
  const b = req.body || {};
  if (b.code !== undefined) z.code = String(b.code).trim();
  if (b.name !== undefined) z.name = String(b.name).trim();
  if (Construction.ZONE_CATEGORIES.includes(b.category)) z.category = b.category;
  if (Construction.ZONE_STATUSES.includes(b.status)) z.status = b.status;
  if (b.progress !== undefined) z.progress = Math.max(0, Math.min(100, Number(b.progress) || 0));
  if (b.description !== undefined) z.description = String(b.description);
  if (b.targetDate !== undefined) z.targetDate = String(b.targetDate);
  if (Array.isArray(b.photos)) z.photos = b.photos;
  if (Construction.ZONE_SHAPES.includes(b.shape)) z.shape = b.shape;
  if (b.gridX !== undefined) z.gridX = Number(b.gridX) || 0;
  if (b.gridZ !== undefined) z.gridZ = Number(b.gridZ) || 0;
  if (b.width !== undefined) z.width = Math.max(0.8, Number(b.width) || 2.5);
  if (b.depth !== undefined) z.depth = Math.max(0.8, Number(b.depth) || 2.5);
  doc.lastUpdatedAt = new Date();
  await doc.save();
  res.json(doc);
}));

router.delete('/construction/zones/:zoneId', wrap(async (req, res) => {
  const doc = await getOrCreateConstruction();
  doc.zones.pull(req.params.zoneId);
  doc.lastUpdatedAt = new Date();
  await doc.save();
  res.json(doc);
}));

router.post('/construction/updates', wrap(async (req, res) => {
  const doc = await getOrCreateConstruction();
  const b = req.body || {};
  if (!b.title) return res.status(400).json({ message: 'Update title is required.' });
  doc.updates.unshift({
    title: String(b.title).trim(),
    area: String(b.area || '').trim(),
    status: Construction.ZONE_STATUSES.includes(b.status) ? b.status : 'Under Construction',
    date: b.date ? new Date(b.date) : new Date(),
    description: String(b.description || ''),
    photos: Array.isArray(b.photos) ? b.photos : [],
  });
  doc.lastUpdatedAt = new Date();
  await doc.save();
  res.status(201).json(doc);
}));

router.delete('/construction/updates/:updateId', wrap(async (req, res) => {
  const doc = await getOrCreateConstruction();
  doc.updates.pull(req.params.updateId);
  doc.lastUpdatedAt = new Date();
  await doc.save();
  res.json(doc);
}));

router.post('/construction/gallery', wrap(async (req, res) => {
  const doc = await getOrCreateConstruction();
  const b = req.body || {};
  if (!b.url) return res.status(400).json({ message: 'Photo URL is required.' });
  doc.gallery.unshift({
    url: String(b.url),
    caption: String(b.caption || '').trim(),
    stage: Construction.ZONE_STATUSES.includes(b.stage) ? b.stage : 'Under Construction',
    takenAt: String(b.takenAt || '').trim(),
  });
  doc.lastUpdatedAt = new Date();
  await doc.save();
  res.status(201).json(doc);
}));

router.delete('/construction/gallery/:photoId', wrap(async (req, res) => {
  const doc = await getOrCreateConstruction();
  doc.gallery.pull(req.params.photoId);
  doc.lastUpdatedAt = new Date();
  await doc.save();
  res.json(doc);
}));

/* Site content */
router.get('/content', wrap(async (req, res) => {
  const doc = await SiteContent.findOne({ key: 'main' });
  res.json(merge(defaults, doc ? doc.data : {}));
}));

router.put('/content', wrap(async (req, res) => {
  const d = req.body;
  if (!d || typeof d !== 'object' || Array.isArray(d) || !d.home || !d.about || !d.contact) {
    return res.status(400).json({ message: 'Content is incomplete.' });
  }
  await SiteContent.findOneAndUpdate({ key: 'main' }, { data: d }, { upsert: true });
  res.json({ ok: true });
}));

/* Media */
const urlFor = (n) => `/uploads/${n}`;
router.get('/media', wrap(async (req, res) => {
  const files = fs.readdirSync(dir).filter((n) => !n.startsWith('.')).map((n) => {
    const s = fs.statSync(path.join(dir, n));
    return { name: n, url: urlFor(n), size: s.size, video: /\.(mp4|webm)$/.test(n), modified: s.mtime };
  }).sort((a, b) => b.modified - a.modified);
  res.json(files);
}));

const checkSize = (req, res) => {
  if (!req.file) { res.status(400).json({ message: 'Choose a file to upload.' }); return false; }
  if (req.file.mimetype.startsWith('image/') && req.file.size > MAX_IMAGE) {
    fs.unlinkSync(req.file.path); res.status(400).json({ message: 'Images must be 5 MB or smaller.' }); return false;
  }
  return true;
};

router.post('/media', (req, res, next) => upload(req, res, (err) => {
  if (err) return next(err);
  if (checkSize(req, res)) res.status(201).json({ name: req.file.filename, url: urlFor(req.file.filename) });
}));

router.put('/media/:name', (req, res, next) => replace(req, res, (err) => {
  if (err) return next(err);
  if (checkSize(req, res)) res.json({ name: req.file.filename, url: urlFor(req.file.filename) });
}));

router.delete('/media/:name', wrap(async (req, res) => {
  const file = path.join(dir, path.basename(req.params.name));
  if (fs.existsSync(file)) fs.unlinkSync(file);
  res.json({ ok: true });
}));

module.exports = router;
