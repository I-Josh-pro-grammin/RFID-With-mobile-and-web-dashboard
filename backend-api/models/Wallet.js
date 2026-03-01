const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
  rfidUid: { type: String, required: true, unique: true },
  balance: { type: Number, default: 0 },
  userName: { type: String, default: "New User" },
  teamId: { type: String, default: "TEAM_01" },
  status: { type: String, enum: ['active', 'blocked'], default: 'active' },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Wallet', walletSchema);
