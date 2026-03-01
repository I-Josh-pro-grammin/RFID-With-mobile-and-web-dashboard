require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const mqtt = require('mqtt');
const cors = require('cors');

const Wallet = require('./models/Wallet');
const Transaction = require('./models/Transaction');

const app = express();
app.use(cors());
app.use(express.json());

// --- DATABASE CONNECTION ---
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.error('MongoDB Connection Error:', err));

// --- MQTT CLIENT ---
const mqttClient = mqtt.connect(process.env.MQTT_BROKER);

mqttClient.on('connect', () => {
  console.log('Connected to MQTT Broker');
  mqttClient.subscribe(process.env.TOPIC_SCAN);
});

mqttClient.on('message', async (topic, message) => {
  if (topic === process.env.TOPIC_SCAN) {
    try {
      const data = JSON.parse(message.toString());
      const { rfid_uid } = data;
      console.log(`Scan received for UID: ${rfid_uid}`);

      // SAFE WALLET UPDATE (Atomic Transaction)
      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        let wallet = await Wallet.findOne({ rfidUid: rfid_uid }).session(session);

        if (!wallet) {
          // Auto-create wallet for new tags (for demo purposes)
          wallet = new Wallet({ rfidUid: rfid_uid, balance: 100 });
          await wallet.save({ session });
        }

        // Processing a sample payment of 10 units if balance >= 10
        if (wallet.balance >= 10) {
          wallet.balance -= 10;
          await wallet.save({ session });

          const transaction = new Transaction({
            rfidUid: rfid_uid,
            amount: 10,
            type: 'debit',
            description: 'RFID Payment'
          });
          await transaction.save({ session });

          await session.commitTransaction();
          console.log(`Payment successful for ${rfid_uid}. New balance: ${wallet.balance}`);

          mqttClient.publish(process.env.TOPIC_RESPONSE, JSON.stringify({
            status: 'success',
            rfid_uid,
            balance: wallet.balance,
            message: 'Payment Approved'
          }));
        } else {
          await session.abortTransaction();
          console.log(`Insufficient balance for ${rfid_uid}`);
          mqttClient.publish(process.env.TOPIC_RESPONSE, JSON.stringify({
            status: 'error',
            rfid_uid,
            message: 'Insufficient Balance'
          }));
        }
      } catch (error) {
        await session.abortTransaction();
        throw error;
      } finally {
        session.endSession();
      }

    } catch (err) {
      console.error('MQTT Processing Error:', err);
    }
  }
});

// --- REST API ENDPOINTS ---

// Get all wallets
app.get('/api/wallets', async (req, res) => {
  try {
    const wallets = await Wallet.find();
    res.json(wallets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get transactions
app.get('/api/transactions', async (req, res) => {
  try {
    const transactions = await Transaction.find().sort({ timestamp: -1 }).limit(50);
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Manual balance update (for dashboard)
app.post('/api/wallets/topup', async (req, res) => {
  const { rfidUid, amount } = req.body;
  try {
    const wallet = await Wallet.findOneAndUpdate(
      { rfidUid },
      { $inc: { balance: amount } },
      { new: true }
    );

    const transaction = new Transaction({
      rfidUid,
      amount,
      type: 'credit',
      description: 'Dashboard Top-up'
    });
    await transaction.save();

    res.json({ success: true, wallet });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend API running on port ${PORT}`);
});
