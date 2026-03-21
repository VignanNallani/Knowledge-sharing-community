import { useState } from 'react'

export default function EventsPage() {
  const [activeFilter, setActiveFilter] = useState('All')

  const events = [
    {
      id: 1,
      title: 'React Advanced Conference 2026',
      date: new Date('2026-04-15'),
      type: 'Online',
      price: 'Free',
      description: 'Join industry experts for deep dives into React 18, concurrent features, and advanced patterns.',
      status: 'upcoming'
    },
    {
      id: 2,
      title: 'Node.js Workshop: Building REST APIs',
      date: new Date('2026-03-20'),
      type: 'Online',
      price: 'Free',
      description: 'Hands-on workshop building production-ready REST APIs with Node.js, Express, and best practices.',
      status: 'upcoming'
    },
    {
      id: 3,
      title: 'System Design Interview Prep',
      date: new Date('2026-03-25'),
      type: 'Online',
      price: '$49',
      description: 'Master system design concepts and ace your technical interviews with real-world case studies.',
      status: 'upcoming'
    },
    {
      id: 4,
      title: 'DevMentor Community Meetup',
      date: new Date('2026-04-05'),
      type: 'In-Person',
      price: 'Free',
      description: 'Network with fellow developers in Hyderabad. Share experiences and learn from industry mentors.',
      status: 'upcoming'
    },
    {
      id: 5,
      title: 'TypeScript Deep Dive',
      date: new Date('2026-04-10'),
      type: 'Online',
      price: 'Free',
      description: 'Advanced TypeScript patterns, generics, and type-safe development practices.',
      status: 'upcoming'
    },
    {
      id: 6,
      title: 'PostgreSQL Performance Workshop',
      date: new Date('2026-04-20'),
      type: 'Online',
      price: '$29',
      description: 'Learn database optimization, indexing strategies, and query performance tuning.',
      status: 'upcoming'
    },
    {
      id: 7,
      title: 'Open Source Contribution Day',
      date: new Date('2026-05-01'),
      type: 'Online',
      price: 'Free',
      description: 'Learn how to contribute to open source projects and make your first PR.',
      status: 'upcoming'
    },
    {
      id: 8,
      title: 'CSS & Design Systems',
      date: new Date('2026-05-10'),
      type: 'Online',
      price: 'Free',
      description: 'Master modern CSS techniques and build scalable design systems.',
      status: 'upcoming'
    }
  ]

  const filteredEvents = events.filter(event => {
    if (activeFilter === 'All') return true
    if (activeFilter === 'Upcoming') return event.status === 'upcoming'
    if (activeFilter === 'Free') return event.price === 'Free'
    if (activeFilter === 'Paid') return event.price !== 'Free'
    return true
  })

  const formatDate = (date) => {
    const options = { month: 'short', day: 'numeric' }
    return date.toLocaleDateString('en-US', options)
  }

  const getDayNumber = (date) => {
    return date.getDate()
  }

  const getMonth = (date) => {
    return date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()
  }

  const isPastEvent = (date) => {
    return date < new Date()
  }

  const handleRegister = (eventTitle) => {
    alert(`Registration for "${eventTitle}" coming soon!`)
  }

  const handleWatchRecording = (eventTitle) => {
    alert(`Recording for "${eventTitle}" will be available soon!`)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0A0F1E', color: '#F9FAFB', fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '80px 24px 40px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h1 style={{ fontSize: '36px', fontWeight: '800', fontFamily: 'Plus Jakarta Sans, sans-serif', margin: '0 0 12px 0', background: 'linear-gradient(135deg,#3B82F6,#8B5CF6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Tech Events
          </h1>
          <p style={{ fontSize: '18px', color: '#9CA3AF', margin: 0, maxWidth: '600px', marginLeft: 'auto', marginRight: 'auto' }}>
            Join workshops, conferences, and meetups to level up your skills and connect with the community
          </p>
        </div>

        {/* Filter Tabs */}
        <div style={{ display: 'flex', gap: '4px', background: '#1A2235', border: '1px solid #1F2A40', borderRadius: '10px', padding: '4px', marginBottom: '40px', width: 'fit-content', margin: '0 auto 40px' }}>
          {['All', 'Upcoming', 'Free', 'Paid'].map(filter => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              style={{
                padding: '8px 16px',
                borderRadius: '7px',
                border: 'none',
                background: activeFilter === filter ? '#3B82F6' : 'transparent',
                color: activeFilter === filter ? 'white' : '#9CA3AF',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                transition: 'all 0.2s'
              }}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* Events Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '24px' }}>
          {filteredEvents.map(event => (
            <div key={event.id} style={{ background: '#1A2235', border: '1px solid #1F2A40', borderRadius: '16px', padding: '24px', transition: 'transform 0.2s, box-shadow 0.2s' }}>
              {/* Date Badge */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '16px' }}>
                <div style={{ 
                  background: 'linear-gradient(135deg,#3B82F6,#8B5CF6)', 
                  borderRadius: '12px', 
                  padding: '12px', 
                  textAlign: 'center', 
                  minWidth: '60px',
                  boxShadow: '0 4px 12px rgba(59,130,246,0.3)'
                }}>
                  <div style={{ fontSize: '20px', fontWeight: '800', color: 'white', lineHeight: '1' }}>
                    {getDayNumber(event.date)}
                  </div>
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.8)', fontWeight: '600', marginTop: '2px' }}>
                    {getMonth(event.date)}
                  </div>
                </div>
                
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '18px', fontWeight: '700', fontFamily: 'Plus Jakarta Sans, sans-serif', margin: '0 0 8px 0', lineHeight: '1.3' }}>
                    {event.title}
                  </h3>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <span style={{ 
                      padding: '3px 10px', 
                      background: event.type === 'Online' ? 'rgba(16,185,129,0.15)' : 'rgba(59,130,246,0.15)', 
                      color: event.type === 'Online' ? '#10B981' : '#3B82F6', 
                      border: event.type === 'Online' ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(59,130,246,0.3)', 
                      borderRadius: '12px', 
                      fontSize: '11px', 
                      fontWeight: '600' 
                    }}>
                      {event.type}
                    </span>
                    <span style={{ 
                      padding: '3px 10px', 
                      background: event.price === 'Free' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)', 
                      color: event.price === 'Free' ? '#10B981' : '#F59E0B', 
                      border: event.price === 'Free' ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(245,158,11,0.3)', 
                      borderRadius: '12px', 
                      fontSize: '11px', 
                      fontWeight: '600' 
                    }}>
                      {event.price}
                    </span>
                  </div>
                </div>
              </div>

              {/* Description */}
              <p style={{ fontSize: '14px', color: '#D1D5DB', lineHeight: '1.5', margin: '0 0 20px 0' }}>
                {event.description}
              </p>

              {/* Action Button */}
              {isPastEvent(event.date) ? (
                <button 
                  onClick={() => handleWatchRecording(event.title)}
                  style={{ 
                    width: '100%', 
                    padding: '12px', 
                    background: '#374151', 
                    border: '1px solid #4B5563', 
                    borderRadius: '10px', 
                    color: '#9CA3AF', 
                    cursor: 'pointer', 
                    fontSize: '14px', 
                    fontWeight: '600',
                    transition: 'all 0.2s'
                  }}
                >
                  Watch Recording →
                </button>
              ) : (
                <button 
                  onClick={() => handleRegister(event.title)}
                  style={{ 
                    width: '100%', 
                    padding: '12px', 
                    background: 'linear-gradient(135deg,#3B82F6,#8B5CF6)', 
                    border: 'none', 
                    borderRadius: '10px', 
                    color: 'white', 
                    cursor: 'pointer', 
                    fontSize: '14px', 
                    fontWeight: '600',
                    transition: 'transform 0.2s, box-shadow 0.2s'
                  }}
                >
                  Register Now →
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredEvents.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 20px', color: '#6B7280' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📅</div>
            <h3 style={{ fontSize: '20px', fontWeight: '600', margin: '0 0 8px 0' }}>No events found</h3>
            <p style={{ margin: 0 }}>Try adjusting your filters or check back later for new events.</p>
          </div>
        )}
      </div>
    </div>
  )
}
