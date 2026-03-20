const mongoose = require('mongoose');

// Task Completion Schema for MongoDB
const taskSchema = new mongoose.Schema(
  {
    habitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Habit',
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    difficulty: {
      type: String,
      enum: ['Low', 'Moderate', 'High'],
      required: true,
    },
    points: {
      type: Number,
      required: true,
    },
    feedback: {
      type: String,
      default: '',
    },
    completedAt: {
      type: Date,
      default: Date.now,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Task', taskSchema);
