const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: 2,
      maxlength: 50,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      unique: true,
      match: [/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      match: [/\S+@\S+\.\S+/, 'Enter a valid email'],
    },
    upiId: {
      type: String,
      unique: true,
    },
    mpin: {
      type: String,
      required: [true, 'MPIN is required'],
      minlength: 6,
    },
    balance: {
      type: Number,
      default: 10000, // New users get ₹10,000 virtual money
    },
    failedMpinAttempts: {
      type: Number,
      default: 0,
    },
    isLocked: {
      type: Boolean,
      default: false,
    },
    lockUntil: {
      type: Date,
    },
    avatar: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

// Auto-generate UPI ID before saving
userSchema.pre('save', async function (next) {
  // Generate UPI ID from name
  if (!this.upiId) {
    const base = this.name.toLowerCase().replace(/\s+/g, '').slice(0, 10);
    const suffix = Math.floor(1000 + Math.random() * 9000);
    this.upiId = `${base}${suffix}@payflow`;
  }

  // Hash MPIN only if modified
  if (!this.isModified('mpin')) return next();
  const salt = await bcrypt.genSalt(12);
  this.mpin = await bcrypt.hash(this.mpin, salt);
  next();
});

// Compare MPIN
userSchema.methods.compareMpin = async function (enteredMpin) {
  return bcrypt.compare(enteredMpin, this.mpin);
};

// Check if account is locked
userSchema.methods.isAccountLocked = function () {
  if (this.isLocked && this.lockUntil && this.lockUntil > Date.now()) {
    return true;
  }
  if (this.isLocked && this.lockUntil && this.lockUntil <= Date.now()) {
    this.isLocked = false;
    this.failedMpinAttempts = 0;
    this.lockUntil = undefined;
    this.save();
  }
  return false;
};

module.exports = mongoose.model('User', userSchema);
