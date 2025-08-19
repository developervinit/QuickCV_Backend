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
        doc.fontSize(16).text('Personal Information');
        doc.fontSize(12).text(`Name: ${resumeData.personalInfo.fullName}`);
        doc.text(`Email: ${resumeData.personalInfo.email}`);
        doc.text(`Phone: ${resumeData.personalInfo.phone}`);
        doc.moveDown();
      }
      
      // Work Experience
      if (resumeData.workExperience && resumeData.workExperience.length > 0) {
        doc.fontSize(16).text('Work Experience');
        resumeData.workExperience.forEach((exp, index) => {
          doc.fontSize(12).text(`${exp.jobTitle} at ${exp.company}`);
          doc.fontSize(10).text(`${exp.startDate} - ${exp.endDate || 'Present'}`);
          doc.text(exp.responsibilities);
          doc.moveDown();
        });
      }
      
      // Education
      if (resumeData.education && resumeData.education.length > 0) {
        doc.fontSize(16).text('Education');
        resumeData.education.forEach((edu, index) => {
          doc.fontSize(12).text(`${edu.degree} in ${edu.specialization}`);
          doc.fontSize(10).text(`${edu.university}`);
          doc.text(`${edu.startDate} - ${edu.endDate}`);
          doc.text(`CGPA: ${edu.percentageCgpa}`);
          doc.moveDown();
        });
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