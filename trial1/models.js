// models.js
// Defines and exports Mongoose models for chat messages, call logs, and users

// Import mongoose from db.js
const { mongoose } = require('./db');
if (!mongoose) {
  console.error('Mongoose not properly imported from db.js');
  process.exit(1);
}
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Chat message schema
const chatSchema = new mongoose.Schema({
  name: { type: String, required: true },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

// Call log schema for voice calls
const callLogSchema = new mongoose.Schema({
  name: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
}, { collection: 'calllogs' });

// Call log schema for video calls
const videoLogSchema = new mongoose.Schema({
  name: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
}, { collection: 'videologs' });

// User schema
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['doctor', 'patient'], required: true },
  username: { type: String, required: true, trim: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// File schema for patient-doctor file sharing
const fileSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  url: { type: String, required: true },
  public_id: { type: String, required: true },
  format: { type: String, required: true },
  size: { type: Number, required: true },
  patientEmail: { type: String, required: true },
  doctorEmail: { type: String, required: true },
  description: { type: String },
  status: { 
    type: String, 
    enum: ['uploaded', 'reviewed', 'archived'], 
    default: 'uploaded' 
  },
  uploadDate: { type: Date, default: Date.now }
}, { timestamps: true });

// Appointment schema
const appointmentSchema = new mongoose.Schema({
  patientEmail: { type: String, required: true },
  doctorEmail: { type: String, required: true },
  date: { type: Date, required: true },
  time: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'confirmed', 'cancelled', 'completed'], 
    default: 'pending' 
  },
  notes: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Query/Message schema
const querySchema = new mongoose.Schema({
  from: { type: String, required: true },
  to: { type: String, required: true },
  message: { type: String, required: true },
  response: { type: String },
  status: { 
    type: String, 
    enum: ['unread', 'read', 'replied'], 
    default: 'unread' 
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  this.updatedAt = Date.now();
  next();
});

// Generate JWT token
userSchema.methods.generateAuthToken = function() {
  return jwt.sign(
    { _id: this._id, email: this.email, role: this.role },
    process.env.JWT_SECRET || 'your_jwt_secret',
    { expiresIn: '24h' }
  );
};

// Method to verify password
userSchema.methods.verifyPassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

const Chat = mongoose.model('Chat', chatSchema);
const CallLog = mongoose.model('CallLog', callLogSchema);
const VideoLog = mongoose.model('VideoLog', videoLogSchema);
const User = mongoose.model('User', userSchema);
const File = mongoose.model('File', fileSchema);
const Appointment = mongoose.model('Appointment', appointmentSchema);
const Query = mongoose.model('Query', querySchema);

module.exports = { 
  Chat, 
  CallLog, 
  VideoLog, 
  User, 
  File, 
  Appointment, 
  Query 
};
