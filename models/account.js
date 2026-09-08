const mongoose = require('mongoose');
const { Schema } = mongoose;

const accountSchema = new Schema(
  {
    customer: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },
    accountNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    balance: {
      type: Number,
      required: true,
      default: 15000, // every account is pre-funded with ₦15,000
      min: 0,
    },
    accountType: {
      type: String,
      enum: ['savings', 'current'],
      default: 'savings',
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const Account = mongoose.model('Account', accountSchema);

module.exports = Account;