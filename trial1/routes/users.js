const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { User } = require('../models');
const { authorize } = require('../middleware/auth');

// @route   GET /api/users/doctors
// @desc    Get all doctors
// @access  Public
router.get('/doctors', async (req, res) => {
  try {
    const doctors = await User.find({ role: 'doctor' })
      .select('-password')
      .sort({ username: 1 });
    
    res.json(doctors);
  } catch (err) {
    console.error('Error getting doctors:', err);
    res.status(500).json({ message: 'Error retrieving doctors', error: err.message });
  }
});

// @route   GET /api/users/me
// @desc    Get current user's profile
// @access  Private
router.get('/me', async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  } catch (err) {
    console.error('Error getting user profile:', err);
    res.status(500).json({ message: 'Error retrieving user profile', error: err.message });
  }
});

// @route   PUT /api/users/me
// @desc    Update current user's profile
// @access  Private
router.put('/me', async (req, res) => {
  try {
    const { username, email, currentPassword, newPassword } = req.body;
    
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Update username if provided
    if (username) user.username = username;
    
    // Update email if provided
    if (email && email !== user.email) {
      // Check if new email is already taken
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        return res.status(400).json({ message: 'Email already in use' });
      }
      user.email = email;
    }
    
    // Update password if current password is provided and matches
    if (currentPassword && newPassword) {
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }
      
      // Hash new password
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
    }
    
    user.updatedAt = new Date();
    await user.save();
    
    // Return user data without password
    const userData = user.toObject();
    delete userData.password;
    
    res.json({ 
      message: 'Profile updated successfully',
      user: userData
    });
  } catch (err) {
    console.error('Error updating user profile:', err);
    res.status(500).json({ message: 'Error updating profile', error: err.message });
  }
});

// @route   GET /api/users/patients
// @desc    Get all patients (for doctors)
// @access  Private (Doctor only)
router.get('/patients', authorize('doctor'), async (req, res) => {
  try {
    const patients = await User.find({ role: 'patient' })
      .select('-password')
      .sort({ username: 1 });
    
    res.json(patients);
  } catch (err) {
    console.error('Error getting patients:', err);
    res.status(500).json({ message: 'Error retrieving patients', error: err.message });
  }
});

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Only allow users to view their own profile or doctors to view patients
    if (req.user.role !== 'doctor' && req.user.id !== req.params.id) {
      return res.status(403).json({ message: 'Not authorized to view this profile' });
    }
    
    res.json(user);
  } catch (err) {
    console.error('Error getting user:', err);
    res.status(500).json({ message: 'Error retrieving user', error: err.message });
  }
});

// @route   DELETE /api/users/me
// @desc    Delete current user's account
// @access  Private
router.delete('/me', async (req, res) => {
  try {
    await User.findByIdAndDelete(req.user.id);
    
    // Here you might also want to delete all related data (appointments, files, etc.)
    
    res.json({ message: 'Account deleted successfully' });
  } catch (err) {
    console.error('Error deleting user account:', err);
    res.status(500).json({ message: 'Error deleting account', error: err.message });
  }
});

module.exports = router;
