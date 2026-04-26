const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { protect } = require('../middleware/auth');

// POST /api/transactions/send
router.post('/send', protect, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { receiverUpiId, amount, note, mpin } = req.body;

    if (!receiverUpiId || !amount || !mpin) {
      return res.status(400).json({ error: 'Receiver UPI ID, amount, and MPIN are required' });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount < 1) {
      return res.status(400).json({ error: 'Enter a valid amount (minimum ₹1)' });
    }
    if (parsedAmount > 100000) {
      return res.status(400).json({ error: 'Maximum transaction limit is ₹1,00,000' });
    }

    // Verify MPIN
    const sender = await User.findById(req.user._id);
    if (sender.isAccountLocked()) {
      return res.status(423).json({ error: 'Account is locked' });
    }

    const mpinValid = await sender.compareMpin(mpin);
    if (!mpinValid) {
      sender.failedMpinAttempts += 1;
      if (sender.failedMpinAttempts >= 5) {
        sender.isLocked = true;
        sender.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
      }
      await sender.save();
      return res.status(401).json({ error: 'Incorrect MPIN' });
    }

    // Can't send to yourself
    if (sender.upiId === receiverUpiId) {
      return res.status(400).json({ error: 'You cannot send money to yourself' });
    }

    // Check receiver exists
    const receiver = await User.findOne({ upiId: receiverUpiId });
    if (!receiver) {
      return res.status(404).json({ error: 'Receiver not found. Check UPI ID and try again' });
    }

    // Check balance
    if (sender.balance < parsedAmount) {
      return res.status(400).json({ error: `Insufficient balance. Your balance is ₹${sender.balance.toFixed(2)}` });
    }

    // Debit sender, credit receiver
    sender.balance -= parsedAmount;
    receiver.balance += parsedAmount;
    sender.failedMpinAttempts = 0;

    await sender.save({ session });
    await receiver.save({ session });

    // Create transaction record
    const transaction = await Transaction.create(
      [
        {
          sender: sender._id,
          receiver: receiver._id,
          amount: parsedAmount,
          note: note || '',
          status: 'success',
          type: 'send',
        },
      ],
      { session }
    );

    await session.commitTransaction();

    const populatedTx = await Transaction.findById(transaction[0]._id)
      .populate('sender', 'name upiId')
      .populate('receiver', 'name upiId');

    // Real-time notification to receiver
    const onlineUsers = req.app.get('onlineUsers');
    const receiverSocketId = onlineUsers.get(receiver._id.toString());
    if (receiverSocketId) {
      req.io.to(receiverSocketId).emit('transaction:received', {
        from: sender.name,
        amount: parsedAmount,
        note: note || '',
        transactionId: populatedTx.transactionId,
        newBalance: receiver.balance,
      });
    }

    res.status(201).json({
      message: 'Payment successful',
      transaction: populatedTx,
      newBalance: sender.balance,
    });
  } catch (err) {
    await session.abortTransaction();
    console.error(err);
    res.status(500).json({ error: 'Transaction failed. Please try again' });
  } finally {
    session.endSession();
  }
});

// GET /api/transactions/history
router.get('/history', protect, async (req, res) => {
  try {
    const { page = 1, limit = 20, type } = req.query;

    const query = {
      $or: [{ sender: req.user._id }, { receiver: req.user._id }],
    };

    if (type === 'sent') query.sender = req.user._id;
    if (type === 'received') query.receiver = req.user._id;

    const transactions = await Transaction.find(query)
      .populate('sender', 'name upiId')
      .populate('receiver', 'name upiId')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Transaction.countDocuments(query);

    res.json({
      transactions,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/transactions/:id
router.get('/:id', protect, async (req, res) => {
  try {
    const transaction = await Transaction.findOne({
      transactionId: req.params.id,
      $or: [{ sender: req.user._id }, { receiver: req.user._id }],
    })
      .populate('sender', 'name upiId phone')
      .populate('receiver', 'name upiId phone');

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json(transaction);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
