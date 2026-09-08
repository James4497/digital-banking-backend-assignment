const mongoose = require('mongoose');
const { Schema } = mongoose;

const transactionSchema = new Schema(
  {
    reference: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['intra-bank', 'inter-bank'],
      required: true,
    },
    // Kept separate from senderAccount/receiverAccount so we can quickly
    // filter "give me everything customer X was involved in" without
    // having to look up account ownership every time — this is what
    // enforces strict per-customer data isolation on the history endpoint.
    senderCustomer: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },
    receiverCustomer: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      // not required — inter-bank receivers won't have a Customer doc
      // in this database, only an account number from the other bank
    },
    senderAccount: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
    },
    // For intra-bank transfers this points to a real Account doc.
    // For inter-bank transfers there's no local Account, so we fall back
    // to storing the raw account number/bank code instead.
    receiverAccount: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
    },
    senderAccountNumber: {
      type: String,
      required: true,
      trim: true,
    },
    receiverAccountNumber: {
      type: String,
      required: true,
      trim: true,
    },
    receiverBankCode: {
      type: String,
      trim: true, // only relevant for inter-bank transfers
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    status: {
      type: String,
      enum: ['pending', 'successful', 'failed', 'reversed'],
      default: 'pending',
    },
    failureReason: {
      type: String,
      trim: true,
    },
    // Raw response from NibssByPhoenix for inter-bank transfers — handy
    // for debugging and for the "transaction status check" requirement.
    providerResponse: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Speeds up "get this customer's transaction history" queries, and keeps
// each customer's results properly isolated from everyone else's.
transactionSchema.index({ senderCustomer: 1, createdAt: -1 });
transactionSchema.index({ receiverCustomer: 1, createdAt: -1 });

// Auto-generate a reference before validation, if one wasn't provided.
transactionSchema.pre('validate', function () {
  if (!this.reference) {
    this.reference = `TXN${Date.now()}${Math.floor(Math.random() * 1000)}`;
  }
});

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;