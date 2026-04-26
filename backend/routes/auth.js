const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const OTP = require('../models/OTP');
const { generateOTP, sendOTPEmail } = require('../services/email');

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

router.post('/register', async (req, res) => {
  try {
    const { name, phone, email, mpin } = req.body;
    if (!name || !phone || !email || !mpin) return res.status(400).json({ error: 'All fields are required' });
    if (mpin.length !== 6 || !/^\d{6}$/.test(mpin)) return res.status(400).json({ error: 'MPIN must be exactly 6 digits' });
    if (!/^[6-9]\d{9}$/.test(phone)) return res.status(400).json({ error: 'Enter a valid 10-digit Indian mobile number' });
    if (!/\S+@\S+\.\S+/.test(email)) return res.status(400).json({ error: 'Enter a valid email address' });
    const existingUser = await User.findOne({ $or: [{ phone }, { email }] });
    if (existingUser) return res.status(400).json({ error: existingUser.phone === phone ? 'Phone number already registered' : 'Email already registered' });
    await OTP.deleteMany({ email, purpose: 'register' });
    const otp = generateOTP();
    await sendOTPEmail(email, otp, 'register', name);
    await OTP.create({ email, otp, purpose: 'register', expiresAt: new Date(Date.now() + 5 * 60 * 1000) });
    res.status(200).json({ message: `OTP sent to ${email}. Please verify to complete registration.`, email });
  } catch (err) {
    console.error('Register error:', err);
    if (err.code === 'EAUTH') return res.status(500).json({ error: 'Email service error. Check Gmail credentials in .env' });
    res.status(500).json({ error: 'Server error, please try again' });
  }
});

router.post('/verify-register', async (req, res) => {
  try {
    const { name, phone, email, mpin, otp } = req.body;
    if (!otp || otp.length !== 6) return res.status(400).json({ error: 'Enter the 6-digit OTP sent to your email' });
    const otpRecord = await OTP.findOne({ email, purpose: 'register', verified: false });
    if (!otpRecord) return res.status(400).json({ error: 'OTP expired or not found. Please register again' });
    if (otpRecord.expiresAt < new Date()) { await OTP.deleteMany({ email, purpose: 'register' }); return res.status(400).json({ error: 'OTP has expired. Please register again' }); }
    if (otpRecord.otp !== otp) return res.status(400).json({ error: 'Incorrect OTP. Please try again' });
    await OTP.deleteMany({ email, purpose: 'register' });
    const user = await User.create({ name, phone, email, mpin });
    res.status(201).json({ message: 'Account created successfully! Welcome to PayFlow 🎉', token: generateToken(user._id), user: { _id: user._id, name: user.name, phone: user.phone, email: user.email, upiId: user.upiId, balance: user.balance } });
  } catch (err) {
    console.error('Verify register error:', err);
    if (err.name === 'ValidationError') { const messages = Object.values(err.errors).map((e) => e.message); return res.status(400).json({ error: messages[0] }); }
    res.status(500).json({ error: 'Server error, please try again' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { phone, mpin } = req.body;
    if (!phone || !mpin) return res.status(400).json({ error: 'Phone and MPIN are required' });
    const user = await User.findOne({ phone });
    if (!user) return res.status(401).json({ error: 'No account found with this phone number' });
    if (user.isAccountLocked()) { const remaining = Math.ceil((user.lockUntil - Date.now()) / 60000); return res.status(423).json({ error: `Account locked. Try again in ${remaining} minute(s)` }); }
    const isMatch = await user.compareMpin(mpin);
    if (!isMatch) {
      user.failedMpinAttempts += 1;
      if (user.failedMpinAttempts >= 5) { user.isLocked = true; user.lockUntil = new Date(Date.now() + 15 * 60 * 1000); }
      await user.save();
      const attemptsLeft = 5 - user.failedMpinAttempts;
      return res.status(401).json({ error: attemptsLeft > 0 ? `Incorrect MPIN. ${attemptsLeft} attempt(s) left` : 'Account locked for 15 minutes' });
    }
    await OTP.deleteMany({ email: user.email, purpose: 'login' });
    const otp = generateOTP();
    await sendOTPEmail(user.email, otp, 'login', user.name);
    await OTP.create({ email: user.email, otp, purpose: 'login', expiresAt: new Date(Date.now() + 5 * 60 * 1000) });
    user.failedMpinAttempts = 0; user.isLocked = false;
    await user.save();
    res.json({ message: `OTP sent to ${user.email}. Please verify to login.`, email: user.email });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error, please try again' });
  }
});

router.post('/verify-login', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!otp || otp.length !== 6) return res.status(400).json({ error: 'Enter the 6-digit OTP sent to your email' });
    const otpRecord = await OTP.findOne({ email, purpose: 'login', verified: false });
    if (!otpRecord) return res.status(400).json({ error: 'OTP expired or not found. Please login again' });
    if (otpRecord.expiresAt < new Date()) { await OTP.deleteMany({ email, purpose: 'login' }); return res.status(400).json({ error: 'OTP has expired. Please login again' }); }
    if (otpRecord.otp !== otp) return res.status(400).json({ error: 'Incorrect OTP. Please try again' });
    await OTP.deleteMany({ email, purpose: 'login' });
    const user = await User.findOne({ email });
    res.json({ message: 'Login successful', token: generateToken(user._id), user: { _id: user._id, name: user.name, phone: user.phone, email: user.email, upiId: user.upiId, balance: user.balance } });
  } catch (err) {
    console.error('Verify login error:', err);
    res.status(500).json({ error: 'Server error, please try again' });
  }
});

router.post('/resend-otp', async (req, res) => {
  try {
    const { email, purpose, name } = req.body;
    const user = await User.findOne({ email });
    const userName = name || user?.name || 'User';
    await OTP.deleteMany({ email, purpose });
    const otp = generateOTP();
    await sendOTPEmail(email, otp, purpose, userName);
    await OTP.create({ email, otp, purpose, expiresAt: new Date(Date.now() + 5 * 60 * 1000) });
    res.json({ message: `New OTP sent to ${email}` });
  } catch (err) {
    console.error('Resend OTP error:', err);
    res.status(500).json({ error: 'Failed to resend OTP' });
  }
});

module.exports = router;
