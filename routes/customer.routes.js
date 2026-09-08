const express = require('express');
const router = express.Router();
const { onboardCustomer } = require('../controllers/customer.controller');

router.post('/onboard', onboardCustomer);

module.exports = router;