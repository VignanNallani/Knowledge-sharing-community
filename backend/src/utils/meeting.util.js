const crypto = require('crypto');

class MeetingUtil {
  static generateMeetUrl() {
    // Generate a unique meeting ID
    const meetingId = crypto.randomBytes(16).toString('hex');
    
    // In production, integrate with actual meeting service (Zoom, Google Meet, etc.)
    // For now, return a placeholder URL
    return `https://meet.jit.si/KnowledgeSharing-${meetingId}`;
  }

  static validateMeetUrl(url) {
    // Basic URL validation
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  static generateCalendarInvite(session) {
    const startTime = session.scheduledAt.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const endTime = new Date(session.scheduledAt.getTime() + session.duration * 60 * 1000)
      .toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

    return {
      title: `Mentorship Session: ${session.title}`,
      description: session.description || '',
      startTime,
      endTime,
      location: session.meetUrl,
      attendees: [
        session.mentor.email,
        session.mentee.email
      ]
    };
  }

  static createGoogleCalendarLink(session) {
    const invite = this.generateCalendarInvite(session);
    const baseUrl = 'https://calendar.google.com/calendar/render';
    
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: invite.title,
      details: invite.description,
      location: invite.location,
      dates: `${invite.startTime}/${invite.endTime}`,
      add: invite.attendees.join(',')
    });

    return `${baseUrl}?${params.toString()}`;
  }

  static createOutlookCalendarLink(session) {
    const invite = this.generateCalendarInvite(session);
    const baseUrl = 'https://outlook.live.com/calendar/0/deeplink/compose';
    
    const params = new URLSearchParams({
      subject: invite.title,
      body: invite.description,
      startdt: session.scheduledAt.toISOString(),
      enddt: new Date(session.scheduledAt.getTime() + session.duration * 60 * 1000).toISOString(),
      location: invite.location
    });

    return `${baseUrl}?${params.toString()}`;
  }
}

module.exports = MeetingUtil;
