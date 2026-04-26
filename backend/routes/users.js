const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// GET /api/users/me — get current user profile
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-mpin -failedMpinAttempts -isLocked -lockUntil');
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/users/search?q=upiId or phone
router.get('/search', protect, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 3) {
      return res.status(400).json({ error: 'Enter at least 3 characters to search' });
    }

    const query = q.trim().toLowerCase();
    const user = await User.findOne({
      $or: [
        { upiId: query },
        { phone: query },
      ],
      _id: { $ne: req.user._id }, // exclude self
    }).select('name upiId phone avatar');

    if (!user) {
      return res.status(404).json({ error: 'No user found with this UPI ID or phone number' });
    }

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/users/change-mpin
router.patch('/change-mpin', protect, async (req, res) => {
  try {
    const { currentMpin, newMpin } = req.body;

    if (!currentMpin || !newMpin) {
      return res.status(400).json({ error: 'Both current and new MPIN are required' });
    }

    if (!/^\d{6}$/.test(newMpin)) {
      return res.status(400).json({ error: 'New MPIN must be exactly 6 digits' });
    }

    const user = await User.findById(req.user._id);
    const isMatch = await user.compareMpin(currentMpin);

    if (!isMatch) {
      return res.status(401).json({ error: 'Current MPIN is incorrect' });
    }

    user.mpin = newMpin;
    await user.save();

    res.json({ message: 'MPIN changed successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
