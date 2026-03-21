// Email utility - placeholder for SendGrid/Resend integration
// Will be fully implemented in Day 5

class EmailUtil {
  static async sendEmail({ to, subject, template, data }) {
    // Placeholder implementation
    // In Day 5, this will integrate with SendGrid or Resend
    
    console.log('Email would be sent:', {
      to,
      subject,
      template,
      data,
      timestamp: new Date().toISOString()
    });

    // Simulate email sending success
    return true;
  }

  static async sendBulkEmails(emails) {
    const results = [];
    
    for (const email of emails) {
      try {
        const sent = await this.sendEmail(email);
        results.push({ email: email.to, success: sent });
      } catch (error) {
        results.push({ email: email.to, success: false, error: error.message });
      }
    }

    return results;
  }

  static validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static getEmailTemplate(templateName, data) {
    const templates = {
      'session-reminder-mentor': {
        subject: `Session Reminder: ${data.sessionTitle}`,
        html: `
          <h2>Session Reminder</h2>
          <p>Hi ${data.mentorName},</p>
          <p>You have an upcoming mentorship session:</p>
          <ul>
            <li><strong>Session:</strong> ${data.sessionTitle}</li>
            <li><strong>With:</strong> ${data.menteeName}</li>
            <li><strong>Time:</strong> ${data.sessionTime}</li>
            <li><strong>Duration:</strong> ${data.duration} minutes</li>
            <li><strong>Meeting Link:</strong> <a href="${data.meetUrl}">Join Meeting</a></li>
          </ul>
          <p>Please ensure you're available at the scheduled time.</p>
        `
      },
      'session-reminder-mentee': {
        subject: `Session Reminder: ${data.sessionTitle}`,
        html: `
          <h2>Session Reminder</h2>
          <p>Hi ${data.menteeName},</p>
          <p>You have an upcoming mentorship session:</p>
          <ul>
            <li><strong>Session:</strong> ${data.sessionTitle}</li>
            <li><strong>With:</strong> ${data.mentorName}</li>
            <li><strong>Time:</strong> ${data.sessionTime}</li>
            <li><strong>Duration:</strong> ${data.duration} minutes</li>
            <li><strong>Meeting Link:</strong> <a href="${data.meetUrl}">Join Meeting</a></li>
          </ul>
          <p>Please ensure you're available at the scheduled time.</p>
        `
      },
      'feedback-request-mentee': {
        subject: `Please Rate Your Session: ${data.sessionTitle}`,
        html: `
          <h2>Feedback Request</h2>
          <p>Hi ${data.menteeName},</p>
          <p>Your mentorship session with ${data.mentorName} has completed. Please take a moment to provide feedback:</p>
          <ul>
            <li><strong>Session:</strong> ${data.sessionTitle}</li>
            <li><strong>Time:</strong> ${data.sessionTime}</li>
          </ul>
          <p>Your feedback helps mentors improve their services.</p>
          <a href="#" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Provide Feedback</a>
        `
      }
    };

    return templates[templateName] || { subject: 'Notification', html: `<p>${JSON.stringify(data)}</p>` };
  }
}

module.exports = EmailUtil;
