const express = require('express');
const router = express.Router();
const { Query, User } = require('../models');
const { authorize } = require('../middleware/auth');

// @route   POST /api/queries
// @desc    Create a new query
// @access  Private
router.post('/', async (req, res) => {
  try {
    const { to, message } = req.body;
    const from = req.user.email; // From authenticated user
    
    // Check if recipient exists and is a doctor
    const recipient = await User.findOne({ email: to, role: 'doctor' });
    if (!recipient) {
      return res.status(400).json({ message: 'Recipient doctor not found' });
    }

    const query = new Query({
      from,
      to,
      message,
      status: 'unread'
    });

    await query.save();
    
    // Emit socket event for real-time notification
    // This would be implemented in your WebSocket server
    
    res.status(201).json(query);
  } catch (err) {
    console.error('Error creating query:', err);
    res.status(500).json({ message: 'Error creating query', error: err.message });
  }
});

// @route   GET /api/queries/sent
// @desc    Get all queries sent by the current user
// @access  Private
router.get('/sent', async (req, res) => {
  try {
    const queries = await Query.find({ from: req.user.email })
      .sort({ createdAt: -1 });
    
    res.json(queries);
  } catch (err) {
    console.error('Error getting sent queries:', err);
    res.status(500).json({ message: 'Error retrieving queries', error: err.message });
  }
});

// @route   GET /api/queries/received
// @desc    Get all queries received by the current user (for doctors)
// @access  Private (Doctor only)
router.get('/received', authorize('doctor'), async (req, res) => {
  try {
    const { status } = req.query;
    const query = { to: req.user.email };
    
    if (status) {
      query.status = status;
    }
    
    const queries = await Query.find(query)
      .sort({ createdAt: -1 });
    
    res.json(queries);
  } catch (err) {
    console.error('Error getting received queries:', err);
    res.status(500).json({ message: 'Error retrieving queries', error: err.message });
  }
});

// @route   GET /api/queries/:id
// @desc    Get a single query by ID
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const query = await Query.findById(req.params.id);
    
    if (!query) {
      return res.status(404).json({ message: 'Query not found' });
    }
    
    // Check if the user is authorized to view this query
    if (query.from !== req.user.email && query.to !== req.user.email) {
      return res.status(403).json({ message: 'Not authorized to view this query' });
    }
    
    // If the query is unread and the current user is the recipient, mark as read
    if (query.status === 'unread' && query.to === req.user.email) {
      query.status = 'read';
      await query.save();
    }
    
    res.json(query);
  } catch (err) {
    console.error('Error getting query:', err);
    res.status(500).json({ message: 'Error retrieving query', error: err.message });
  }
});

// @route   POST /api/queries/:id/respond
// @desc    Respond to a query (for doctors)
// @access  Private (Doctor only)
router.post('/:id/respond', authorize('doctor'), async (req, res) => {
  try {
    const { response } = req.body;
    
    const query = await Query.findById(req.params.id);
    
    if (!query) {
      return res.status(404).json({ message: 'Query not found' });
    }
    
    // Check if the current user is the intended recipient
    if (query.to !== req.user.email) {
      return res.status(403).json({ message: 'Not authorized to respond to this query' });
    }
    
    // Update query with response
    query.response = response;
    query.status = 'replied';
    query.updatedAt = new Date();
    
    await query.save();
    
    // Emit socket event for real-time notification
    // This would be implemented in your WebSocket server
    
    res.json({ 
      message: 'Response sent successfully',
      query 
    });
  } catch (err) {
    console.error('Error responding to query:', err);
    res.status(500).json({ message: 'Error responding to query', error: err.message });
  }
});

// @route   PUT /api/queries/:id/status
// @desc    Update query status
// @access  Private
router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    
    const query = await Query.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    
    if (!query) {
      return res.status(404).json({ message: 'Query not found' });
    }
    
    res.json({ message: 'Query status updated', query });
  } catch (err) {
    console.error('Error updating query status:', err);
    res.status(500).json({ message: 'Error updating query status', error: err.message });
  }
});

// @route   DELETE /api/queries/:id
// @desc    Delete a query
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const query = await Query.findByIdAndDelete(req.params.id);
    
    if (!query) {
      return res.status(404).json({ message: 'Query not found' });
    }
    
    res.json({ message: 'Query deleted successfully' });
  } catch (err) {
    console.error('Error deleting query:', err);
    res.status(500).json({ message: 'Error deleting query', error: err.message });
  }
});

module.exports = router;
