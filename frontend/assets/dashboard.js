// ========================================
// AI Habit Coach - Dashboard JS
// ========================================

const API_BASE = 'http://localhost:5000/api';
let currentChartFilter = '7days';
let allHabits = [];

// Check authentication
function checkAuth() {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'index.html';
    return false;
  }
  return token;
}

// Get Authorization Header
function getAuthHeader() {
  return {
    'Authorization': `Bearer ${checkAuth()}`,
    'Content-Type': 'application/json',
  };
}

// Logout Handler
function logout() {
  localStorage.clear();
  window.location.href = 'index.html';
}

// Initialize Dashboard
async function initDashboard() {
  try {
    // Set user avatar
    const userName = localStorage.getItem('userName');
    const userInitial = userName ? userName.charAt(0).toUpperCase() : 'U';
    document.getElementById('userAvatar').textContent = userInitial;

    // Load dashboard stats
    await loadDashboardStats();

    // Load habits
    await loadHabits();

    // Load initial chart
    await loadChart(currentChartFilter);

    // Set up chat listener
    document.getElementById('chatInput').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        sendChatMessage();
      }
    });
  } catch (error) {
    console.error('Dashboard initialization error:', error);
  }
}

// Load Dashboard Stats
async function loadDashboardStats() {
  try {
    const response = await fetch(`${API_BASE}/tasks/dashboard/stats`, {
      headers: getAuthHeader(),
    });

    if (!response.ok) throw new Error('Failed to load stats');

    const data = await response.json();
    const { user } = data;

    // Update stats display
    document.getElementById('currentStreak').textContent = user.currentStreak || 0;
    document.getElementById('totalPoints').textContent = user.totalPoints || 0;
    document.getElementById('longestStreak').textContent = user.longestStreak || 0;
    document.getElementById('totalHabits').textContent = user.totalHabits || 0;

    // Update daily goals (example: if at least 1 habit completed today)
    const today = new Date().toISOString().split('T')[0];
    const completedToday = data.last7Days.find(d => d.date === today)?.completions || 0;
    document.getElementById('dailyGoals').textContent = Math.min(completedToday, 5);

    // Store for chart
    window.dashboardStats = data;
  } catch (error) {
    console.error('Load stats error:', error);
  }
}

// Load Habits
async function loadHabits() {
  try {
    const response = await fetch(`${API_BASE}/habits/all`, {
      headers: getAuthHeader(),
    });

    if (!response.ok) throw new Error('Failed to load habits');

    const data = await response.json();
    allHabits = data.habits || [];

    renderHabits();
  } catch (error) {
    console.error('Load habits error:', error);
  }
}

// Render Habits Grid
function renderHabits() {
  const habitsGrid = document.getElementById('habitsGrid');
  habitsGrid.innerHTML = '';

  if (allHabits.length === 0) {
    habitsGrid.innerHTML = '<div class="no-habits-message">No habits yet. <a href="my-habits.html">Create your first habit!</a></div>';
    return;
  }

  allHabits.forEach(habit => {
    const card = createHabitCard(habit);
    habitsGrid.appendChild(card);
  });
}

// Create Habit Card
function createHabitCard(habit) {
  const card = document.createElement('div');
  card.className = 'habit-card';

  const progressPercent = habit.progressPercentage || 0;
  const streakIcon = habit.currentStreak > 0 ? '🔥' : '❄️';

  card.innerHTML = `
    <div class="habit-header">
      <div class="habit-title">${habit.title}</div>
      <div class="habit-category">${habit.category}</div>
    </div>

    <div class="habit-meta">
      <div class="habit-meta-item">
        ⏱️ ${habit.estimatedTime || 30} min
      </div>
      <div class="habit-meta-item">
        📊 ${habit.difficulty || 'Moderate'}
      </div>
    </div>

    <div class="progress-bar">
      <div class="progress-fill" style="width: ${progressPercent}%"></div>
    </div>

    <div class="progress-text">${Math.round(progressPercent)}% Complete</div>

    <div class="streak-info">
      ${streakIcon} ${habit.currentStreak || 0} day streak
    </div>

    <div class="habit-actions">
      <button class="btn-complete" onclick="completeHabit('${habit._id}')">✅ Complete</button>
      <button class="btn-details" onclick="viewHabitDetails('${habit._id}')">📝 Details</button>
      <button class="btn-delete" onclick="deleteHabit('${habit._id}')">🗑️ Delete</button>
    </div>
  `;

  return card;
}

