const mongoose = require('mongoose');
const Customer = require('../models/Custormer');
const Account = require('../models/Account');
const nibssService = require('../services/nibss.service');

// POST /api/customers/onboard
// Verifies the customer's BVN or NIN with NibssByPhoenix, creates a
// matching account on their side (which returns the account number and
// pre-funded balance), then creates the local Customer + Account records
// using that same account number — so the account exists on both systems
// and inter-bank transfers can find it.
const onboardCustomer = async (req, res, next) => {
  try {
    const {
      firstName,
      middleName,
      lastName,
      email,
      phoneNumber,
      password,
      bvn,
      nin,
      dateOfBirth,
      gender,
      address,
      occupation,
    } = req.body;

    if (!firstName || !lastName || !email || !phoneNumber || !password || !dateOfBirth) {
      const error = new Error(
        'firstName, lastName, email, phoneNumber, password, and dateOfBirth are required'
      );
      error.statusCode = 400;
      throw error;
    }

    if (!bvn && !nin) {
      const error = new Error('Either bvn or nin is required');
      error.statusCode = 400;
      throw error;
    }

    let kycType;
    let kycID;

    if (bvn) {
      try {
        await nibssService.insertBvn(bvn, firstName, lastName, dateOfBirth, phoneNumber);
      } catch (bvnError) {
        const error = new Error(
          bvnError.response?.data?.message || 'BVN verification failed'
        );
        error.statusCode = 422;
        throw error;
      }
      kycType = 'bvn';
      kycID = bvn;
    } else {
      try {
        await nibssService.insertNin(nin, firstName, lastName, dateOfBirth);
        await nibssService.validateNin(nin);
      } catch (ninError) {
        const error = new Error(
          ninError.response?.data?.message || 'NIN verification failed'
        );
        error.statusCode = 422;
        throw error;
      }
      kycType = 'nin';
      kycID = nin;
    }

    let nibssAccount;
    try {
      const result = await nibssService.createAccount(kycType, kycID, dateOfBirth);
      nibssAccount = result.account;
    } catch (accountError) {
      const error = new Error(
        accountError.response?.data?.message || 'Account creation failed at provider'
      );
      error.statusCode = 502;
      throw error;
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const customer = await Customer.create(
        [
          {
            firstName,
            middleName,
            lastName,
            email,
            phoneNumber,
            password,
            bvn,
            nin,
            dateOfBirth,
            gender,
            address,
            occupation,
            status: 'active',
          },
        ],
        { session }
      );

      const account = await Account.create(
        [
          {
            customer: customer[0]._id,
            accountNumber: nibssAccount.accountNumber,
            balance: nibssAccount.balance,
          },
        ],
        { session }
      );

      customer[0].accounts.push(account[0]._id);
      await customer[0].save({ session });

      await session.commitTransaction();
      session.endSession();

      res.status(201).json({
        success: true,
        message: 'Customer onboarded successfully',
        data: {
          customerId: customer[0]._id,
          fullName: customer[0].fullName,
          accountNumber: account[0].accountNumber,
          balance: account[0].balance,
        },
      });
    } catch (dbError) {
      await session.abortTransaction();
      session.endSession();

      if (dbError.code === 11000) {
        const field = Object.keys(dbError.keyPattern)[0];
        const friendlyError = new Error(`A customer with this ${field} already exists`);
        friendlyError.statusCode = 409;
        return next(friendlyError);
      }

      throw dbError;
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  onboardCustomer,
};