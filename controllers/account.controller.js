const Account = require('../models/Account');

// GET /api/accounts/:accountNumber/balance
const getBalance = async (req, res, next) => {
  try {
    const { accountNumber } = req.params;

    const account = await Account.findOne({ accountNumber });

    if (!account) {
      const error = new Error('Account not found');
      error.statusCode = 404;
      throw error;
    }

    res.status(200).json({
      success: true,
      data: {
        accountNumber: account.accountNumber,
        balance: account.balance,
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/accounts/:accountNumber/name-enquiry
const nameEnquiry = async (req, res, next) => {
  try {
    const { accountNumber } = req.params;

    const account = await Account.findOne({ accountNumber }).populate(
      'customer',
      'firstName lastName middleName'
    );

    if (!account) {
      const error = new Error('Account not found');
      error.statusCode = 404;
      throw error;
    }

    res.status(200).json({
      success: true,
      data: {
        accountNumber: account.accountNumber,
        accountName: account.customer.fullName,
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/accounts/:accountNumber
const getAccount = async (req, res, next) => {
  try {
    const { accountNumber } = req.params;

    const account = await Account.findOne({ accountNumber }).populate(
      'customer',
      'firstName lastName middleName email'
    );

    if (!account) {
      const error = new Error('Account not found');
      error.statusCode = 404;
      throw error;
    }

    res.status(200).json({ success: true, data: account });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getBalance,
  nameEnquiry,
  getAccount,
};