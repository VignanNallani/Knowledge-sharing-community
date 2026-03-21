export default function RightPanel() {
  const styles = {
    container: {
      display: 'flex',
      flexDirection: 'column',
      gap: '24px'
    },
    section: {
      backgroundColor: 'white',
      border: '1px solid #e5e7eb',
      borderRadius: '12px',
      padding: '16px'
    },
    sectionTitle: {
      fontWeight: '600',
      marginBottom: '12px',
      fontSize: '16px'
    },
    topicList: {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    },
    topicItem: {
      fontSize: '14px',
      color: '#6b7280',
      cursor: 'pointer',
      padding: '4px 8px',
      borderRadius: '4px',
      transition: 'background-color 0.2s'
    },
    mentorItem: {
      fontSize: '14px',
      color: '#374151',
      padding: '8px 0',
      borderBottom: '1px solid #f3f4f6',
      cursor: 'pointer'
    },
    eventItem: {
      fontSize: '13px',
      padding: '8px 0',
      borderBottom: '1px solid #f3f4f6'
    },
    eventDate: {
      color: '#6b7280',
      fontSize: '12px'
    },
    eventTitle: {
      fontWeight: '500',
      marginTop: '2px'
    }
  }

  return (
    <div style={styles.container}>

      {/* Trending Topics */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>
          Trending Topics
        </h3>
        <div style={styles.topicList}>
          <div 
            style={styles.topicItem}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            # React
          </div>
          <div 
            style={styles.topicItem}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            # AI
          </div>
          <div 
            style={styles.topicItem}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            # Backend
          </div>
          <div 
            style={styles.topicItem}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            # DevOps
          </div>
        </div>
      </div>

      {/* Top Mentors */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>
          Top Mentors
        </h3>
        <div>
          <div style={styles.mentorItem}>
            Alex Johnson
          </div>
          <div style={styles.mentorItem}>
            Sarah Lee
          </div>
          <div style={styles.mentorItem}>
            David Chen
          </div>
        </div>
      </div>

      {/* Upcoming Events */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>
          Upcoming Events
        </h3>
        <div>
          <div style={styles.eventItem}>
            <div style={styles.eventDate}>Today, 3:00 PM</div>
            <div style={styles.eventTitle}>React Hooks Workshop</div>
          </div>
          <div style={styles.eventItem}>
            <div style={styles.eventDate}>Tomorrow, 2:00 PM</div>
            <div style={styles.eventTitle}>AI Career Panel</div>
          </div>
          <div style={styles.eventItem}>
            <div style={styles.eventDate}>Friday, 4:00 PM</div>
            <div style={styles.eventTitle}>System Design 101</div>
          </div>
        </div>
      </div>

    </div>
  )
}
