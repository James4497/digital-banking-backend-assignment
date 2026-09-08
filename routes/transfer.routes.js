const express = require('express');
const router = express.Router();
const { intraBankTransfer, interBankTransfer } = require('../controllers/transfer.controller');

router.post('/intra-bank', intraBankTransfer);
router.post('/inter-bank', interBankTransfer);

module.exports = router;