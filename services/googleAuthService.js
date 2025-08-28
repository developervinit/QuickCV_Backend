// QuickCV_Backend/services/googleAuthService.js
const { google } = require('googleapis');
const User = require('../models/User');
const { generateTokens } = require('../utils/jwtUtils');

class GoogleAuthService {
  constructor() {
    this.oauth2Client = null;
  }

  initialize() {
    // Check if already initialized
    if (this.oauth2Client) return;

    // Debug logs
    console.log('Initializing Google OAuth...');
    console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? 'SET' : 'NOT SET');
    console.log('GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? 'SET' : 'NOT SET');
    console.log('GOOGLE_CALLBACK_URL:', process.env.GOOGLE_CALLBACK_URL);

    // Validate environment variables
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_CALLBACK_URL) {
      throw new Error('Google OAuth credentials are not properly configured in environment variables');
    }

    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_CALLBACK_URL
    );

    console.log('Google OAuth client initialized successfully');
  }

  generateAuthUrl() {
    try {
      this.initialize();
      return this.oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: [
          'https://www.googleapis.com/auth/userinfo.email',
          'https://www.googleapis.com/auth/userinfo.profile'
        ],
        prompt: 'consent'
      });
    } catch (error) {
      console.error('Error generating auth URL:', error);
      throw error;
    }
  }

  async getGoogleUser(code) {
    try {
      if (!code) {
        throw new Error('Authorization code is required');
      }

      this.initialize();
      const { tokens } = await this.oauth2Client.getToken(code);
      this.oauth2Client.setCredentials(tokens);

      const oauth2 = google.oauth2({
        auth: this.oauth2Client,
        version: 'v2'
      });

      const { data } = await oauth2.userinfo.get();
      return { ...data, refreshToken: tokens.refresh_token };
    } catch (error) {
      console.error('Google OAuth error:', error);
      throw new Error('Failed to fetch user from Google: ' + error.message);
    }
  }

  async findOrCreateUser(googleUser) {
    try {
      if (!googleUser || !googleUser.id) {
        throw new Error('Invalid Google user data');
      }

      let user = await User.findOne({ googleId: googleUser.id });

      if (!user) {
        user = new User({
          googleId: googleUser.id,
          email: googleUser.email,
          name: googleUser.name,
          profilePicture: googleUser.picture,
          refreshToken: googleUser.refreshToken
        });
        await user.save();
        console.log('New user created:', user._id);
      } else {
        // Update existing user info
        user.name = googleUser.name;
        user.profilePicture = googleUser.picture;
        user.refreshToken = googleUser.refreshToken;
        await user.save();
        console.log('Existing user updated:', user._id);
      }

      const { accessToken, refreshToken } = generateTokens(user._id);
      return { user, accessToken, refreshToken };
    } catch (error) {
      console.error('User creation/update error:', error);
      throw new Error('Failed to create or update user: ' + error.message);
    }
  }
}

// Export a factory function instead of a singleton instance
module.exports = () => {
  return new GoogleAuthService();
};