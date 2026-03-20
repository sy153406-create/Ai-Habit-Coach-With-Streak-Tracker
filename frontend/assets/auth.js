// ========================================
// AI Habit Coach - Authentication JS
// ========================================

const API_BASE = 'http://localhost:5000/api';

// DOM Elements
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const toggleLink = document.getElementById('toggleLink');
const toggleText = document.getElementById('toggleText');
const errorMessage = document.getElementById('errorMessage');
const successMessage = document.getElementById('successMessage');

let isLoginMode = true;

// Toggle between login and signup
toggleLink.addEventListener('click', (e) => {
  e.preventDefault();
  isLoginMode = !isLoginMode;

  if (isLoginMode) {
    loginForm.classList.remove('hidden');
    signupForm.classList.add('hidden');
    toggleText.innerHTML = "Don't have an account? <a href='#' id='toggleLink'>Sign Up</a>";
    document.getElementById('toggleLink').addEventListener('click', toggleLink.onclick);
  } else {
    loginForm.classList.add('hidden');
    signupForm.classList.remove('hidden');
    toggleText.innerHTML = 'Already have an account? <a href="#" id="toggleLink">Login</a>';
    document.getElementById('toggleLink').addEventListener('click', toggleLink.onclick);
  }

  clearMessages();
});

// Show error message
function showError(message) {
  errorMessage.textContent = message;
  errorMessage.classList.add('show');
  successMessage.classList.remove('show');
  setTimeout(() => errorMessage.classList.remove('show'), 5000);
}

// Show success message
function showSuccess(message) {
  successMessage.textContent = message;
  successMessage.classList.add('show');
  errorMessage.classList.remove('show');
  setTimeout(() => successMessage.classList.remove('show'), 5000);
}

// Clear messages
function clearMessages() {
  errorMessage.classList.remove('show');
  successMessage.classList.remove('show');
}

// Login Handler
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;

  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      showError(data.message || 'Login failed');
      return;
    }

    // Store token and user data
    localStorage.setItem('token', data.token);
    localStorage.setItem('userId', data.user.id);
    localStorage.setItem('userName', data.user.name);
    localStorage.setItem('userEmail', data.user.email);

    showSuccess('Login successful! Redirecting...');
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 1000);
  } catch (error) {
    console.error('Login error:', error);
    showError('Connection error. Please try again.');
  }
});

// Sign Up Handler
signupForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const name = document.getElementById('signupName').value;
  const email = document.getElementById('signupEmail').value;
  const password = document.getElementById('signupPassword').value;
  const confirmPassword = document.getElementById('signupConfirmPassword').value;

  if (password !== confirmPassword) {
    showError('Passwords do not match');
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, email, password, confirmPassword }),
    });

    const data = await response.json();

    if (!response.ok) {
      showError(data.message || 'Sign up failed');
      return;
    }

    // Store token and user data
    localStorage.setItem('token', data.token);
    localStorage.setItem('userId', data.user.id);
    localStorage.setItem('userName', data.user.name);
    localStorage.setItem('userEmail', data.user.email);

    showSuccess('Account created successfully! Redirecting...');
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 1000);
  } catch (error) {
    console.error('Sign up error:', error);
    showError('Connection error. Please try again.');
  }
});

