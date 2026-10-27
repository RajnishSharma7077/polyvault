const mongoose = require('mongoose');

async function connectDatabase() {
  const { MONGO_URI } = process.env;
  if (!MONGO_URI) {
    throw new Error('MONGO_URI is required');
  }

  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');
}

module.exports = connectDatabase;
