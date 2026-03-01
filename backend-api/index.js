require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const mqtt = require('mqtt');
const cors = require('cors');

const Wallet = require('./models/Wallet');
const Transaction = require('./models/Transaction');
const Product = require('./models/Product');

const app = express();
app.use(cors());
app.use(express.json());

// --- DATABASE CONNECTION ---
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('MongoDB Connected');
    seedProducts();
  })
  .catch(err => console.error('MongoDB Connection Error:', err));

async function seedProducts() {
  const count = await Product.countDocuments();
  if (count === 0) {
    const products = [
      { name: 'Cafeteria Meal', price: 50, category: 'Cafeteria', description: 'Standard lunch meal' },
      { name: 'Black & White Printing', price: 5, category: 'Printing', description: 'Per page price' },
      { name: 'Internet Bundle 1GB', price: 100, category: 'Internet', description: 'High speed monthly data' },
      { name: 'Event Ticket', price: 200, category: 'Event', description: 'Student gala entrance' }
    ];
    await Product.insertMany(products);
    console.log('Products seeded');
  }
}

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
      const { rfid_uid, mode } = data; // mode: 'purchase' or 'topup'
      console.log(`Scan received for UID: ${rfid_uid}, Mode: ${mode || 'purchase'}`);

      const result = await processRfidTransaction(rfid_uid, mode || 'purchase');

      mqttClient.publish(process.env.TOPIC_RESPONSE, JSON.stringify(result));
    } catch (err) {
      console.error('MQTT Processing Error:', err);
    }
  }
});

/**
 * CENTRAL DECISION MAKER: Process RFID Transaction
 * Updated: Removed explicit sessions to support Standalone MongoDB.
 */
async function processRfidTransaction(uid, mode) {
  try {
    let wallet = await Wallet.findOne({ rfidUid: uid });

    if (!wallet) {
      // Auto-create wallet for new tags
      wallet = new Wallet({ rfidUid: uid, balance: 100 });
      await wallet.save();
    }

    if (wallet.status === 'blocked') {
      return { status: 'error', rfid_uid: uid, message: 'Card Blocked' };
    }

    if (mode === 'topup') {
      const topupAmount = 100;
      wallet.balance += topupAmount;
      await wallet.save();

      await new Transaction({
        rfidUid: uid,
        amount: topupAmount,
        type: 'credit',
        description: 'Hardware Top-up',
        status: 'success'
      }).save();

      return { status: 'success', rfid_uid: uid, balance: wallet.balance, message: 'Top-up Complete' };
    } else {
      const price = 50;
      if (wallet.balance >= price) {
        wallet.balance -= price;
        await wallet.save();

        await new Transaction({
          rfidUid: uid,
          amount: price,
          type: 'debit',
          description: 'Cafeteria Purchase',
          status: 'success'
        }).save();

        return { status: 'success', rfid_uid: uid, balance: wallet.balance, message: 'Payment Approved' };
      } else {
        return { status: 'error', rfid_uid: uid, message: 'Insufficient Balance' };
      }
    }
  } catch (error) {
    console.error('Transaction failed:', error);
    return { status: 'error', message: 'Internal Error' };
  }
}

// --- REST API ENDPOINTS ---

app.get('/api/stats', async (req, res) => {
  try {
    const totalWallets = await Wallet.countDocuments();
    const activeWallets = await Wallet.countDocuments({ status: 'active' });
    const totalTransactions = await Transaction.countDocuments();
    res.json({ totalWallets, activeWallets, totalTransactions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/wallets', async (req, res) => {
  try {
    const wallets = await Wallet.find().sort({ updatedAt: -1 });
    res.json(wallets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find({ isActive: true });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/transactions', async (req, res) => {
  try {
    const transactions = await Transaction.find().sort({ timestamp: -1 }).limit(100);
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/wallets/status', async (req, res) => {
  const { rfidUid, status } = req.body;
  try {
    const wallet = await Wallet.findOneAndUpdate({ rfidUid }, { status }, { new: true });
    res.json({ success: true, wallet });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/wallets/replace', async (req, res) => {
  const { oldUid, newUid } = req.body;
  try {
    const oldWallet = await Wallet.findOne({ rfidUid: oldUid });
    if (!oldWallet) return res.status(404).json({ error: 'Old wallet not found' });

    const newWallet = new Wallet({
      rfidUid: newUid,
      balance: oldWallet.balance,
      userName: oldWallet.userName,
      teamId: oldWallet.teamId,
      status: 'active'
    });
    await newWallet.save();

    oldWallet.status = 'blocked';
    oldWallet.balance = 0;
    await oldWallet.save();

    await Transaction.updateMany({ rfidUid: oldUid }, { rfidUid: newUid });

    res.json({ success: true, message: 'Balance and history transferred' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/wallets/topup', async (req, res) => {
  const { rfidUid, amount } = req.body;
  try {
    const wallet = await Wallet.findOneAndUpdate(
      { rfidUid },
      { $inc: { balance: amount } },
      { new: true }
    );

    await new Transaction({
      rfidUid,
      amount,
      type: 'credit',
      description: 'Dashboard Top-up',
      status: 'success'
    }).save();

    res.json({ success: true, wallet });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/purchase', async (req, res) => {
  const { rfidUid, productId, quantity } = req.body;
  try {
    const wallet = await Wallet.findOne({ rfidUid });
    const product = await Product.findById(productId);

    if (!wallet || wallet.status === 'blocked') throw new Error('Invalid or Blocked Wallet');
    if (!product) throw new Error('Product not found');

    const totalCost = product.price * (quantity || 1);
    if (wallet.balance < totalCost) throw new Error('Insufficient Balance');

    wallet.balance -= totalCost;
    await wallet.save();

    await new Transaction({
      rfidUid,
      amount: totalCost,
      type: 'debit',
      description: `Purchase: ${product.name} (x${quantity || 1})`,
      productId: product._id,
      status: 'success'
    }).save();

    res.json({ success: true, balance: wallet.balance });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`E-Commerce Backend running on port ${PORT}`);
});
