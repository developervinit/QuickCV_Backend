// QuickCV_Backend/controllers/resumeController.js
const Resume = require('../models/Resume');
const User = require('../models/User');

// Create a new resume
const createResume = async (req, res) => {
  try {
    const resumeData = {
      ...req.body,
      user: req.user._id
    };

    const resume = new Resume(resumeData);
    await resume.save();

    // Add resume to user's resume list
    await User.findByIdAndUpdate(req.user._id, {
      $push: { resumes: resume._id }
    });

    res.status(201).json(resume);
  } catch (error) {
    console.error('Create resume error:', error);
    res.status(500).json({ message: 'Failed to create resume' });
  }
};

// Get all resumes for a user
const getUserResumes = async (req, res) => {
  try {
    const resumes = await Resume.find({ user: req.user._id })
      .sort({ createdAt: -1 });
    res.json(resumes);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch resumes' });
  }
};

// Get a specific resume
const getResumeById = async (req, res) => {
  try {
    const resume = await Resume.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!resume) {
      return res.status(404).json({ message: 'Resume not found' });
    }

    res.json(resume);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch resume' });
  }
};

// Update a resume
const updateResume = async (req, res) => {
  try {
    const resume = await Resume.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!resume) {
      return res.status(404).json({ message: 'Resume not found' });
    }

    res.json(resume);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update resume' });
  }
};

// Delete a resume
const deleteResume = async (req, res) => {
  try {
    const resume = await Resume.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id
    });

    if (!resume) {
      return res.status(404).json({ message: 'Resume not found' });
    }

    // Remove resume from user's resume list
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { resumes: req.params.id }
    });

    res.json({ message: 'Resume deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete resume' });
  }
};

module.exports = {
  createResume,
  getUserResumes,
  getResumeById,
  updateResume,
  deleteResume
};