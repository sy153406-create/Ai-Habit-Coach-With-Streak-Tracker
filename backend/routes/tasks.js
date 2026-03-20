const express = require('express');
const Habit = require('../models/Habit');
const Task = require('../models/Task');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Helper function to calculate points
function calculatePoints(difficulty) {
  const pointMap = {
    'Low': 10,
    'Moderate': 20,
    'High': 50,
  };
  return pointMap[difficulty] || 10;
}

// Helper function to calculate streak
async function updateStreak(habitId, userId) {
  try {
    const habit = await Habit.findById(habitId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastCompleted = habit.lastCompletedDate ? new Date(habit.lastCompletedDate) : null;
    lastCompleted && lastCompleted.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // If completed today, streak continues or starts
    if (lastCompleted && lastCompleted.getTime() === today.getTime()) {
      // Already completed today, no change
      return habit.currentStreak;
    }

    // If last completed was yesterday, increment streak
    if (lastCompleted && lastCompleted.getTime() === yesterday.getTime()) {
      habit.currentStreak += 1;
    } else {
      // Streak broken or first completion
      habit.currentStreak = 1;
    }

    // Update longest streak if current exceeds it
    if (habit.currentStreak > habit.longestStreak) {
      habit.longestStreak = habit.currentStreak;
    }

    habit.lastCompletedDate = today;
    await habit.save();

    return habit.currentStreak;
  } catch (error) {
    console.error('Update streak error:', error);
    throw error;
  }
}

// Complete a task
router.post('/complete', authenticateToken, async (req, res) => {
  try {
    const { habitId, difficulty, feedback } = req.body;

    if (!habitId || !difficulty) {
      return res.status(400).json({ message: 'habitId and difficulty are required' });
    }

    // Verify habit belongs to user
    const habit = await Habit.findOne({
      _id: habitId,
      userId: req.userId,
    });

    if (!habit) {
      return res.status(404).json({ message: 'Habit not found' });
    }

    // Calculate points
    const points = calculatePoints(difficulty);

    // Create task completion record
    const newTask = new Task({
      habitId,
      userId: req.userId,
      difficulty,
      points,
      feedback: feedback || '',
    });

    await newTask.save();

    // Update habit
    habit.completionDays += 1;
    habit.habitPoints += points;
    habit.completionHistory.push({
      date: new Date(),
      difficulty,
      points,
      feedback: feedback || '',
    });

    // Update streak
    await updateStreak(habitId, req.userId);
    const updatedHabit = await Habit.findById(habitId);

    // Calculate progress percentage
    updatedHabit.progressPercentage = Math.min(100, (updatedHabit.completionDays / 30) * 100);
    await updatedHabit.save();

    // Update user points and stats
    const user = await User.findById(req.userId);
    user.totalPoints += points;
    
    // Update user's current streak (max streak across all habits)
    const allHabits = await Habit.find({ userId: req.userId });
    const maxStreak = Math.max(...allHabits.map(h => h.currentStreak), 0);
    user.currentStreak = maxStreak;

    await user.save();

    res.status(200).json({
      message: 'Task completed successfully',
      task: newTask,
      habit: updatedHabit,
      user: {
        totalPoints: user.totalPoints,
        currentStreak: user.currentStreak,
      },
    });
  } catch (error) {
    console.error('Complete task error:', error);
    res.status(500).json({ message: 'Failed to complete task', error: error.message });
  }
});

// Get task history for a habit
router.get('/history/:habitId', authenticateToken, async (req, res) => {
  try {
    const tasks = await Task.find({
      habitId: req.params.habitId,
      userId: req.userId,
    }).sort({ completedAt: -1 });

    res.status(200).json({
      message: 'Task history retrieved successfully',
      tasks,
    });
  } catch (error) {
    console.error('Get task history error:', error);
    res.status(500).json({ message: 'Failed to retrieve task history', error: error.message });
  }
});

// Get user's dashboard stats
router.get('/dashboard/stats', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const habits = await Habit.find({ userId: req.userId });

    // Get last 7 days completion data
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const count = await Task.countDocuments({
        userId: req.userId,
        completedAt: { $gte: date, $lt: nextDate },
      });

      last7Days.push({
        date: date.toISOString().split('T')[0],
        completions: count,
      });
    }

    // Get last 30 days completion data
    const last30Days = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const count = await Task.countDocuments({
        userId: req.userId,
        completedAt: { $gte: date, $lt: nextDate },
      });

      last30Days.push({
        date: date.toISOString().split('T')[0],
        completions: count,
      });
    }

    res.status(200).json({
      message: 'Dashboard stats retrieved successfully',
      user: {
        totalPoints: user.totalPoints,
        currentStreak: user.currentStreak,
        longestStreak: user.longestStreak,
        totalHabits: user.totalHabits,
      },
      habits,
      last7Days,
      last30Days,
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ message: 'Failed to retrieve stats', error: error.message });
  }
});

module.exports = router;
