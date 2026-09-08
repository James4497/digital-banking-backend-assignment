const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { Schema } = mongoose;

const customerSchema = new Schema(
  {
    customerNumber: {
      type: String,
      required: [true, 'Customer number is required'],
      unique: true,
      trim: true,
      uppercase: true,
      immutable: true, // set once at creation, never changed after
    },
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      maxlength: 50,
    },
    middleName: {
      type: String,
      trim: true,
      maxlength: 50,
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      maxlength: 50,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email'],
    },
    phoneNumber: {
      type: String,
      required: [true, 'Phone number is required'],
      unique: true,
      trim: true,
      match: [/^\+?[1-9]\d{7,14}$/, 'Please enter a valid phone number'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 8,
      select: false, // never returned in queries by default
    },
    bvn: {
  type: String,
  required: [
    function () {
      return !this.nin;
    },
    'Either bvn or nin is required',
  ],
  unique: true,
  trim: true,
  minlength: 11,
  maxlength: 11,
  sparse: true, // allows multiple docs to have no bvn without unique-index conflicts
},
nin: {
  type: String,
  required: [
    function () {
      return !this.bvn;
    },
    'Either bvn or nin is required',
  ],
  unique: true,
  trim: true,
  minlength: 11,
  maxlength: 11,
  sparse: true,
},

    dateOfBirth: {
      type: Date,
      required: [true, 'Date of birth is required'],
      validate: {
        validator: (date) => date < new Date(),
        message: 'Date of birth must be in the past',
      },
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
    },
    address: {
      line1: { type: String, required: true, trim: true, maxlength: 100 },
      line2: { type: String, trim: true, maxlength: 100 },
      city: { type: String, required: true, trim: true, maxlength: 50 },
      state: { type: String, required: true, trim: true, maxlength: 50 },
      postalCode: { type: String, trim: true, maxlength: 20 },
      country: { type: String, trim: true, maxlength: 50, default: 'Nigeria' },
    },
    // References to this customer's account(s) — kept separate from Customer
    // so account balances/transactions live in their own collection.
    accounts: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Account',
      },
    ],
    status: {
      type: String,
      enum: ['pending', 'active', 'suspended', 'closed'],
      default: 'pending',
    },
    kycStatus: {
      type: String,
      enum: ['not_started', 'pending', 'verified', 'rejected'],
      default: 'not_started',
    },
    kycVerifiedAt: Date,
    occupation: {
      type: String,
      trim: true,
      maxlength: 100,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

customerSchema.index({ lastName: 1, firstName: 1 });

// Auto-generate customerNumber before validation, only if not already set.
customerSchema.pre('validate', function () {
  if (!this.customerNumber) {
    this.customerNumber = `CUS${Date.now().toString().slice(-8)}`;
  }
});

// Hash password before saving, only if it was modified
customerSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Instance method to compare login password with hashed one
customerSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Virtual for full name, handy in responses
customerSchema.virtual('fullName').get(function () {
  return [this.firstName, this.middleName, this.lastName].filter(Boolean).join(' ');
});

customerSchema.set('toJSON', { virtuals: true });

const Customer = mongoose.model('Customer', customerSchema);

module.exports = Customer;