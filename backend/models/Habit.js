const mongoose = require('mongoose');

// Habit Schema for MongoDB
const habitSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    category: {
      type: String,
      enum: ['Health', 'Productivity', 'Mindfulness', 'Personal Growth'],
      default: 'Personal Growth',
    },
    difficulty: {
      type: String,
      enum: ['Low', 'Moderate', 'High'],
      default: 'Moderate',
    },
    estimatedTime: {
      type: Number, // in minutes
      default: 30,
    },
    // Streak tracking
    currentStreak: {
      type: Number,
      default: 0,
    },
    longestStreak: {
      type: Number,
      default: 0,
    },
    lastCompletedDate: {
      type: Date,
      default: null,
    },
    // Progress tracking
    completionDays: {
      type: Number,
      default: 0,
    },
    toalDays: {
      type: Number,
      default: 0,
    },
    progressPercentage: {
      type: Number,
      default: 0,
    },
    habitPoints: {
      type: Number,
      default: 0,
    },
    completionHistory: [
      {
        date: Date,
        difficulty: String,
        points: Number,
        feedback: String,
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Habit', habitSchema);
