import React from 'react';

export default function Mentors() {
  const styles = {
    container: {
      padding: '24px',
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f8f9fa'
    },
    header: {
      fontSize: '32px',
      fontWeight: 'bold',
      marginBottom: '32px',
      color: '#333'
    },
    description: {
      fontSize: '16px',
      color: '#666',
      marginBottom: '32px',
      lineHeight: '1.5'
    },
    mentorGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      gap: '20px'
    },
    mentorCard: {
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '20px',
      border: '1px solid #e5e7eb',
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      transition: 'all 0.2s ease'
    },
    mentorHeader: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      marginBottom: '16px'
    },
    mentorAvatar: {
      width: '60px',
      height: '60px',
      borderRadius: '50%',
      backgroundColor: '#e5e7eb',
      marginBottom: '8px'
    },
    mentorInfo: {
      flex: 1
    },
    mentorName: {
      fontWeight: '600',
      fontSize: '16px',
      color: '#333',
      marginBottom: '4px'
    },
    mentorRole: {
      fontSize: '12px',
      color: '#666',
      backgroundColor: '#f3f4f6',
      padding: '2px 6px',
      borderRadius: '4px'
    },
    mentorBio: {
      fontSize: '14px',
      color: '#666',
      lineHeight: '1.4',
      marginBottom: '16px'
    },
    bookSessionButton: {
      backgroundColor: '#2563eb',
      color: 'white',
      padding: '8px 16px',
      borderRadius: '6px',
      border: 'none',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '500',
      transition: 'all 0.2s ease'
    },
    bookSessionButtonHover: {
      backgroundColor: '#1d4ed8',
      transform: 'translateY(-2px)'
    }
  };

  const mentors = [
    {
      id: 1,
      name: "Sarah Chen",
      role: "Senior React Developer",
      avatar: "https://ui-avatars.com/api/?name=Sarah+Chen&background=0D8ABC&color=fff",
      bio: "8+ years of React experience, specializing in performance optimization and component architecture. Passionate about teaching and mentoring junior developers.",
      expertise: ["React", "JavaScript", "TypeScript", "Performance", "Node.js"],
      rating: 4.9,
      sessions: 156
    },
    {
      id: 2,
      name: "Michael Rodriguez",
      role: "Full Stack Developer",
      avatar: "https://ui-avatars.com/api/?name=Michael+Rodriguez&background=2563eb&color=fff",
      bio: "Full-stack developer with expertise in React, Node.js, and cloud architecture. Love building scalable applications and mentoring developers.",
      expertise: ["React", "Node.js", "Python", "AWS", "Docker"],
      rating: 4.8,
      sessions: 142
    },
    {
      id: 3,
      name: "Emily Johnson",
      role: "UI/UX Designer",
      avatar: "https://ui-avatars.com/api/?name=Emily+Johnson&background=e91e63&color=fff",
      bio: "Creative designer focused on user experience and interface design. Expert in Figma, Adobe Creative Suite, and modern design systems.",
      expertise: ["UI/UX", "Figma", "Adobe XD", "CSS", "React"],
      rating: 4.7,
      sessions: 98
    },
    {
      id: 4,
      name: "David Kim",
      role: "DevOps Engineer",
      avatar: "https://ui-avatars.com/api/?name=David+Kim&background=16a34a&color=fff",
      bio: "DevOps specialist with 10+ years of experience in cloud infrastructure, CI/CD, and system reliability.",
      expertise: ["DevOps", "AWS", "Docker", "Kubernetes", "Linux"],
      rating: 4.6,
      sessions: 87
    }
  ];

  return (
    <div style={styles.container}>
      <h1 style={styles.header}>
        Find Your Perfect Mentor
      </h1>
      
      <p style={styles.description}>
        Connect with experienced mentors who can guide your learning journey and help you achieve your career goals.
      </p>

      <div style={styles.mentorGrid}>
        {mentors.map((mentor) => (
          <div key={mentor.id} style={styles.mentorCard}>
            <div style={styles.mentorHeader}>
              <img 
                src={mentor.avatar} 
                alt={mentor.name}
                style={styles.mentorAvatar}
              />
              <div style={styles.mentorInfo}>
                <div style={styles.mentorName}>{mentor.name}</div>
                <div style={styles.mentorRole}>{mentor.role}</div>
              </div>
            </div>
            
            <div style={styles.mentorBio}>{mentor.bio}</div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
              <div>
                <div style={{ fontSize: '14px', color: '#666' }}>
                  <strong>{mentor.sessions}</strong> sessions
                </div>
                <div style={{ fontSize: '12px', color: '#999' }}>
                  {mentor.rating} ⭐
                </div>
              </div>
              
              <button 
                style={styles.bookSessionButton}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = styles.bookSessionButtonHover.backgroundColor}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
              >
                Book Session
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
