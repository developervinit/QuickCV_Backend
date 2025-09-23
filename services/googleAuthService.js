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

    // Validate environment variables
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_CALLBACK_URL) {
      throw new Error('Google OAuth credentials are not properly configured in environment variables');
    }

    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_CALLBACK_URL
    );

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
      // FIX: Don't try to use Google's refresh token - we'll generate our own
      return { ...data }; // REMOVED refreshToken: tokens.refresh_token
    } catch (error) {
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
          profilePicture: googleUser.picture
          // FIX: Don't set refreshToken here - we'll generate it after
        });
        await user.save();
      } else {
        // Update existing user info
        user.name = googleUser.name;
        user.profilePicture = googleUser.picture;
        // FIX: Don't update refreshToken here
        await user.save();
      }

      // FIX: Generate tokens AFTER user is saved to database
      const { accessToken, refreshToken } = generateTokens(user._id);
      
      // FIX: Save the refresh token to the user in database
      user.refreshToken = refreshToken;
      await user.save();
      
      return { user, accessToken, refreshToken };
    } catch (error) {
      throw new Error('Failed to create or update user: ' + error.message);
    }
  }
}

// Export a factory function instead of a singleton instance
module.exports = () => {
  return new GoogleAuthService();
};