// QuickCV_Backend/services/aiService.js
const { OpenAI } = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');

class AIService {
  constructor() {
    this.openAIKey = process.env.OPENAI_API_KEY;
    this.openAIModel = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    this.geminiKey = process.env.GEMINI_API_KEY;
    this.geminiModel = process.env.GEMINI_MODEL || 'gemini-2.0-flash-lite';

    this.openAIClient = this.openAIKey ? new OpenAI({ apiKey: this.openAIKey }) : null;
    this.geminiClient = this.geminiKey ? new GoogleGenerativeAI(this.geminiKey) : null;

    console.log('AI Service Initialized');
    console.log('OpenAI Key loaded:', this.geminiModel);
  }

  async generateResumeContent(resumeData, prompt = '', provider = 'openai') {
    const selectedProvider = provider === 'gemini' ? 'gemini' : 'openai';
    const basePrompt = this.buildPrompt(resumeData, prompt);

    try {
      const rawOutput = selectedProvider === 'gemini'
        ? await this.generateWithGemini(basePrompt)
        : await this.generateWithOpenAI(basePrompt);

      const optimizedPayload = this.safeParseResume(rawOutput, resumeData);
      const suggestions = optimizedPayload.suggestions || this.buildFallbackSuggestions(resumeData);
      delete optimizedPayload.suggestions;

      return {
        optimizedResume: optimizedPayload,
        suggestions,
        provider: selectedProvider
      };
    } catch (error) {
      console.error(`AI generation failed (${selectedProvider}):`, error.message);
      return {
        optimizedResume: this.simpleOptimize(resumeData),
        suggestions: this.buildFallbackSuggestions(resumeData),
        provider: selectedProvider
      };
    }
  }

  buildPrompt(resumeData, customPrompt = '') {
    const instructions = `
You are an expert resume writer who creates ATS-friendly resumes with impeccable segmentation.
Return ONLY valid JSON (no markdown) with the following shape:
{
  "personalInfo": {},
  "summary": "string",
  "workExperience": [{ "jobTitle": "", "company": "", "startDate": "", "endDate": "", "currentlyWorking": false, "responsibilities": "", "coreRoleSkills": [], "softSkills": [], "techStack": [], "tools": [], "projectStory": "" }],
  "education": [],
  "certifications": [],
  "projects": [],
  "languages": [],
  "suggestions": ["Keep this as short bullet list for the user"]
}

Guidelines:
- Strengthen impact with quantifiable achievements.
- Enforce consistent tense/voice and ATS keywords for target roles.
- Keep array fields populated even if you have to infer best-effort skills.
- Respect any user instructions appended at the end.
`;

    return `${instructions}

ResumeData:
${JSON.stringify(resumeData, null, 2)}

AdditionalInstructions:
${customPrompt || 'Focus on clarity, metrics, and ATS keyword density.'}`;
  }

  async generateWithOpenAI(prompt) {
    if (!this.openAIClient) {
      throw new Error('OpenAI client is not configured');
    }

    const response = await this.openAIClient.chat.completions.create({
      model: this.openAIModel,
      temperature: 0.2,
      messages: [
        { role: 'system', content: 'You are a senior technical resume writer.' },
        { role: 'user', content: prompt }
      ]
    });

    return response?.choices?.[0]?.message?.content;
  }

  async generateWithGemini(prompt) {
    if (!this.geminiClient) {
      throw new Error('Gemini client is not configured');
    }

    const model = this.geminiClient.getGenerativeModel({
      model: this.geminiModel,
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json'
      }
    });

    const result = await model.generateContent(prompt);
    return result?.response?.text();
  }

  safeParseResume(payload, fallback) {
    if (!payload) {
      return this.simpleOptimize(fallback);
    }

    try {
      const parsed = JSON.parse(payload);
      return {
        personalInfo: parsed.personalInfo || fallback.personalInfo,
        summary: parsed.summary || fallback.personalInfo?.summary || '',
        workExperience: parsed.workExperience || fallback.workExperience || [],
        education: parsed.education || fallback.education || [],
        certifications: parsed.certifications || fallback.certifications || [],
        projects: parsed.projects || fallback.projects || [],
        languages: parsed.languages || fallback.languages || [],
        suggestions: parsed.suggestions || this.buildFallbackSuggestions(fallback)
      };
    } catch (error) {
      console.warn('Failed to parse AI payload, falling back to default structure.');
      return this.simpleOptimize(fallback);
    }
  }

  simpleOptimize(resumeData) {
    return {
      personalInfo: resumeData.personalInfo,
      summary: resumeData.personalInfo?.summary || '',
      workExperience: resumeData.workExperience || [],
      education: resumeData.education || [],
      certifications: resumeData.certifications || [],
      projects: resumeData.projects || [],
      languages: resumeData.languages || []
    };
  }

  buildFallbackSuggestions(resumeData) {
    const suggestions = [
      'Highlight measurable achievements (percentages, revenue, users).',
      'Align responsibilities with target job descriptions for better ATS ranking.',
      'Prioritize action verbs and consistent tense across bullet points.'
    ];

    if (!resumeData.projects?.length) {
      suggestions.push('Add at least one project to showcase practical impact.');
    }

    return suggestions;
  }
}

module.exports = new AIService();