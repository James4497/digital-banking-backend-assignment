const express = require('express');
const app = express();

// Parse incoming JSON request bodies
app.use(express.json());

// Route mounting
const accountRoutes = require('./routes/account.routes');
const customerRoutes = require('./routes/customer.routes');
const transferRoutes = require('./routes/transfer.routes');
const transactionRoutes = require('./routes/transaction.routes');

app.use('/api/accounts', accountRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/transfers', transferRoutes);
app.use('/api/transactions', transactionRoutes);

// Central error handler — must be registered last, after all routes
const errorHandler = require('./controllers/errorHandler.controller');
app.use(errorHandler);

module.exports = app;