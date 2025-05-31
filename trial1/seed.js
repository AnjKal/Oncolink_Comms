require('dotenv').config();
const mongoose = require('./db');
const { User, File, Appointment, Query } = require('./models');
const bcrypt = require('bcryptjs');

const seedDatabase = async () => {
  try {
    console.log('Seeding database...');
    
    // Clear existing data
    await User.deleteMany({});
    await File.deleteMany({});
    await Appointment.deleteMany({});
    await Query.deleteMany({});
    
    console.log('Creating users...');
    
    // Create doctors
    const doctor1 = new User({
      email: 'dr.smith@example.com',
      password: 'doctor123',
      username: 'Dr. John Smith',
      role: 'doctor'
    });
    
    const doctor2 = new User({
      email: 'dr.johnson@example.com',
      password: 'doctor123',
      username: 'Dr. Sarah Johnson',
      role: 'doctor'
    });
    
    // Create patients
    const patient1 = new User({
      email: 'patient1@example.com',
      password: 'patient123',
      username: 'Alice Johnson',
      role: 'patient'
    });
    
    const patient2 = new User({
      email: 'patient2@example.com',
      password: 'patient123',
      username: 'Bob Wilson',
      role: 'patient'
    });
    
    // Save users
    await Promise.all([
      doctor1.save(),
      doctor2.save(),
      patient1.save(),
      patient2.save()
    ]);
    
    console.log('Creating appointments...');
    
    // Create appointments
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const appointments = [
      {
        patientEmail: patient1.email,
        doctorEmail: doctor1.email,
        date: today,
        time: '10:00',
        status: 'confirmed',
        notes: 'Regular checkup'
      },
      {
        patientEmail: patient2.email,
        doctorEmail: doctor1.email,
        date: tomorrow,
        time: '14:30',
        status: 'pending',
        notes: 'Follow-up appointment'
      },
      {
        patientEmail: patient1.email,
        doctorEmail: doctor2.email,
        date: today,
        time: '15:00',
        status: 'completed',
        notes: 'Initial consultation'
      }
    ];
    
    await Appointment.insertMany(appointments);
    
    console.log('Creating queries...');
    
    // Create queries
    const queries = [
      {
        from: patient1.email,
        to: doctor1.email,
        message: 'I have been experiencing headaches recently. Should I be concerned?',
        status: 'replied',
        response: 'Headaches can have many causes. Please schedule an appointment for a proper evaluation.',
        createdAt: new Date(Date.now() - 86400000) // Yesterday
      },
      {
        from: patient2.email,
        to: doctor1.email,
        message: 'When is my next appointment?',
        status: 'unread',
        response: '',
        createdAt: new Date()
      }
    ];
    
    await Query.insertMany(queries);
    
    console.log('Database seeded successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

// Run the seed function
seedDatabase();
