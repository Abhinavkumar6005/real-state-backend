const { Schema, model } = require('mongoose');

const plotSchema = new Schema({
  title: { type: String, required: true, trim: true },
  plotNumber: { type: String, trim: true, default: '' },
  plotCode: { type: String, trim: true, unique: true, sparse: true },
  location: { type: String, trim: true, default: '' },
  area: { type: String, trim: true, default: '' },
  dimensions: { type: String, trim: true, default: '' },
  facing: { type: String, trim: true, default: '' },
  price: { type: String, trim: true, default: '' },
  description: { type: String, default: '' },
  features: { type: [String], default: [] },
  images: { type: [String], default: [] },
  availability: { type: String, enum: ['Available', 'Reserved', 'Booked', 'Sold'], default: 'Available' },
  featured: { type: Boolean, default: false },
  published: { type: Boolean, default: true },
  order: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = model('Plot', plotSchema);
