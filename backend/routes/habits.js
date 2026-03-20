const express = require('express');
const Habit = require('../models/Habit');
const Task = require('../models/Task');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Helper function to calculate points based on difficulty
function calculatePoints(difficulty) {
  const pointMap = {
    'Low': 10,
    'Moderate': 20,
    'High': 50,
  };
  return pointMap[difficulty] || 10;
}

// Create a new habit
router.post('/create', authenticateToken, async (req, res) => {
  try {
    const { title, description, category, difficulty, estimatedTime } = req.body;

    if (!title) {
      return res.status(400).json({ message: 'Habit title is required' });
    }

    const newHabit = new Habit({
      userId: req.userId,
      title,
      description,
      category,
      difficulty,
      estimatedTime,
    });

    await newHabit.save();

    // Update user's total habits count
    await User.findByIdAndUpdate(req.userId, { $inc: { totalHabits: 1 } });

    res.status(201).json({
      message: 'Habit created successfully',
      habit: newHabit,
    });
  } catch (error) {
    console.error('Create habit error:', error);
    res.status(500).json({ message: 'Failed to create habit', error: error.message });
  }
});

// Get all habits for a user
router.get('/all', authenticateToken, async (req, res) => {
  try {
    const habits = await Habit.find({ userId: req.userId }).sort({ createdAt: -1 });

    res.status(200).json({
      message: 'Habits retrieved successfully',
      habits,
    });
  } catch (error) {
    console.error('Get habits error:', error);
    res.status(500).json({ message: 'Failed to retrieve habits', error: error.message });
  }
});

// Get a specific habit by ID
router.get('/:habitId', authenticateToken, async (req, res) => {
  try {
    const habit = await Habit.findOne({
      _id: req.params.habitId,
      userId: req.userId,
    });

    if (!habit) {
      return res.status(404).json({ message: 'Habit not found' });
    }

    res.status(200).json({
      message: 'Habit retrieved successfully',
      habit,
    });
  } catch (error) {
    console.error('Get habit error:', error);
    res.status(500).json({ message: 'Failed to retrieve habit', error: error.message });
  }
});

// Update a habit
router.put('/:habitId', authenticateToken, async (req, res) => {
  try {
    const { title, description, category, difficulty, estimatedTime } = req.body;

    const habit = await Habit.findOneAndUpdate(
      { _id: req.params.habitId, userId: req.userId },
      { title, description, category, difficulty, estimatedTime, updatedAt: Date.now() },
      { new: true }
    );

    if (!habit) {
      return res.status(404).json({ message: 'Habit not found' });
    }

    res.status(200).json({
      message: 'Habit updated successfully',
      habit,
    });
  } catch (error) {
    console.error('Update habit error:', error);
    res.status(500).json({ message: 'Failed to update habit', error: error.message });
  }
});

// Delete a habit
router.delete('/:habitId', authenticateToken, async (req, res) => {
  try {
    const habit = await Habit.findOneAndDelete({
      _id: req.params.habitId,
      userId: req.userId,
    });

    if (!habit) {
      return res.status(404).json({ message: 'Habit not found' });
    }

    // Update user's total habits count
    await User.findByIdAndUpdate(req.userId, { $inc: { totalHabits: -1 } });

    // Delete all tasks related to this habit
    await Task.deleteMany({ habitId: req.params.habitId });

    res.status(200).json({
      message: 'Habit deleted successfully',
    });
  } catch (error) {
    console.error('Delete habit error:', error);
    res.status(500).json({ message: 'Failed to delete habit', error: error.message });
  }
});

module.exports = router;
