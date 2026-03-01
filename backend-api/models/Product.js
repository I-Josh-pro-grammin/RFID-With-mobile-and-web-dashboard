const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  category: { type: String, enum: ['Cafeteria', 'Printing', 'Internet', 'Event'], default: 'Cafeteria' },
  description: { type: String },
  stock: { type: Number, default: 999 },
  isActive: { type: Boolean, default: true }
});

module.exports = mongoose.model('Product', productSchema);
