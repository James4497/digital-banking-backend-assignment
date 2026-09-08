// Central error handler — catches every error passed via next(error)
// from anywhere in the app and returns a consistent JSON response.
const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Something went wrong on the server';

  console.error(err); // helpful while developing — shows the full error in your terminal

  res.status(statusCode).json({
    success: false,
    message,
  });
};

module.exports = errorHandler;