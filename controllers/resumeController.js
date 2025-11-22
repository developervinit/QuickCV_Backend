// QuickCV_Backend/controllers/resumeController.js
const Resume = require('../models/Resume');
const User = require('../models/User');
const aiService = require('../services/aiService');
const pdfService = require('../services/pdfService');
const fs = require('fs');
const path = require('path');

const getBaseUrl = (req) => {
  if (process.env.BACKEND_URL) {
    return process.env.BACKEND_URL.replace(/\/$/, '');
  }
  const protocol = req.protocol;
  const host = req.get('host');
  return `${protocol}://${host}`;
};

// Create a new resume
const createResume = async (req, res) => {
  try {
    const { aiSettings = {} } = req.body || {};
    const selectedProvider = aiSettings.provider || 'openai';
    const customPrompt = aiSettings.prompt || '';

    // Helper to remove _id and id from subdocuments (fixes UUID vs ObjectId cast error)
    const cleanIds = (items) => {
      if (!Array.isArray(items)) return [];
      return items.map(item => {
        const { _id, id, ...rest } = item;
        return rest;
      });
    };

    const resumeData = {
      ...req.body,
      workExperience: cleanIds(req.body.workExperience),
      education: cleanIds(req.body.education),
      certifications: cleanIds(req.body.certifications),
      projects: cleanIds(req.body.projects),
      languages: cleanIds(req.body.languages),
      user: req.user._id,
      aiSettings: {
        provider: selectedProvider,
        prompt: customPrompt
      },
      generationStatus: 'processing',
      lastGenerationProvider: selectedProvider,
      lastGenerationError: null
    };

    const resume = new Resume(resumeData);
    await resume.save();

    // Add resume to user's resume list
    await User.findByIdAndUpdate(req.user._id, {
      $push: { resumes: resume._id }
    });

    try {
      const aiResult = await aiService.generateResumeContent(
        resumeData,
        customPrompt,
        selectedProvider
      );

      const filename = `resume_${Date.now()}_${req.user._id}.pdf`;
      const pdfPath = await pdfService.generateResumePDF(aiResult.optimizedResume, filename);
      const baseUrl = getBaseUrl(req);
      const pdfUrl = `${baseUrl}${pdfPath}`;

      resume.aiGeneratedVersions.push({
        pdfUrl,
        prompt: customPrompt,
        provider: selectedProvider,
        suggestions: aiResult.suggestions
      });

      resume.latestPdfUrl = pdfUrl;
      resume.latestSuggestions = aiResult.suggestions;
      resume.generationStatus = 'completed';
      resume.lastGenerationProvider = selectedProvider;
      resume.lastGenerationError = null;
      await resume.save();

      res.status(201).json({
        message: 'Resume created and AI-optimized PDF generated successfully.',
        resume
      });
    } catch (generationError) {
      console.error('AI generation error:', generationError);
      resume.generationStatus = 'failed';
      resume.lastGenerationError = generationError.message;
      await resume.save();
      res.status(500).json({ message: 'Resume saved, but AI generation failed. Please try regenerating.', error: generationError.message });
    }
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
    // 1. Find the resume first to get the file path
    const resume = await Resume.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!resume) {
      return res.status(404).json({ message: 'Resume not found' });
    }

    // 2. Delete the physical file if it exists
    if (resume.latestPdfUrl) {
      try {
        // Extract filename from URL (e.g., http://localhost:5000/uploads/resume_123.pdf -> resume_123.pdf)
        const filename = resume.latestPdfUrl.split('/').pop();
        const filePath = path.join(__dirname, '../uploads', filename);

        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`Deleted file: ${filePath}`);
        }
      } catch (fileErr) {
        console.error('Error deleting file:', fileErr);
        // Continue with DB deletion even if file deletion fails
      }
    }

    // 3. Delete from Database
    await Resume.findByIdAndDelete(resume._id);

    // Remove resume from user's resume list
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { resumes: req.params.id }
    });

    res.json({ message: 'Resume and associated file deleted successfully' });
  } catch (error) {
    console.error('Delete resume error:', error);
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