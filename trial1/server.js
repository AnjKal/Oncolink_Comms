const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const mongoose = require('./db'); // Import MongoDB connection
const { Chat, CallLog, VideoLog, User } = require('./models'); // Import models

const app = express();
app.use(express.json());
const server = http.createServer(app);
const io = socketIo(server);

// Serve new HTML files
app.get('/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});
app.get('/doctor_dashboard.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'doctor_dashboard.html'));
});
app.get('/talk_to_doctor.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'talk_to_doctor.html'));
});
app.get('/view_files.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'view_files.html'));
});
app.get('/view_queries.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'view_queries.html'));
});
app.get('/view_appointments.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'view_appointments.html'));
});

// Serve static files from the current directory
app.use(express.static(__dirname));

// Serve landing page as root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'landing.html'));
});

// Maintain a list of connected users for video streaming
const videoUsers = new Map();

// --- Text Chat Participants Logic ---
const textChatParticipants = new Map();

// WebSocket connection handling
io.on('connection', socket => {
  console.log('A user connected');

  // Notify other users when a new user joins
  socket.on('join-video-call', ({ username }) => {
    socket.broadcast.emit('user-joined', { username, id: socket.id });
  });

  // Handle WebRTC signaling
  socket.on('offer', data => socket.broadcast.emit('offer', data));
  socket.on('answer', data => socket.broadcast.emit('answer', data));
  socket.on('ice-candidate', data => socket.broadcast.emit('ice-candidate', data));

  // Handle chat messages
  socket.on('chat-message', ({ name, message }) => {
    console.log(`Message from ${name}: ${message}`);
    socket.broadcast.emit('chat-message', { name, message });
  });

  // Handle video stream joining
  socket.on('join-video-stream', ({ username }) => {
    console.log(`${username} joined the video stream`);

    // Add the new user to the list
    videoUsers.set(socket.id, username);

    // Notify the new user about existing users
    socket.emit('existing-video-users', Array.from(videoUsers.entries()));

    // Notify other users about the new user
    socket.broadcast.emit('user-joined-video', { username, id: socket.id });
  });

  // Handle video stream data
  socket.on('video-stream', ({ id, stream }) => {
    // Broadcast the video stream to all other users
    socket.broadcast.emit('video-stream', { id, stream });
  });

  // Handle request for video streams from new users
  socket.on('request-video-stream', ({ id }) => {
    if (videoUsers.has(id)) {
      const username = videoUsers.get(id);
      socket.emit('user-joined-video', { username, id });
    }
  });

  // --- Text Chat Participants Join/Leave ---
  socket.on('join-text-chat', ({ username, time }) => {
    textChatParticipants.set(socket.id, { name: username, time });
    io.emit('participants-update', Array.from(textChatParticipants.values()));
  });

  // Notify others when a user disconnects from video stream
  socket.on('disconnect', () => {
    if (videoUsers.has(socket.id)) {
      videoUsers.delete(socket.id);
      socket.broadcast.emit('user-disconnected-video', { id: socket.id });
    }
    // Remove from text chat participants
    if (textChatParticipants.has(socket.id)) {
      textChatParticipants.delete(socket.id);
      io.emit('participants-update', Array.from(textChatParticipants.values()));
    }
    console.log('A user disconnected');
  });
});

// API endpoint to save a chat message
app.post('/api/chat', async (req, res) => {
  console.log('POST /api/chat called with body:', req.body); // Debug log
  try {
    const { name, message } = req.body;
    if (!name || !message) {
      console.log('Missing name or message'); // Debug log
      return res.status(400).json({ error: 'name and message are required' });
    }
    const chat = new Chat({ name, message });
    await chat.save();
    console.log('Chat saved:', chat); // Debug log
    res.status(201).json({ success: true, chat });
  } catch (err) {
    console.error('Error saving chat:', err); // Debug log
    res.status(500).json({ error: 'Failed to save chat message' });
  }
});

// API endpoint to save a call log (voice or video)
app.post('/api/call', async (req, res) => {
  try {
    const { type, participants, startTime, endTime } = req.body;
    if (!type || !participants || !startTime || !endTime) {
      return res.status(400).json({ error: 'type, participants, startTime, and endTime are required' });
    }
    const callLog = new CallLog({ type, participants, startTime, endTime });
    await callLog.save();
    res.status(201).json({ success: true, callLog });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save call log' });
  }
});

// API endpoint to save a voice call log
app.post('/api/calllog', async (req, res) => {
  try {
    const { name, timestamp } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }
    const callLog = new CallLog({ name, timestamp: timestamp ? new Date(timestamp) : undefined });
    await callLog.save();
    res.status(201).json({ success: true, callLog });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save call log' });
  }
});

// API endpoint to save a video call log
app.post('/api/videolog', async (req, res) => {
  try {
    const { name, timestamp } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }
    const videoLog = new VideoLog({ name, timestamp: timestamp ? new Date(timestamp) : undefined });
    await videoLog.save();
    res.status(201).json({ success: true, videoLog });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save video log' });
  }
});

// Start the server
server.listen(3000, () => {
  console.log('Server running on port 3000');
});