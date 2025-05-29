// models.js
// Defines and exports Mongoose models for chat messages and call logs

const mongoose = require('./db');

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

const Chat = mongoose.model('Chat', chatSchema);
const CallLog = mongoose.model('CallLog', callLogSchema);
const VideoLog = mongoose.model('VideoLog', videoLogSchema);

module.exports = { Chat, CallLog, VideoLog };
