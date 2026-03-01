const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  rfidUid: { type: String, required: true },
  teamId: { type: String, default: "TEAM_01" },
  amount: { type: Number, required: true },
  type: { type: String, enum: ['credit', 'debit', 'refund'], required: true },
  description: { type: String },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  status: { type: String, enum: ['success', 'failed', 'pending'], default: 'success' },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Transaction', transactionSchema);
