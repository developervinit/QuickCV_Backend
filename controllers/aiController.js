// QuickCV_Backend/controllers/aiController.js
const aiService = require('../services/aiService');
const pdfService = require('../services/pdfService');
const Resume = require('../models/Resume');

const buildBaseUrl = (req) => {
  if (process.env.BACKEND_URL) {
    return process.env.BACKEND_URL.replace(/\/$/, '');
  }
  return `${req.protocol}://${req.get('host')}`;
};

// Generate AI-optimized resume
const generateAIResume = async (req, res) => {
  try {
    const { resumeId, prompt = '', provider = 'openai' } = req.body;
    
    // Get the resume data
    const resume = await Resume.findOne({
      _id: resumeId,
      user: req.user._id
    });

    if (!resume) {
      return res.status(404).json({ message: 'Resume not found' });
    }

    // Generate AI-optimized content
    const aiResult = await aiService.generateResumeContent(resume, prompt, provider);
    
    // Generate PDF
    const filename = `resume_${Date.now()}_${req.user._id}.pdf`;
    const pdfPath = await pdfService.generateResumePDF(aiResult.optimizedResume, filename);
    const pdfUrl = `${buildBaseUrl(req)}${pdfPath}`;
    
    // Save AI-generated version reference
    resume.aiGeneratedVersions.push({
      pdfUrl,
      prompt,
      provider,
      suggestions: aiResult.suggestions
    });
    resume.latestPdfUrl = pdfUrl;
    resume.latestSuggestions = aiResult.suggestions;
    resume.generationStatus = 'completed';
    resume.lastGenerationProvider = provider;
    resume.lastGenerationError = null;
    
    await resume.save();
    
    res.json({
      message: 'AI resume generated successfully',
      pdfUrl,
      suggestions: aiResult.suggestions,
      provider
    });
  } catch (error) {
    console.error('AI generation error:', error);
    res.status(500).json({ message: 'Failed to generate AI resume' });
  }
};

module.exports = {
  generateAIResume
};