const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const multer = require('multer');
// Load environment variables first
require('dotenv').config();

// Import Cloudinary configuration
const { storage } = require('./config/cloudinary');
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Import database connection and models
const { mongoose, connectDB } = require('./db');
const { Chat, CallLog, VideoLog, User, File, Appointment, Query } = require('./models');

// Connect to MongoDB
connectDB().then(() => {
  console.log('Successfully connected to MongoDB');
}).catch(err => {
  console.error('Failed to connect to MongoDB:', err);
  process.exit(1);
});

app.use(express.json());

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

// File upload middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve login page as root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

// Login endpoint
app.post('/api/login', express.json(), (req, res) => {
  const { email, password } = req.body;
  
  // Sample credentials (in a real app, this would query a database)
  const sampleCredentials = {
    doctors: [
      {
        email: "doctor1@example.com",
        password: "doctor123",
        role: "doctor",
        username: "Dr. Smith"
      },
      {
        email: "doctor2@example.com",
        password: "doctor456",
        role: "doctor",
        username: "Dr. Johnson"
      }
    ],
    patients: [
      {
        email: "patient1@example.com",
        password: "patient123",
        role: "patient",
        username: "John Doe"
      },
      {
        email: "patient2@example.com",
        password: "patient456",
        role: "patient",
        username: "Jane Smith"
      }
    ]
  };

  // Find matching user
  const user = [...sampleCredentials.doctors, ...sampleCredentials.patients]
    .find(u => u.email === email && u.password === password);

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Return user data (in a real app, you'd generate a session token)
  res.json({
    success: true,
    user: {
      username: user.username,
      role: user.role,
      email: user.email
    }
  });
});

// Serve landing page (this is now protected by client-side auth)
app.get('/landing.html', (req, res) => {
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

// --- Appointments API ---
app.get('/api/appointments', async (req, res) => {
  try {
    const { doctorEmail, patientEmail, status } = req.query;
    const filter = {};
    if (doctorEmail) filter.doctorEmail = doctorEmail;
    if (patientEmail) filter.patientEmail = patientEmail;
    if (status) filter.status = status;
    
    const appointments = await Appointment.find(filter).sort({ date: 1, time: 1 });
    res.json({ success: true, appointments });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
});

app.post('/api/appointments', async (req, res) => {
  try {
    const { patientEmail, doctorEmail, date, time, notes } = req.body;
    if (!patientEmail || !doctorEmail || !date || !time) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const appointment = new Appointment({
      patientEmail,
      doctorEmail,
      date: new Date(date),
      time,
      notes,
      status: 'pending'
    });
    
    await appointment.save();
    res.status(201).json({ success: true, appointment });
  } catch (err) {
    console.error('Error creating appointment:', err);
    res.status(500).json({ error: 'Failed to create appointment' });
  }
});

// File upload endpoint
app.post('/api/files', upload.single('file'), async (req, res) => {
  try {
    console.log('File upload request received');
    console.log('Request body:', req.body);
    
    const { patientEmail, doctorEmail, description } = req.body;
    
    if (!req.file) {
      console.error('No file in request');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Log the uploaded file details for debugging
    console.log('Uploaded file info:', JSON.stringify(req.file, null, 2));

    // Get the Cloudinary response
    const cloudinaryResult = req.file;
    
    if (!cloudinaryResult || !cloudinaryResult.path) {
      console.error('Cloudinary upload failed - missing path:', cloudinaryResult);
      return res.status(500).json({ 
        error: 'Failed to upload file to Cloudinary',
        details: cloudinaryResult 
      });
    }

    // Extract file extension from original filename
    const fileExt = cloudinaryResult.originalname ? 
                   cloudinaryResult.originalname.split('.').pop().toLowerCase() :
                   'unknown';
    
    try {
      // Create file record in database
      const file = new File({
        filename: cloudinaryResult.originalname || 'unnamed-file',
        url: cloudinaryResult.path, // This should be the Cloudinary URL
        public_id: cloudinaryResult.filename, // This is the public_id from Cloudinary
        format: fileExt,
        size: cloudinaryResult.size || 0,
        patientEmail,
        doctorEmail,
        description: description || '',
        status: 'uploaded',
        uploadDate: new Date()
      });

      await file.save();
      console.log('File saved to database:', file);
      
      // Format the response to match what the frontend expects
      const responseFile = {
        _id: file._id,
        filename: file.filename,
        url: file.url,
        format: file.format,
        size: file.size,
        patientEmail: file.patientEmail,
        doctorEmail: file.doctorEmail,
        description: file.description,
        status: file.status,
        uploadDate: file.uploadDate,
        __v: file.__v
      };

      res.status(201).json({ 
        success: true, 
        file: responseFile
      });
    } catch (dbError) {
      console.error('Database save error:', dbError);
      // If we get a duplicate key error, try to return a more helpful message
      if (dbError.code === 11000) {
        return res.status(400).json({
          error: 'A file with this name already exists',
          details: dbError.message
        });
      }
      throw dbError;
    }
  } catch (err) {
    console.error('Error in file upload:', err);
    res.status(500).json({ 
      success: false,
      error: 'Error uploading file',
      message: err.message,
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// Get files for a doctor
app.get('/api/files/doctor/:doctorEmail', async (req, res) => {
  try {
    const files = await File.find({ 
      doctorEmail: req.params.doctorEmail 
    }).sort({ uploadDate: -1 });
    
    res.json({ success: true, files });
  } catch (err) {
    console.error('Error fetching files:', err);
    res.status(500).json({ error: 'Failed to fetch files' });
  }
});

// Get files for a patient
app.get('/api/files/patient/:patientEmail', async (req, res) => {
  try {
    const files = await File.find({ 
      patientEmail: req.params.patientEmail 
    }).sort({ uploadDate: -1 });
    
    res.json({ success: true, files });
  } catch (err) {
    console.error('Error fetching patient files:', err);
    res.status(500).json({ error: 'Failed to fetch patient files' });
  }
});

// Update file status
app.patch('/api/files/:id', async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }
    
    const file = await File.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    res.json({ success: true, file });
  } catch (err) {
    console.error('Error updating file status:', err);
    res.status(500).json({ error: 'Failed to update file status' });
  }
});

// Update appointment status
app.patch('/api/appointments/:id', async (req, res) => {
  try {
    const { status, notes } = req.body;
    const { id } = req.params;
    
    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }
    
    const updateData = { status };
    if (notes) updateData.notes = notes;
    
    const appointment = await Appointment.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );
    
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    
    res.json({ success: true, appointment });
  } catch (err) {
    console.error('Error updating appointment:', err);
    res.status(500).json({ error: 'Failed to update appointment' });
  }
});

// --- Queries API ---
app.get('/api/queries', async (req, res) => {
  try {
    const { to, from, status } = req.query;
    const filter = {};
    if (to) filter.to = to;
    if (from) filter.from = from;
    if (status) filter.status = status;
    
    const queries = await Query.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, queries });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch queries' });
  }
});

app.post('/api/queries', async (req, res) => {
  try {
    const { from, to, message } = req.body;
    if (!from || !to || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const query = new Query({
      from,
      to,
      message,
      status: 'unread'
    });
    
    await query.save();
    res.status(201).json({ success: true, query });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create query' });
  }
});

// --- Files API ---
app.get('/api/files', async (req, res) => {
  try {
    const { patientEmail, doctorEmail, status } = req.query;
    const filter = {};
    if (patientEmail) filter.patientEmail = patientEmail;
    if (doctorEmail) filter.doctorEmail = doctorEmail;
    if (status) filter.status = status;
    
    const files = await File.find(filter).sort({ uploadDate: -1 });
    res.json({ success: true, files });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch files' });
  }
});

// Note: File upload would typically use multer middleware for handling file uploads
// This is a simplified version
app.post('/api/files', async (req, res) => {
  try {
    // In a real app, you would use multer to handle file uploads
    // This is a simplified version that expects file data in the request body
    const { patientEmail, doctorEmail, filename, fileData, fileType, size } = req.body;
    
    if (!patientEmail || !doctorEmail || !filename || !fileData || !fileType || !size) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const file = new File({
      patientEmail,
      doctorEmail,
      filename,
      fileData: Buffer.from(fileData, 'base64'), // Convert base64 to buffer
      fileType,
      size: parseInt(size, 10),
      status: 'uploaded'
    });
    
    await file.save();
    res.status(201).json({ success: true, file });
  } catch (err) {
    console.error('Error saving file:', err);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// --- Users API ---
app.get('/api/users', async (req, res) => {
  try {
    const { role, email } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (email) filter.email = email;
    
    const users = await User.find(filter, { password: 0 }); // Exclude passwords
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Update WebSocket handlers to save data to database
io.on('connection', socket => {
  console.log('A user connected');

  // Existing WebSocket handlers...
  // ...
  
  // Handle chat messages - Update to save to database
  socket.on('chat-message', async ({ name, message }) => {
    console.log(`Message from ${name}: ${message}`);
    try {
      const chat = new Chat({ name, message });
      await chat.save();
      socket.broadcast.emit('chat-message', { name, message });
    } catch (err) {
      console.error('Error saving chat message:', err);
    }
  });
  
  // Handle call start/end events
  socket.on('call-started', async ({ type, participants, startTime }) => {
    try {
      const callLog = new CallLog({
        type,
        participants,
        startTime: new Date(startTime),
        status: 'in-progress'
      });
      await callLog.save();
      // Store the call ID to update it when the call ends
      socket.callLogId = callLog._id;
    } catch (err) {
      console.error('Error saving call log:', err);
    }
  });
  
  socket.on('call-ended', async ({ endTime }) => {
    if (socket.callLogId) {
      try {
        await CallLog.findByIdAndUpdate(socket.callLogId, {
          endTime: new Date(endTime),
          status: 'completed'
        });
      } catch (err) {
        console.error('Error updating call log:', err);
      }
    }
  });
  
  // Rest of the existing WebSocket handlers...
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});