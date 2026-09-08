const mongoose = require('mongoose');
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');
const nibssService = require('../services/nibss.service');

// POST /api/transfers/intra-bank
// Moves money between two accounts that both exist within SmartFunds Bank.
// Uses a Mongoose session so the debit and credit either both succeed or
// both roll back — prevents money vanishing or duplicating if something
// fails halfway through.
const intraBankTransfer = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { senderAccountNumber, receiverAccountNumber, amount } = req.body;

    if (!senderAccountNumber || !receiverAccountNumber || !amount) {
      const error = new Error(
        'senderAccountNumber, receiverAccountNumber, and amount are required'
      );
      error.statusCode = 400;
      throw error;
    }

    if (amount <= 0) {
      const error = new Error('Amount must be greater than zero');
      error.statusCode = 400;
      throw error;
    }

    if (senderAccountNumber === receiverAccountNumber) {
      const error = new Error('Sender and receiver accounts cannot be the same');
      error.statusCode = 400;
      throw error;
    }

    const senderAccount = await Account.findOne({
      accountNumber: senderAccountNumber,
    }).session(session);

    const receiverAccount = await Account.findOne({
      accountNumber: receiverAccountNumber,
    }).session(session);

    if (!senderAccount || !receiverAccount) {
      const error = new Error('Sender or receiver account not found');
      error.statusCode = 404;
      throw error;
    }

    if (senderAccount.balance < amount) {
      const error = new Error('Insufficient funds');
      error.statusCode = 400;
      throw error;
    }

    senderAccount.balance -= amount;
    receiverAccount.balance += amount;

    await senderAccount.save({ session });
    await receiverAccount.save({ session });

    const transaction = await Transaction.create(
      [
        {
          type: 'intra-bank',
          senderCustomer: senderAccount.customer,
          receiverCustomer: receiverAccount.customer,
          senderAccount: senderAccount._id,
          receiverAccount: receiverAccount._id,
          senderAccountNumber: senderAccount.accountNumber,
          receiverAccountNumber: receiverAccount.accountNumber,
          amount,
          status: 'successful',
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      success: true,
      message: 'Transfer successful',
      data: {
        senderAccountNumber: senderAccount.accountNumber,
        senderBalance: senderAccount.balance,
        receiverAccountNumber: receiverAccount.accountNumber,
        amount,
        reference: transaction[0].reference,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

// POST /api/transfers/inter-bank
// Sends money to an account at another bank via the NibssByPhoenix network.
// The local debit happens inside a Mongoose transaction; if the external
// call to NibssByPhoenix fails, that debit is rolled back so the customer's
// money never leaves their account without the transfer actually going through.
const interBankTransfer = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { senderAccountNumber, receiverAccountNumber, amount } = req.body;

    if (!senderAccountNumber || !receiverAccountNumber || !amount) {
      const error = new Error(
        'senderAccountNumber, receiverAccountNumber, and amount are required'
      );
      error.statusCode = 400;
      throw error;
    }

    if (amount <= 0) {
      const error = new Error('Amount must be greater than zero');
      error.statusCode = 400;
      throw error;
    }

    const senderAccount = await Account.findOne({
      accountNumber: senderAccountNumber,
    }).session(session);

    if (!senderAccount) {
      const error = new Error('Sender account not found');
      error.statusCode = 404;
      throw error;
    }

    if (senderAccount.balance < amount) {
      const error = new Error('Insufficient funds');
      error.statusCode = 400;
      throw error;
    }

    // Debit the sender locally first
    senderAccount.balance -= amount;
    await senderAccount.save({ session });

    // Log the transaction as pending before calling out to NibssByPhoenix —
    // this way, even if the external call fails, we have a record showing
    // what was attempted.
    const transaction = await Transaction.create(
      [
        {
          type: 'inter-bank',
          senderCustomer: senderAccount.customer,
          senderAccount: senderAccount._id,
          senderAccountNumber: senderAccount.accountNumber,
          receiverAccountNumber,
          amount,
          status: 'pending',
        },
      ],
      { session }
    );

    let nibssResponse;
    try {
      nibssResponse = await nibssService.transferFunds(
        senderAccountNumber,
        receiverAccountNumber,
        amount
      );
    } catch (nibssError) {
      // Roll back the local debit — this also erases the 'pending'
      // Transaction document we created above, since it was part of
      // the same session.
      console.log('NIBSS ERROR STATUS:', nibssError.response?.status);
      console.log('NIBSS ERROR DATA:', nibssError.response?.data);
      console.log('NIBSS ERROR MESSAGE:', nibssError.message);
      await session.abortTransaction();
      session.endSession();

      // Create a fresh, standalone record of the failure (outside any
      // session, since the transaction session is already closed).
      await Transaction.create({
        type: 'inter-bank',
        senderCustomer: senderAccount.customer,
        senderAccount: senderAccount._id,
        senderAccountNumber: senderAccount.accountNumber,
        receiverAccountNumber,
        amount,
        status: 'failed',
        failureReason: nibssError.message,
        providerResponse: nibssError.response?.data || null,
      });

      const error = new Error('Inter-bank transfer failed at provider');
      error.statusCode = 502;
      throw error;
    }

    // NibssByPhoenix confirmed the transfer — mark it successful and commit.
    transaction[0].status = 'successful';
    transaction[0].providerResponse = nibssResponse;
    await transaction[0].save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      success: true,
      message: 'Inter-bank transfer successful',
      data: {
        senderAccountNumber: senderAccount.accountNumber,
        senderBalance: senderAccount.balance,
        receiverAccountNumber,
        amount,
        reference: transaction[0].reference,
      },
    });
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    session.endSession();
    next(error);
  }
};

module.exports = {
  intraBankTransfer,
  interBankTransfer,
};