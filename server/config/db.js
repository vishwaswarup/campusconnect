const mongoose = require('mongoose');
const config = require('./index');

mongoose.set('strictQuery', true);

async function connectDB(uri = config.mongoUri) {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
  return mongoose.connection;
}

module.exports = connectDB;
