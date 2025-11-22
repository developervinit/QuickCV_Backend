// QuickCV_Backend/services/pdfService.js
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class PDFService {
  async generateResumePDF(resumeData, filename) {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument();
      const filePath = path.join(__dirname, '../uploads', filename);
      
      // Ensure uploads directory exists
      const uploadsDir = path.join(__dirname, '../uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);
      
      // Add content to PDF
      doc.fontSize(20).text('Resume', { align: 'center' });
      doc.moveDown();
      
      // Personal Info
      if (resumeData.personalInfo) {
        doc.fontSize(16).text('Personal Information', { underline: true });
        doc.fontSize(12).text(`Name: ${resumeData.personalInfo.fullName || ''}`);
        doc.text(`Email: ${resumeData.personalInfo.email || ''}`);
        doc.text(`Phone: ${resumeData.personalInfo.phone || ''}`);
        if (resumeData.personalInfo.city) {
          doc.text(`Location: ${resumeData.personalInfo.city}`);
        }
        if (resumeData.personalInfo.summary) {
          doc.moveDown(0.5);
          doc.fontSize(16).text('Professional Summary', { underline: true });
          doc.fontSize(12).text(resumeData.personalInfo.summary);
        }
        doc.moveDown();
      }

      // Summary fallback
      if (resumeData.summary) {
        doc.fontSize(16).text('Professional Summary', { underline: true });
        doc.fontSize(12).text(resumeData.summary);
        doc.moveDown();
      }

      // Work Experience
      if (resumeData.workExperience && resumeData.workExperience.length > 0) {
        doc.fontSize(16).text('Work Experience', { underline: true });
        resumeData.workExperience.forEach((exp) => {
          doc.fontSize(12).text(`${exp.jobTitle || ''} at ${exp.company || ''}`, { continued: false });
          doc.fontSize(10).text(`${exp.startDate || ''} - ${exp.endDate || (exp.currentlyWorking ? 'Present' : '')}`);
          if (exp.responsibilities) {
            doc.fontSize(11).text(exp.responsibilities);
          }
          const skillLineParts = [
            exp.coreRoleSkills?.length ? `Core Skills: ${exp.coreRoleSkills.join(', ')}` : null,
            exp.techStack?.length ? `Tech: ${exp.techStack.join(', ')}` : null,
            exp.tools?.length ? `Tools: ${exp.tools.join(', ')}` : null
          ].filter(Boolean);
          skillLineParts.forEach((line) => doc.fontSize(10).text(line));
          doc.moveDown();
        });
      }

      // Projects
      if (resumeData.projects && resumeData.projects.length > 0) {
        doc.fontSize(16).text('Projects', { underline: true });
        resumeData.projects.forEach((proj) => {
          doc.fontSize(12).text(proj.projectName || 'Untitled Project');
          if (proj.description) {
            doc.fontSize(11).text(proj.description);
          }
          if (proj.techStack) {
            doc.fontSize(10).text(`Tech Stack: ${Array.isArray(proj.techStack) ? proj.techStack.join(', ') : proj.techStack}`);
          }
          if (proj.githubLink || proj.projectLink) {
            doc.fontSize(10).text(`Links: ${[proj.githubLink, proj.projectLink].filter(Boolean).join(' | ')}`);
          }
          doc.moveDown();
        });
      }

      // Education
      if (resumeData.education && resumeData.education.length > 0) {
        doc.fontSize(16).text('Education', { underline: true });
        resumeData.education.forEach((edu) => {
          doc.fontSize(12).text(`${edu.degree || ''} in ${edu.specialization || ''}`);
          doc.fontSize(11).text(`${edu.university || ''}`);
          doc.fontSize(10).text(`${edu.startDate || ''} - ${edu.endDate || ''}`);
          if (edu.percentageCgpa) {
            doc.text(`Score: ${edu.percentageCgpa}`);
          }
          doc.moveDown();
        });
      }

      // Certifications
      if (resumeData.certifications && resumeData.certifications.length > 0) {
        doc.fontSize(16).text('Certifications', { underline: true });
        resumeData.certifications.forEach((cert) => {
          doc.fontSize(12).text(cert.title || '');
          doc.fontSize(11).text(cert.provider || '');
          doc.fontSize(10).text(`${cert.startDate || ''} - ${cert.endDate || ''}`);
          if (cert.description) {
            doc.text(cert.description);
          }
          doc.moveDown();
        });
      }

      // Languages
      if (resumeData.languages && resumeData.languages.length > 0) {
        doc.fontSize(16).text('Languages', { underline: true });
        resumeData.languages.forEach((lang) => {
          const name = lang.language || lang.languageName || '';
          const proficiency = lang.proficiency ? ` - ${lang.proficiency}` : '';
          doc.fontSize(12).text(`${name}${proficiency}`);
        });
        doc.moveDown();
      }
      
      doc.end();
      
      stream.on('finish', () => {
        resolve(`/uploads/${filename}`);
      });
      
      stream.on('error', (err) => {
        reject(err);
      });
    });
  }
}

module.exports = new PDFService();