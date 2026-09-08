const express = require('express');
const router = express.Router();
const {
  getTransactionStatus,
  getCustomerTransactionHistory,
} = require('../controllers/transaction.controller');

router.get('/customer/:customerId', getCustomerTransactionHistory);
router.get('/:reference', getTransactionStatus);

module.exports = router;