// View Habit Details
function viewHabitDetails(habitId) {
  localStorage.setItem('selectedHabitId', habitId);
  window.location.href = 'habit-details.html';
}

// Complete Habit (Quick Complete)
async function completeHabit(habitId) {
  try {
    const response = await fetch(`${API_BASE}/tasks/complete`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify({
        habitId,
        difficulty: 'Moderate',
        feedback: 'Completed from dashboard',
      }),
    });

    if (!response.ok) throw new Error('Failed to complete habit');

    const data = await response.json();
    alert(`✅ Great job! +${data.task.points} points earned!`);

    // Reload dashboard
    await loadDashboardStats();
    await loadHabits();
  } catch (error) {
    console.error('Complete habit error:', error);
    alert('Failed to complete habit');
  }
}

// Delete Habit
async function deleteHabit(habitId) {
  if (!confirm('Are you sure you want to delete this habit?')) {
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/habits/${habitId}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    });

    if (!response.ok) throw new Error('Failed to delete habit');

    alert('Habit deleted successfully');
    await loadHabits();
    await loadDashboardStats();
  } catch (error) {
    console.error('Delete habit error:', error);
    alert('Failed to delete habit');
  }
}

// Load Chart Data
async function loadChart(filter) {
  try {
    const stats = window.dashboardStats;
    if (!stats) {
      console.error('No stats available');
      return;
    }

    const data = filter === '7days' ? stats.last7Days : stats.last30Days;
    renderChart(data);
  } catch (error) {
    console.error('Load chart error:', error);
  }
}

// Render Chart
function renderChart(data) {
  const container = document.getElementById('chartContainer');
  container.innerHTML = '';

  if (!data || data.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: #999;">No data yet</p>';
    return;
  }

  const maxValue = Math.max(...data.map(d => d.completions), 1);

  data.forEach(point => {
    const chartBar = document.createElement('div');
    chartBar.className = 'chart-bar';

    const percentage = (point.completions / maxValue) * 100;

    chartBar.innerHTML = `
      <div class="bar" style="height: ${percentage}%; min-height: 20px;"></div>
      <div class="bar-label">${new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
    `;

    container.appendChild(chartBar);
  });
}

// Filter Chart
function filterChart(filter) {
  currentChartFilter = filter;

  // Update button states
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  event.target.classList.add('active');

  // Load new data
  loadChart(filter);
}

// Send Chat Message
async function sendChatMessage() {
  const input = document.getElementById('chatInput');
  const message = input.value.trim();

  if (!message) return;

  // Add user message to chat
  addChatMessage(message, 'user');
  input.value = '';

  try {
    // Send to AI API
    const response = await fetch(`${API_BASE}/ai/chat`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify({ message }),
    });

    if (!response.ok) throw new Error('Failed to get AI response');

    const data = await response.json();
    addChatMessage(data.response, 'ai');
  } catch (error) {
    console.error('Chat error:', error);
    addChatMessage('Sorry, I\'m having trouble connecting. Please try again.', 'ai');
  }
}

