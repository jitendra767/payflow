const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [1, 'Minimum amount is ₹1'],
      max: [100000, 'Maximum amount is ₹1,00,000 per transaction'],
    },
    note: {
      type: String,
      trim: true,
      maxlength: 100,
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'success', 'failed'],
      default: 'pending',
    },
    transactionId: {
      type: String,
      unique: true,
    },
    type: {
      type: String,
      enum: ['send', 'receive', 'request'],
      default: 'send',
    },
  },
  { timestamps: true }
);

// Auto-generate transaction ID
transactionSchema.pre('save', function (next) {
  if (!this.transactionId) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substr(2, 6).toUpperCase();
    this.transactionId = `PF${timestamp}${random}`;
  }
  next();
});

module.exports = mongoose.model('Transaction', transactionSchema);
