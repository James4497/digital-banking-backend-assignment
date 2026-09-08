const Transaction = require('../models/Transaction');

// GET /api/transactions/:reference
// Looks up a single transaction by its unique reference — used to check
// whether a transfer is still pending, succeeded, or failed.
const getTransactionStatus = async (req, res, next) => {
  try {
    const { reference } = req.params;

    const transaction = await Transaction.findOne({ reference });

    if (!transaction) {
      const error = new Error('Transaction not found');
      error.statusCode = 404;
      throw error;
    }

    res.status(200).json({
      success: true,
      data: {
        reference: transaction.reference,
        type: transaction.type,
        status: transaction.status,
        senderAccountNumber: transaction.senderAccountNumber,
        receiverAccountNumber: transaction.receiverAccountNumber,
        amount: transaction.amount,
        failureReason: transaction.failureReason,
        createdAt: transaction.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/transactions/customer/:customerId
// Returns every transaction a specific customer was involved in, whether
// they were the sender or the receiver.
const getCustomerTransactionHistory = async (req, res, next) => {
  try {
    const { customerId } = req.params;

    const transactions = await Transaction.find({
      $or: [{ senderCustomer: customerId }, { receiverCustomer: customerId }],
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: transactions.length,
      data: transactions,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTransactionStatus,
  getCustomerTransactionHistory,
};