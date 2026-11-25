const { Schema, model } = require('mongoose');

const ZONE_STATUSES = ['Completed', 'Under Construction', 'Upcoming'];
const ZONE_CATEGORIES = ['Infrastructure', 'Road', 'Building', 'Amenity', 'Landscape', 'Plot Zone'];
const ZONE_SHAPES = ['gate', 'road', 'park', 'clubhouse', 'utility', 'sectorA', 'sectorB', 'sectorC', 'building'];

const zoneSchema = new Schema({
  code: { type: String, required: true, trim: true },
  name: { type: String, required: true, trim: true },
  category: { type: String, enum: ZONE_CATEGORIES, default: 'Infrastructure' },
  status: { type: String, enum: ZONE_STATUSES, default: 'Upcoming' },
  progress: { type: Number, min: 0, max: 100, default: 0 },
  description: { type: String, default: '' },
  targetDate: { type: String, default: '' },
  photos: { type: [String], default: [] },
  shape: { type: String, enum: ZONE_SHAPES, default: 'building' },
  gridX: { type: Number, default: 0 },
  gridZ: { type: Number, default: 0 },
  width: { type: Number, default: 2.4 },
  depth: { type: Number, default: 2.4 },
});

const updateSchema = new Schema({
  title: { type: String, required: true, trim: true },
  area: { type: String, default: '' },
  status: { type: String, enum: ZONE_STATUSES, default: 'Under Construction' },
  date: { type: Date, default: Date.now },
  description: { type: String, default: '' },
  photos: { type: [String], default: [] },
});

const gallerySchema = new Schema({
  url: { type: String, required: true },
  caption: { type: String, default: '' },
  stage: { type: String, enum: ZONE_STATUSES, default: 'Under Construction' },
  takenAt: { type: String, default: '' },
});

const constructionSchema = new Schema({
  key: { type: String, unique: true, default: 'main' },
  projectTitle: { type: String, default: 'Vistara Enclave Masterplan' },
  overallProgress: { type: Number, min: 0, max: 100, default: 52 },
  currentPhase: { type: String, default: 'Phase 1 Infrastructure & Plot Demarcation' },
  summary: { type: String, default: 'Live site progress tracked zone-by-zone across roads, utilities, landscaping, and structures.' },
  architecturalPlanImage: { type: String, default: '' },
  lastUpdatedAt: { type: Date, default: Date.now },
  zones: { type: [zoneSchema], default: [] },
  updates: { type: [updateSchema], default: [] },
  gallery: { type: [gallerySchema], default: [] },
}, { timestamps: true });

module.exports = model('Construction', constructionSchema);
module.exports.ZONE_STATUSES = ZONE_STATUSES;
module.exports.ZONE_CATEGORIES = ZONE_CATEGORIES;
module.exports.ZONE_SHAPES = ZONE_SHAPES;
