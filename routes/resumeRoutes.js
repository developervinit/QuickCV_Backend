// QuickCV_Backend/routes/resumeRoutes.js
const express = require('express');
const router = express.Router();
const { 
  createResume,
  getUserResumes,
  getResumeById,
  updateResume,
  deleteResume
} = require('../controllers/resumeController');
const { authenticateToken } = require('../middleware/authMiddleware');

// All routes are protected
router.use(authenticateToken);

// Resume CRUD operations
router.post('/', createResume);
router.get('/', getUserResumes);
router.get('/:id', getResumeById);
router.put('/:id', updateResume);
router.delete('/:id', deleteResume);

module.exports = router;