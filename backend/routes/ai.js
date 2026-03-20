const express = require('express');
const axios = require('axios');
const Habit = require('../models/Habit');
const Task = require('../models/Task');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// AI Chat endpoint - Get AI response
router.post('/chat', authenticateToken, async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ message: 'Message is required' });
    }

    // Get user context for AI
    const user = await User.findById(req.userId);
    const habits = await Habit.find({ userId: req.userId });

    // Get recent task completions (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentTasks = await Task.find({
      userId: req.userId,
      completedAt: { $gte: sevenDaysAgo },
    }).sort({ completedAt: -1 });

    // Calculate completion rate
    const totalHabits = habits.length;
    const completedToday = recentTasks.filter(t => {
      const today = new Date();
      const taskDate = new Date(t.completedAt);
      return taskDate.toDateString() === today.toDateString();
    }).length;

    // Build context for AI
    const context = `
User Stats:
- Name: ${user.name}
- Current Streak: ${user.currentStreak} days
- Longest Streak: ${user.longestStreak} days
- Total Points: ${user.totalPoints}
- Total Habits: ${totalHabits}
- Completed Today: ${completedToday} tasks
- Last 7 Days Completions: ${recentTasks.length}

Active Habits:
${habits.map(h => `- ${h.title} (${h.category}, Current Streak: ${h.currentStreak} days)`).join('\n')}

Recent Completions:
${recentTasks.slice(0, 5).map(t => `- Completed on ${new Date(t.completedAt).toLocaleDateString()} (${t.difficulty}, +${t.points} points)`).join('\n')}

User Question: ${message}
    `;

    // Call Google Gemini API
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        message: 'API configuration error',
        response: 'I apologize, but I cannot connect to the AI service right now. Please try again later.',
      });
    }

    try {
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          contents: [
            {
              parts: [
                {
                  text: `You are an AI Habit Coach. You help users build consistent habits and track their progress. 
Be motivating, supportive, and provide actionable suggestions. Keep responses concise (2-3 sentences).

${context}`,
                },
              ],
            },
          ],
        }
      );

      const aiResponse =
        response.data.candidates[0].content.parts[0].text ||
        'I could not generate a response. Please try again.';

      res.status(200).json({
        message: 'AI response generated',
        response: aiResponse,
      });
    } catch (apiError) {
      console.error('Google AI API error:', apiError.message);
      res.status(200).json({
        message: 'AI service temporarily unavailable',
        response: `That's a great question! Keep up with your ${totalHabits} habit${totalHabits !== 1 ? 's' : ''} and maintain your ${user.currentStreak}-day streak! 💪`,
      });
    }
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ message: 'Failed to get AI response', error: error.message });
  }
});

module.exports = router;
