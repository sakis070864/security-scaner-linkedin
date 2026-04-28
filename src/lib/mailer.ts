import nodemailer from 'nodemailer';

// You will need to configure these environment variables in your deployment (.env file)
// SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM

export async function sendReportEmail(clientEmail: string, pdfBuffer: Buffer, targetUrl: string) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    console.warn('SMTP credentials not configured. Skipping email send.');
    return false;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_FROM || '"Security Audit Team" <noreply@yourdomain.com>',
    to: clientEmail,
    subject: `Your Privacy & Security Threat Assessment: ${targetUrl}`,
    html: `
      <h2>Your Security Audit is Complete</h2>
      <p>Hello,</p>
      <p>Thank you for requesting a compliance audit for <strong>${targetUrl}</strong>.</p>
      <p>We have completed the deep scan for Global Privacy Control (GPC) support, Pre-Consent Tracking Scripts (GDPR violations), and critical Security Headers.</p>
      <p>Please find your detailed PDF report attached.</p>
      <br>
      <p>Best regards,</p>
      <p>The Security Audit Team</p>
    `,
    attachments: [
      {
        filename: `Security_Audit_${targetUrl.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }
    ]
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Message sent: %s', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

export async function sendFailureEmail(clientEmail: string, targetUrl: string, errorMessage: string) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    console.warn('SMTP credentials not configured. Skipping failure email.');
    return false;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_FROM || '"Security Audit Team" <noreply@yourdomain.com>',
    to: clientEmail,
    subject: `Security Audit Update: ${targetUrl}`,
    html: `
      <h2>We Couldn't Complete Your Security Audit</h2>
      <p>Hello,</p>
      <p>Thank you for requesting a compliance audit for <strong>${targetUrl}</strong>.</p>
      <p>Unfortunately, our scanner was unable to reach or fully analyze this website. This can happen if:</p>
      <ul>
        <li>The URL was misspelled or doesn't exist</li>
        <li>The website blocks automated security scanners</li>
        <li>The server was temporarily down</li>
      </ul>
      <p>Please double-check the URL and try again, or reply to this email and we'll run a manual audit for you — free of charge.</p>
      <br>
      <p>Best regards,</p>
      <p>The Security Audit Team</p>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Failure notification sent: %s', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending failure email:', error);
    throw error;
  }
}
