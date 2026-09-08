require('dotenv').config();

const app = require('./app');
const connectDB = require('./configs/db');

const PORT = process.env.PORT || 8000;

// Connect to MongoDB first, then only start listening once that succeeds —
// avoids accepting requests before the database is actually ready.
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});