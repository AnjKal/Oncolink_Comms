// db.js
// MongoDB connection setup with MongoDB Atlas support
require('dotenv').config();
const mongoose = require('mongoose');

// Get MongoDB URI from environment variables or use local fallback
const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/myappdb';

// Connection options
const options = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
  socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
};

// MongoDB connection function
const connectDB = async () => {
  try {
    await mongoose.connect(mongoURI, options);
    console.log(`MongoDB connected to ${mongoURI.includes('mongodb+srv') ? 'Atlas' : 'local'} database`);
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    // Exit process with failure
    process.exit(1);
  }
};

// Handle connection events
mongoose.connection.on('connected', () => {
  console.log('Mongoose connected to DB');
});

mongoose.connection.on('error', (err) => {
  console.error('Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('Mongoose connection disconnected');
});

// If the Node process ends, close the Mongoose connection
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('Mongoose connection closed through app termination');
  process.exit(0);
});

// Export both mongoose and connectDB
module.exports = { mongoose, connectDB };
