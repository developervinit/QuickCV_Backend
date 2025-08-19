// QuickCV_Backend/routes/aiRoutes.js
const express = require('express');
const router = express.Router();
const { generateAIResume } = require('../controllers/aiController');
const { authenticateToken } = require('../middleware/authMiddleware');

// All routes are protected
router.use(authenticateToken);

// AI resume generation
router.post('/generate-resume', generateAIResume);

module.exports = router;