import PDFDocument from 'pdfkit';
import { ScanResultData } from './scanner';

export async function generateComplianceReport(scanData: ScanResultData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      // Title
      doc.fontSize(24).fillColor('#1a365d').text('Data Privacy & Security Threat Assessment', { align: 'center' });
      doc.moveDown(0.5);
      
      // Target
      doc.fontSize(12).fillColor('#4a5568').text(`Target Website: ${scanData.url}`, { align: 'center' });
      doc.text(`Scan Date: ${new Date(scanData.timestamp).toLocaleString()}`, { align: 'center' });
      doc.moveDown(2);

      // Grade & Score
      doc.fontSize(20).fillColor('#2d3748').text(`Security Grade: ${scanData.grade}`, { underline: true });
      doc.fontSize(14).fillColor('#4a5568').text(`Overall Compliance Score: ${scanData.score}%`);
      doc.moveDown(1.5);

      // GPC
      doc.fontSize(16).fillColor('#2d3748').text('Global Privacy Control (GPC) Compliance');
      doc.fontSize(12).fillColor(scanData.gpc.supported ? '#38a169' : '#e53e3e')
         .text(`Status: ${scanData.gpc.supported ? 'Supported' : 'Not Supported'}`);
      doc.fillColor('#4a5568').text(scanData.gpc.details);
      if (!scanData.gpc.supported) {
        doc.fillColor('#e53e3e').text('WARNING: Ignoring GPC requests violates CCPA, CPRA, and multiple state laws (TX, NJ, CT, etc). Fines scale per violation.');
      }
      doc.moveDown(1.5);

      // Pre-consent Trackers
      doc.fontSize(16).fillColor('#2d3748').text('Pre-Consent Tracker Audit (GDPR/ePrivacy Risk)');
      doc.fontSize(12).fillColor(scanData.trackers.found === 0 ? '#38a169' : '#dd6b20')
         .text(`Trackers Found Before Consent: ${scanData.trackers.found}`);
      
      if (scanData.trackers.found > 0) {
        doc.fillColor('#e53e3e').text('WARNING: Loading marketing/analytics scripts before explicit user consent is a direct violation of GDPR Article 7 and risks regulatory fines up to 4% of global revenue.');
        doc.moveDown(0.5);
        scanData.trackers.list.forEach(t => {
          doc.fillColor('#4a5568').text(`- ${t.name} (${t.type})`);
        });
      }
      doc.moveDown(1.5);

      // Security Headers
      doc.fontSize(16).fillColor('#2d3748').text('Critical Security Headers');
      scanData.headers.forEach(h => {
        doc.fontSize(12)
           .fillColor(h.present ? '#38a169' : '#e53e3e')
           .text(`${h.name}: ${h.present ? 'Present' : 'Missing'}`);
      });
      doc.moveDown(1.5);

      // Conclusion
      doc.fontSize(14).fillColor('#1a365d').text('Recommended Actions', { underline: true });
      doc.fontSize(12).fillColor('#4a5568').text('1. Implement a GPC-compliant consent management platform immediately.');
      doc.text('2. Block all marketing and analytics scripts (Meta, Google, LinkedIn) until active consent is recorded.');
      doc.text('3. Configure missing security headers to prevent XSS and Clickjacking attacks.');
      
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