// Add Chat Message to UI
function addChatMessage(text, sender) {
  const messagesContainer = document.getElementById('chatMessages');
  const messageDiv = document.createElement('div');
  messageDiv.className = 'chat-message';

  const bubble = document.createElement('div');
  bubble.className = `message-bubble ${sender === 'user' ? 'user-message' : 'ai-message'}`;
  bubble.textContent = text;

  messageDiv.appendChild(bubble);
  messagesContainer.appendChild(messageDiv);

  // Scroll to bottom
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Initialize on page load
window.addEventListener('load', initDashboard);
const chatBody = document.querySelector(".chat-body");
const messageInput = document.querySelector(".message-input");
const sendMessage = document.querySelector("#send-message");
const fileInput = document.querySelector("#file-input");
const fileUploadWrapper = document.querySelector(".file-upload-wrapper");
const fileCancelButton = fileUploadWrapper.querySelector("#file-cancel");
const chatbotToggler = document.querySelector("#chatbot-toggler");
const closeChatbot = document.querySelector("#close-chatbot");
// API setup
const API_KEY = "AIzaSyCQ2Rgvv5LLce_17VagVlddeAA8suj1jRQ";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;
const COACH_STORAGE_KEY = "habitCoachStateV1";
// Initialize user message and file data
const userData = {
  message: null,
  file: {
    data: null,
    mime_type: null,
  },
};
// Store chat history
const chatHistory = [];
const initialInputHeight = messageInput.scrollHeight;
const coachState = loadCoachState();

function loadCoachState() {
  const defaultState = {
    habitName: "",
    streak: 0,
    lastCheckinDate: null,
  };

  try {
    const rawState = localStorage.getItem(COACH_STORAGE_KEY);
    if (!rawState) return defaultState;
    const parsedState = JSON.parse(rawState);
    return {
      habitName: typeof parsedState.habitName === "string" ? parsedState.habitName : "",
      streak: Number.isFinite(parsedState.streak) ? Math.max(0, Math.floor(parsedState.streak)) : 0,
      lastCheckinDate: typeof parsedState.lastCheckinDate === "string" ? parsedState.lastCheckinDate : null,
    };
  } catch (error) {
    console.error("Failed to load coach state", error);
    return defaultState;
  }
}

function saveCoachState() {
  localStorage.setItem(COACH_STORAGE_KEY, JSON.stringify(coachState));
}

const getTodayKey = () => new Date().toISOString().slice(0, 10);

const getYesterdayKey = () => {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return date.toISOString().slice(0, 10);
};

const formatCoachState = () => {
  const habitLabel = coachState.habitName || "your main habit";
  return `${habitLabel}, streak ${coachState.streak} day${coachState.streak === 1 ? "" : "s"}`;
};

const updateCoachStateFromMessage = (message) => {
  const text = (message || "").trim();
  if (!text) return;

  const lower = text.toLowerCase();
  let didChange = false;

  const habitMatch = text.match(/(?:habit|goal)\s*[:=-]\s*([a-zA-Z0-9 ]{2,40})/i);
  if (habitMatch) {
    coachState.habitName = habitMatch[1].trim();
    didChange = true;
  }

  const explicitStreakMatch = lower.match(/(?:streak\s*(?:is|=|:)?\s*(\d+)|(\d+)\s*day(?:s)?\s*streak)/);
  const explicitStreak = explicitStreakMatch ? Number(explicitStreakMatch[1] || explicitStreakMatch[2]) : null;
  if (Number.isFinite(explicitStreak)) {
    coachState.streak = Math.max(0, explicitStreak);
    didChange = true;
  }

  if (/(reset streak|start over|streak 0|zero streak)/.test(lower)) {
    coachState.streak = 0;
    coachState.lastCheckinDate = null;
    didChange = true;
  }

  if (/(done today|completed today|checked in today|i did it today|mark done|habit done)/.test(lower)) {
    const todayKey = getTodayKey();
    const yesterdayKey = getYesterdayKey();

    if (coachState.lastCheckinDate === todayKey) {
      // Already counted today; no streak update needed.
    } else if (coachState.lastCheckinDate === yesterdayKey) {
      coachState.streak += 1;
      coachState.lastCheckinDate = todayKey;
      didChange = true;
    } else {
      coachState.streak = 1;
      coachState.lastCheckinDate = todayKey;
      didChange = true;
    }
  }

  if (didChange) {
    saveCoachState();
  }
};

const buildContextualUserMessage = (message) => {
  const prefix = `Coach memory: ${formatCoachState()}.`;
  return `${prefix}\nUser message: ${message}`;
};

// Return habit-coach fallback guidance when API is unavailable.
const getFallbackResponse = (query, errorMessage = "") => {
  const text = (query || "").trim();
  const lower = text.toLowerCase();
  const streakContext = `Saved tracker: ${formatCoachState()}.`;

  if (!text) {
    return `Please type your question, and I will help you. ${streakContext}`;
  }

  if (/(^|\s)(hi|hello|hey|hii|namaste)(\s|$)/.test(lower)) {
    return `Hi! I am your AI Habit Coach. ${streakContext} Tell me your challenge from today.`;
  }

  if (/(thank you|thanks|thx)/.test(lower)) {
    return "Great work. Keep your streak alive today with one small action now.";
  }

  if (/(my streak|current streak|how many days|streak status)/.test(lower)) {
    return `${streakContext} If this is outdated, tell me: streak is X.`;
  }

  const streakMatch = lower.match(/(\d+)\s*(day|days|week|weeks|month|months)?\s*streak/);
  const streakCount = streakMatch ? Number(streakMatch[1]) : null;

  if (/(streak|track|tracker|consisten|discipline|habit)/.test(lower)) {
    if (streakCount && streakCount >= 7) {
      return `Strong progress with your ${streakCount}-day streak. Today\'s strict plan: 1) Do the habit for at least 10 minutes. 2) Log completion immediately. 3) Set tomorrow\'s reminder before sleeping.`;
    }
    if (streakCount && streakCount < 7) {
      return `Good start with your ${streakCount}-day streak. Protect it with a minimum version today: do 2 minutes now, then complete the full session later.`;
    }
    return `Habit coach mode active. ${streakContext} Send: Habit name, current streak, target days per week, and I will return a strict action plan.`;
  }

  if (/(missed|skip|skipped|broke|relapse|failed|reset)/.test(lower)) {
    return "Streak recovery protocol: 1) Do a 2-minute restart now. 2) Identify one trigger that caused the miss. 3) Add a prevention rule for tomorrow. Missing one day is a slip, missing two starts a new pattern.";
  }

  if (/(motivat|lazy|procrastinat|delay|later)/.test(lower)) {
    return "No motivation needed. Start a 5-minute timer and do the smallest possible version of the habit now. Action first, motivation later.";
  }

  if (/(plan|schedule|routine|morning|night|daily|week)/.test(lower)) {
    return "Strict daily template: Cue -> 10-minute habit block -> immediate log -> reward. Share your wake/sleep time and I can personalize this schedule.";
  }

  if (/(time|date|today)/.test(lower)) {
    return `Today is ${new Date().toLocaleString()}. Non-negotiable: complete one minimum habit action before the day ends and mark it done.`;
  }

  const apiHint = errorMessage ? " The AI service is temporarily unavailable." : "";
  return `I understood your habit query: \"${text}\".${apiHint} ${streakContext} Send your habit, current streak, and today\'s obstacle, and I will give a strict next action.`;
};

// Create message element with dynamic classes and return it
const createMessageElement = (content, ...classes) => {
  const div = document.createElement("div");
  div.classList.add("message", ...classes);
  div.innerHTML = content;
  return div;
};
// Generate bot response using API
const generateBotResponse = async (incomingMessageDiv) => {
  const messageElement = incomingMessageDiv.querySelector(".message-text");
  const contextualMessage = buildContextualUserMessage(userData.message);
  // Add user message to chat history
  chatHistory.push({
    role: "user",
    parts: [{ text: contextualMessage }, ...(userData.file.data ? [{ inline_data: userData.file }] : [])],
  });
  // API request options
  const requestOptions = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: chatHistory,
    }),
  };
  try {
    // Fetch bot response from API
    const response = await fetch(API_URL, requestOptions);
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error?.message || "Unable to fetch AI response.");
    // Extract and display bot's response text
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) throw new Error("AI response was empty.");
    const apiResponseText = rawText.replace(/\*\*(.*?)\*\*/g, "$1").trim();
    messageElement.innerText = apiResponseText;
    messageElement.style.color = "";
    // Add bot response to chat history
    chatHistory.push({
      role: "model",
      parts: [{ text: apiResponseText }],
    });
  } catch (error) {
    // Gracefully answer the user query even when API call fails.
    console.log(error);
    const fallbackText = getFallbackResponse(userData.message, error.message);
    messageElement.innerText = fallbackText;
    messageElement.style.color = "";
    chatHistory.push({
      role: "model",
      parts: [{ text: fallbackText }],
    });
  } finally {
    // Reset user's file data, removing thinking indicator and scroll chat to bottom
    userData.file = {
      data: null,
      mime_type: null,
    };
    incomingMessageDiv.classList.remove("thinking");
    chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });
  }
};
// Handle outgoing user messages
const handleOutgoingMessage = (e) => {
  e.preventDefault();
  userData.message = messageInput.value.trim();
  if (!userData.message) return;
  updateCoachStateFromMessage(userData.message);
  messageInput.value = "";
  messageInput.dispatchEvent(new Event("input"));
  fileUploadWrapper.classList.remove("file-uploaded");
  // Create and display user message
  const messageContent = `<div class="message-text"></div>
                          ${userData.file.data ? `<img src="data:${userData.file.mime_type};base64,${userData.file.data}" class="attachment" />` : ""}`;
  const outgoingMessageDiv = createMessageElement(messageContent, "user-message");
  outgoingMessageDiv.querySelector(".message-text").innerText = userData.message;
  chatBody.appendChild(outgoingMessageDiv);
  chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });
  // Simulate bot response with thinking indicator after a delay
  setTimeout(() => {
    const messageContent = `<svg class="bot-avatar" xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 1024 1024">
            <path
              d="M738.3 287.6H285.7c-59 0-106.8 47.8-106.8 106.8v303.1c0 59 47.8 106.8 106.8 106.8h81.5v111.1c0 .7.8 1.1 1.4.7l166.9-110.6 41.8-.8h117.4l43.6-.4c59 0 106.8-47.8 106.8-106.8V394.5c0-59-47.8-106.9-106.8-106.9zM351.7 448.2c0-29.5 23.9-53.5 53.5-53.5s53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5-53.5-23.9-53.5-53.5zm157.9 267.1c-67.8 0-123.8-47.5-132.3-109h264.6c-8.6 61.5-64.5 109-132.3 109zm110-213.7c-29.5 0-53.5-23.9-53.5-53.5s23.9-53.5 53.5-53.5 53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5zM867.2 644.5V453.1h26.5c19.4 0 35.1 15.7 35.1 35.1v121.1c0 19.4-15.7 35.1-35.1 35.1h-26.5zM95.2 609.4V488.2c0-19.4 15.7-35.1 35.1-35.1h26.5v191.3h-26.5c-19.4 0-35.1-15.7-35.1-35.1zM561.5 149.6c0 23.4-15.6 43.3-36.9 49.7v44.9h-30v-44.9c-21.4-6.5-36.9-26.3-36.9-49.7 0-28.6 23.3-51.9 51.9-51.9s51.9 23.3 51.9 51.9z"/></svg>
          <div class="message-text">
            <div class="thinking-indicator">
              <div class="dot"></div>
              <div class="dot"></div>
              <div class="dot"></div>
            </div>
          </div>`;
    const incomingMessageDiv = createMessageElement(messageContent, "bot-message", "thinking");
    chatBody.appendChild(incomingMessageDiv);
    chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });
    generateBotResponse(incomingMessageDiv);
  }, 600);
};
// Adjust input field height dynamically
messageInput.addEventListener("input", () => {
  messageInput.style.height = `${initialInputHeight}px`;
  messageInput.style.height = `${messageInput.scrollHeight}px`;
  document.querySelector(".chat-form").style.borderRadius = messageInput.scrollHeight > initialInputHeight ? "15px" : "32px";
});
// Handle Enter key press for sending messages
messageInput.addEventListener("keydown", (e) => {
  const userMessage = e.target.value.trim();
  if (e.key === "Enter" && !e.shiftKey && userMessage && window.innerWidth > 768) {
    handleOutgoingMessage(e);
  }
});
// Handle file input change and preview the selected file
fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    fileInput.value = "";
    fileUploadWrapper.querySelector("img").src = e.target.result;
    fileUploadWrapper.classList.add("file-uploaded");
    const base64String = e.target.result.split(",")[1];
    // Store file data in userData
    userData.file = {
      data: base64String,
      mime_type: file.type,
    };
  };
  reader.readAsDataURL(file);
});
// Cancel file upload
fileCancelButton.addEventListener("click", () => {
  userData.file = {
    data: null,
    mime_type: null,
  };
  fileUploadWrapper.classList.remove("file-uploaded");
});
// Initialize emoji picker and handle emoji selection
const picker = new EmojiMart.Picker({
  theme: "light",
  skinTonePosition: "none",
  previewPosition: "none",
  onEmojiSelect: (emoji) => {
    const { selectionStart: start, selectionEnd: end } = messageInput;
    messageInput.setRangeText(emoji.native, start, end, "end");
    messageInput.focus();
  },
  onClickOutside: (e) => {
    if (e.target.id === "emoji-picker") {
      document.body.classList.toggle("show-emoji-picker");
    } else {
      document.body.classList.remove("show-emoji-picker");
    }
  },
});
document.querySelector(".chat-form").appendChild(picker);
sendMessage.addEventListener("click", (e) => handleOutgoingMessage(e));
document.querySelector("#file-upload").addEventListener("click", () => fileInput.click());
closeChatbot.addEventListener("click", () => document.body.classList.remove("show-chatbot"));
chatbotToggler.addEventListener("click", () => document.body.classList.toggle("show-chatbot"));