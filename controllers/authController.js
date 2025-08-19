// QuickCV_Backend/controllers/authController.js
const User = require('../models/User');
const { generateTokens, verifyToken } = require('../utils/jwtUtils');
const { validateEmail, validatePassword } = require('../utils/validationUtils');
const googleAuthService = require('../services/googleAuthService');

// Email/Password Signup
const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    
    if (!validateEmail(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }
    
    if (!validatePassword(password)) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }
    
    // Create new user
    const user = new User({ name, email, password });
    await user.save();
    
    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user._id);
    
    // Save refresh token to user
    user.refreshToken = refreshToken;
    await user.save();
    
    // Return user data without sensitive info
    const userResponse = {
      _id: user._id,
      name: user.name,
      email: user.email,
      profilePicture: user.profilePicture
    };
    
    res.status(201).json({
      user: userResponse,
      token: accessToken,
      refreshToken
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Email/Password Login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validation
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user._id);
    
    // Save refresh token to user
    user.refreshToken = refreshToken;
    await user.save();
    
    // Return user data without sensitive info
    const userResponse = {
      _id: user._id,
      name: user.name,
      email: user.email,
      profilePicture: user.profilePicture
    };
    
    res.json({
      user: userResponse,
      token: accessToken,
      refreshToken
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Google OAuth
const googleAuth = (req, res) => {
  try {
    const authUrl = googleAuthService.generateAuthUrl();
    res.redirect(authUrl);
  } catch (error) {
    res.status(500).json({ message: 'Authentication failed' });
  }
};

// Handle Google OAuth callback
const googleAuthCallback = async (req, res) => {
  try {
    const { code } = req.query;
    
    if (!code) {
      return res.status(400).json({ message: 'Authorization code required' });
    }

    // Get user info from Google
    const googleUser = await googleAuthService.getGoogleUser(code);
    
    // Find or create user in our database
    const { user, accessToken, refreshToken } = await googleAuthService.findOrCreateUser(googleUser);

    // Redirect to frontend with tokens
    const redirectUrl = `${process.env.FRONTEND_URL}/login?token=${accessToken}&refreshToken=${refreshToken}&userId=${user._id}`;
    res.redirect(redirectUrl);
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({ message: 'Authentication failed' });
  }
};

// Get current user info
const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password -refreshToken');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch user data' });
  }
};

// Logout user
const logout = async (req, res) => {
  try {
    // Remove refresh token from user
    await User.findByIdAndUpdate(req.user._id, { refreshToken: null });
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Logout failed' });
  }
};

// Refresh token
const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token required' });
    }
    
    // Verify refresh token
    const decoded = verifyToken(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    
    // Find user
    const user = await User.findById(decoded.userId);
    
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }
    
    // Generate new tokens
    const { accessToken: newAccessToken, refreshToken: newRefreshToken } = generateTokens(user._id);
    
    // Update refresh token in database
    user.refreshToken = newRefreshToken;
    await user.save();
    
    res.json({
      token: newAccessToken,
      refreshToken: newRefreshToken
    });
  } catch (error) {
    res.status(401).json({ message: 'Invalid refresh token' });
  }
};

module.exports = {
  signup,
  login,
  googleAuth,
  googleAuthCallback,
  getCurrentUser,
  logout,
  refreshToken
};