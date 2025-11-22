// QuickCV_Backend/models/Resume.js
const mongoose = require('mongoose');

const VALID_AI_PROVIDERS = ['openai', 'gemini'];

const resumeSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  personalInfo: {
    fullName: String,
    email: String,
    phone: String,
    countryCode: String,
    stateCode: String,
    city: String,
    linkedin: String,
    website: String,
    summary: String,
    profileImageDataUrl: String
  },
  workExperience: [{
    jobTitle: String,
    coreRoleSkills: [String],
    softSkills: [String],
    company: String,
    startDate: Date,
    endDate: Date,
    currentlyWorking: Boolean,
    responsibilities: String,
    techStack: [String],
    tools: [String],
    projectStory: String
  }],
  education: [{
    degree: String,
    university: String,
    startDate: Date,
    endDate: Date,
    percentageCgpa: String,
    specialization: String
  }],
  certifications: [{
    title: String,
    provider: String,
    startDate: Date,
    endDate: Date,
    certificateUrl: String,
    description: String
  }],
  projects: [{
    projectName: String,
    description: String,
    techStack: String,
    tools: String,
    githubLink: String,
    projectLink: String,
    completionDate: Date,
    roles: [String]
  }],
  languages: [{
    language: String,
    proficiency: String
  }],
  aiGeneratedVersions: [{
    pdfUrl: String,
    prompt: String,
    provider: {
      type: String,
      enum: VALID_AI_PROVIDERS
    },
    suggestions: [String],
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  aiSettings: {
    provider: {
      type: String,
      enum: VALID_AI_PROVIDERS,
      default: 'openai'
    },
    prompt: {
      type: String,
      default: ''
    }
  },
  generationStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  latestPdfUrl: String,
  latestSuggestions: [String],
  lastGenerationProvider: {
    type: String,
    enum: VALID_AI_PROVIDERS
  },
  lastGenerationError: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update timestamp on update
resumeSchema.pre('findOneAndUpdate', function(next) {
  this.set({ updatedAt: new Date() });
  next();
});

module.exports = mongoose.model('Resume', resumeSchema);