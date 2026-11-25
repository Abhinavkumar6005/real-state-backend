const { Schema, model } = require('mongoose');
module.exports = model('SiteContent', new Schema({
  key: { type: String, unique: true, default: 'main' },
  data: { type: Schema.Types.Mixed, default: {} },
}, { timestamps: true }));
