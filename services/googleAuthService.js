// QuickCV_Backend/services/googleAuthService.js
const { google } = require('googleapis');
const User = require('../models/User');
const { generateTokens } = require('../utils/jwtUtils');

class GoogleAuthService {
  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_CALLBACK_URL
    );
  }

  generateAuthUrl() {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile'
      ],
      prompt: 'consent'
    });
  }

  async getGoogleUser(code) {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      this.oauth2Client.setCredentials(tokens);

      const oauth2 = google.oauth2({
        auth: this.oauth2Client,
        version: 'v2'
      });

      const { data } = await oauth2.userinfo.get();
      return { ...data, refreshToken: tokens.refresh_token };
    } catch (error) {
      throw new Error('Failed to fetch user from Google');
    }
  }

  async findOrCreateUser(googleUser) {
    try {
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
      } else {
        // Update existing user info
        user.name = googleUser.name;
        user.profilePicture = googleUser.picture;
        user.refreshToken = googleUser.refreshToken;
        await user.save();
      }

      const { accessToken, refreshToken } = generateTokens(user._id);
      return { user, accessToken, refreshToken };
    } catch (error) {
      throw new Error('Failed to create or update user');
    }
  }
}

module.exports = new GoogleAuthService();