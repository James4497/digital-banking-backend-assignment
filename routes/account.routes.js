const express = require('express');
const router = express.Router();
const { getBalance, nameEnquiry, getAccount } = require('../controllers/account.controller');

router.get('/:accountNumber/balance', getBalance);
router.get('/:accountNumber/name-enquiry', nameEnquiry);
router.get('/:accountNumber', getAccount);

module.exports = router;