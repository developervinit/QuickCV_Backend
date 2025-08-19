// QuickCV_Backend/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const { 
  signup,
  login,
  googleAuth,
  googleAuthCallback,
  getCurrentUser,
  logout,
  refreshToken
} = require('../controllers/authController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Email/Password routes
router.post('/signup', signup);
router.post('/login', login);

// Google OAuth routes
router.get('/google', googleAuth);
router.get('/google/callback', googleAuthCallback);

// Token refresh
router.post('/refresh', refreshToken);

// Protected routes
router.get('/user', authenticateToken, getCurrentUser);
router.post('/logout', authenticateToken, logout);

module.exports = router;