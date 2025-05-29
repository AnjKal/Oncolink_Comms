// db.js
// MongoDB connection setup
// You need to replace <YOUR_MONGODB_URI> with your actual MongoDB connection string.

const mongoose = require('mongoose');

const mongoURI = 'mongodb://127.0.0.1:27017/myappdb'; // <-- Use IPv4 to avoid connection issues

mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

module.exports = mongoose;
