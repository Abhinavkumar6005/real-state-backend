const { Schema, model } = require('mongoose');
const STATUSES = ['Pending', 'Contacted', 'Interested', 'Visit Scheduled', 'Completed'];
const enquirySchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, trim: true, lowercase: true, maxlength: 150 },
  phone: { type: String, required: true, trim: true, maxlength: 20 },
  visitDate: { type: Date, required: true },
  enquiryType: { type: String, enum: ['Site Visit', 'Plot Booking'], default: 'Site Visit' },
  message: { type: String, trim: true, maxlength: 2000, default: '' },
  plotId: { type: Schema.Types.ObjectId, ref: 'Plot', default: null },
  plotTitle: { type: String, default: '' },
  plotNumber: { type: String, default: '' },
  status: { type: String, enum: STATUSES, default: 'Pending' },
  notes: [{ text: { type: String, maxlength: 2000 }, createdAt: { type: Date, default: Date.now }, updatedAt: Date }],
  history: [{ action: String, at: { type: Date, default: Date.now } }],
}, { timestamps: true });
module.exports = model('Enquiry', enquirySchema);
module.exports.STATUSES = STATUSES;
